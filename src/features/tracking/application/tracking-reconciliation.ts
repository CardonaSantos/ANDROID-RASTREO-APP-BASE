import { getMyTrackingState } from "../api/tracking.api";

import { getTrackingDeviceStatus } from "./tracking-device.actions";

import {
  getTrackingProfile,
  startTrackingLocationService,
  stopTrackingLocationService,
} from "../background";

import {
  clearActiveTrackingRuntime,
  clearQueuedTrackingLocationsForSession,
  loadTrackingProfileId,
  readActiveTrackingSessionId,
  setActiveTrackingSession,
} from "../storage";

import { flushTrackingQueueForSession } from "./tracking-sync";
import { captureInitialTrackingLocation } from "./tracking-initial-location";

export interface TrackingReconciliationResult {
  active: boolean;

  sessionId: number | null;

  serviceStarted: boolean;

  serviceRunning: boolean;

  pending: number;
}

export async function reconcileTrackingRuntime(): Promise<TrackingReconciliationResult> {
  const serverState = await getMyTrackingState();

  const localSessionId = await readActiveTrackingSessionId();

  /*
   * =====================================================
   * EL SERVIDOR DICE QUE NO HAY JORNADA
   * =====================================================
   */

  if (!serverState.activo) {
    /*
     * Si localmente quedó un runtime anterior,
     * ya no tiene autoridad para continuar.
     */
    if (localSessionId) {
      try {
        await stopTrackingLocationService();
      } catch {
        // La limpieza local continúa.
      }

      try {
        await clearQueuedTrackingLocationsForSession(localSessionId);
      } catch {
        // No bloqueamos la reconciliación.
      }

      await clearActiveTrackingRuntime();
    }

    return {
      active: false,

      sessionId: null,

      serviceStarted: false,

      serviceRunning: false,

      pending: 0,
    };
  }

  /*
   * =====================================================
   * EL SERVIDOR DICE QUE EXISTE JORNADA ACTIVA
   * =====================================================
   */

  const sessionId = serverState.sesionTrackingId;

  /*
   * Si localmente quedó otra sesión,
   * esa sesión anterior ya no es la
   * jornada autoritativa actual.
   */
  if (localSessionId && localSessionId !== sessionId) {
    try {
      await clearQueuedTrackingLocationsForSession(localSessionId);
    } catch {
      // Continuamos con la sesión válida.
    }
  }

  await setActiveTrackingSession(sessionId);

  /*
   * Aprovechamos la reconciliación
   * para intentar entregar cualquier
   * ubicación pendiente.
   */
  const flush = await flushTrackingQueueForSession(sessionId);

  /*
   * =====================================================
   * COMPROBAR DISPOSITIVO
   * =====================================================
   */

  const device = await getTrackingDeviceStatus();

  if (!device.supported) {
    return {
      active: true,

      sessionId,

      serviceStarted: false,

      serviceRunning: false,

      pending: flush.remaining,
    };
  }

  /*
   * No intentamos arrancar el servicio
   * hasta que Android realmente esté listo.
   */
  const ready =
    device.locationServicesEnabled &&
    device.foregroundPermission === "granted" &&
    device.backgroundPermission === "granted";

  if (!ready) {
    return {
      active: true,

      sessionId,

      serviceStarted: false,

      serviceRunning: false,

      pending: flush.remaining,
    };
  }

  /*
   * Ya está ejecutándose.
   * No hacemos start otra vez.
   */
  if (device.serviceRunning) {
    return {
      active: true,

      sessionId,

      serviceStarted: false,

      serviceRunning: true,

      pending: flush.remaining,
    };
  }

  /*
   * =====================================================
   * RECUPERACIÓN AUTOMÁTICA
   * =====================================================
   */

  const profileId = await loadTrackingProfileId();

  const profile = getTrackingProfile(profileId);

  const startResult = await startTrackingLocationService(profile.id);
  if (startResult.started) {
    void captureInitialTrackingLocation();
  }

  return {
    active: true,

    sessionId,

    serviceStarted: startResult.started,

    serviceRunning: startResult.started,

    pending: flush.remaining,
  };
}
