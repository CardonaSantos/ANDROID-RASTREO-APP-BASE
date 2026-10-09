import { startTracking, type StartTrackingResponse } from "../api";

import { getTrackingDeviceStatus } from "./tracking-device.actions";

import { startTrackingLocationService } from "../background";
import { captureInitialTrackingLocation } from "./tracking-initial-location";

import { loadTrackingProfileId, setActiveTrackingSession } from "../storage";

export async function startTrackingJourney(): Promise<StartTrackingResponse> {
  /*
   * Primero Nest confirma la jornada.
   */
  const result = await startTracking();

  /*
   * TaskManager necesita conocer
   * esta sesión incluso sin React.
   */
  await setActiveTrackingSession(result.sesionTrackingId);

  /*
   * El inicio del servicio local
   * NO puede invalidar una jornada
   * que ya fue creada por el servidor.
   *
   * Si falta un permiso, la pantalla
   * lo resolverá y reconciliation
   * podrá iniciar posteriormente.
   */
  try {
    const device = await getTrackingDeviceStatus();

    const ready =
      device.supported &&
      device.locationServicesEnabled &&
      device.foregroundPermission === "granted" &&
      device.backgroundPermission === "granted";

    if (ready && !device.serviceRunning) {
      const profileId = await loadTrackingProfileId();

      const service = await startTrackingLocationService(profileId);
      if (service.started) {
        // Una muestra inmediata evita esperar al primer intervalo de TaskManager.
        void captureInitialTrackingLocation();
      }
    }
  } catch (error) {
    console.warn(
      "[tracking] Jornada iniciada, pero el servicio GPS todavía no pudo arrancar.",
      error,
    );
  }

  return result;
}
