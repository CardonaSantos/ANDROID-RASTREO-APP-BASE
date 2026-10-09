import { isNetworkUsable, networkManager } from "@/core/network";

import { sessionManager } from "@/core/session";

import { registerTrackingLocation } from "../api/tracking.api";

import {
  countQueuedTrackingLocationsForSession,
  deleteQueuedTrackingLocation,
  listQueuedTrackingLocationsForSession,
  markQueuedTrackingLocationAttempt,
  saveTrackingSyncSuccess,
} from "../storage";

export type TrackingQueueFlushReason =
  | "completed"
  | "offline"
  | "unauthenticated"
  | "request-failed";

export interface TrackingQueueFlushResult {
  sent: number;

  remaining: number;

  reason: TrackingQueueFlushReason;
}

async function ensureAuthenticatedSession(): Promise<boolean> {
  let snapshot = sessionManager.getSnapshot();

  /*
   * Una ejecución headless puede arrancar
   * sin que React haya hidratado todavía
   * la sesión.
   */
  if (!snapshot.hydrated) {
    try {
      await sessionManager.hydrate();
    } catch {
      return false;
    }

    snapshot = sessionManager.getSnapshot();
  }

  return snapshot.isAuthenticated;
}

export async function flushTrackingQueueForSession(
  sessionId: number,
): Promise<TrackingQueueFlushResult> {
  const initialPending =
    await countQueuedTrackingLocationsForSession(sessionId);

  if (initialPending === 0) {
    return {
      sent: 0,

      remaining: 0,

      reason: "completed",
    };
  }

  let network;

  try {
    network = await networkManager.refreshConnectivity();
  } catch {
    return {
      sent: 0,

      remaining: initialPending,

      reason: "offline",
    };
  }

  if (!isNetworkUsable(network)) {
    return {
      sent: 0,

      remaining: initialPending,

      reason: "offline",
    };
  }

  const authenticated = await ensureAuthenticatedSession();

  if (!authenticated) {
    return {
      sent: 0,

      remaining: initialPending,

      reason: "unauthenticated",
    };
  }


  let sent = 0;
  // La cola puede superar 25 posiciones tras varias horas sin conexión.
  // Procesar todos los lotes permite cerrar una jornada sin perder datos.
  for (let batch = 0; batch < 200; batch += 1) {
    const pending = await listQueuedTrackingLocationsForSession(sessionId, 25);
    if (pending.length === 0) {
      return { sent, remaining: 0, reason: "completed" };
    }

    for (const item of pending) {
      await markQueuedTrackingLocationAttempt(item.id);
      let response;
      try {
        // El servidor deduplica por claveIdempotencia, incluso tras
        // perder el ACK de una petición anterior.
        response = await registerTrackingLocation(item.payload);
      } catch {
        return {
          sent,
          remaining: await countQueuedTrackingLocationsForSession(sessionId),
          reason: "request-failed",
        };
      }

      await deleteQueuedTrackingLocation(item.id);
      try {
        await saveTrackingSyncSuccess({
          receivedAt: response.recibidoEn,
          heartbeatAt: response.ultimoHeartbeatEn,
        });
      } catch (error) {
        console.warn("[tracking-sync] No pudo guardarse el último ACK.", error);
      }
      sent += 1;
    }
  }

  // Límite preventivo para no bloquear indefinidamente una ejecución headless.
  return {
    sent,
    remaining: await countQueuedTrackingLocationsForSession(sessionId),
    reason: "request-failed",
  };
}
