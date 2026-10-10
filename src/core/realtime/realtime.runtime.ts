import { Platform } from "react-native";

import {
  isAppForeground,
  isNetworkOffline,
  networkManager,
  networkRuntime,
  type NetworkSnapshot,
} from "@/core/network";

import {
  sessionManager,
  sessionTokenProvider,
  type SessionSnapshot,
} from "@/core/session";

import { realtimeClient } from "./realtime-client";

import type { RealtimeSnapshot } from "./realtime.types";

let consumers = 0;

let releaseNetworkRuntime: (() => void) | null = null;

let unsubscribeNetwork: (() => void) | null = null;

let unsubscribeSession: (() => void) | null = null;

let unsubscribeToken: (() => void) | null = null;

/*
 * =========================================================
 * DEVELOPMENT DIAGNOSTICS
 * =========================================================
 *
 * Estos listeners son globales.
 *
 * No dependen de:
 *
 * - /mapa
 * - /dashboard
 * - /tickets
 * - ningún componente visual.
 *
 * Nunca imprimimos payloads, JWT, coordenadas ni datos
 * operacionales.
 * =========================================================
 */

let unsubscribeRealtimeState: (() => void) | null = null;

let unsubscribeRealtimeEvents: (() => void) | null = null;

let unsubscribeRealtimeErrors: (() => void) | null = null;

let reportedConnectionFailure = false;

let latestNetwork: NetworkSnapshot | null = null;

let latestSession: SessionSnapshot | null = null;

let latestAccessToken: string | null = null;

/*
 * =========================================================
 * DEVELOPMENT LOGGER
 * =========================================================
 */

function logRealtimeSnapshot(snapshot: RealtimeSnapshot): void {
  if (!__DEV__) {
    return;
  }

  console.info("[realtime] Estado Socket.IO:", {
    status: snapshot.status,

    configured: snapshot.configured,

    reconnectAttempt: snapshot.reconnectAttempt,

    suspendReason: snapshot.suspendReason,

    connectedAt:
      snapshot.connectedAt === null
        ? null
        : new Date(snapshot.connectedAt).toISOString(),

    disconnectedAt:
      snapshot.disconnectedAt === null
        ? null
        : new Date(snapshot.disconnectedAt).toISOString(),
  });

  if (snapshot.status === "connected") {
    reportedConnectionFailure = false;
    console.info("[realtime] Socket.IO conectado a MARCAS.");
  }
}

function attachDevelopmentDiagnostics(): void {
  if (!__DEV__) {
    return;
  }

  /*
   * Imprimimos también el estado actual.
   *
   * Es importante porque el Socket podría haberse conectado
   * antes de registrar este observer.
   */
  logRealtimeSnapshot(realtimeClient.getSnapshot());

  unsubscribeRealtimeState = realtimeClient.subscribeState(logRealtimeSnapshot);

  unsubscribeRealtimeEvents = realtimeClient.subscribeAll((event) => {
    console.info(`[realtime] Evento recibido: ${event.type}`);
  });

  unsubscribeRealtimeErrors = realtimeClient.subscribeErrors((error) => {
    // Realtime es best-effort. Un reintento no debe activar LogBox rojo
    // ni poner en duda que el GPS se sincroniza por HTTP.
    if (error.code === "REALTIME_CONNECTION_FAILED") {
      if (!reportedConnectionFailure) {
        console.info("[realtime] Conexión no disponible; se reintentará.", {
          code: error.code,
        });
        reportedConnectionFailure = true;
      }
      return;
    }
    // Diagnóstico de otros errores sin exponer payloads ni credenciales.
    console.warn("[realtime] Evento de error Socket.IO:", { code: error.code });
  });
}

function detachDevelopmentDiagnostics(): void {
  reportedConnectionFailure = false;
  unsubscribeRealtimeErrors?.();

  unsubscribeRealtimeErrors = null;

  unsubscribeRealtimeEvents?.();

  unsubscribeRealtimeEvents = null;

  unsubscribeRealtimeState?.();

  unsubscribeRealtimeState = null;
}

/*
 * =========================================================
 * PLATFORM LIFECYCLE POLICY
 * =========================================================
 *
 * NATIVE
 * ------
 *
 * En Android/iOS suspendemos Socket.IO cuando la aplicación
 * realmente entra en background.
 *
 * Posteriormente push notifications cubrirá ese estado.
 *
 *
 * WEB
 * ---
 *
 * Cambiar de pestaña del navegador NO debe desconectar
 * realtime.
 *
 * El navegador puede marcar AppState como background
 * simplemente porque otra pestaña tiene el foco.
 *
 * Mantener Socket.IO conectado permite:
 *
 * - recibir reasignaciones mientras usamos el CRM en
 *   otra pestaña;
 * - continuar sincronizando queries;
 * - probar realtime correctamente desde web.
 * =========================================================
 */

function shouldSuspendForBackground(snapshot: NetworkSnapshot | null): boolean {
  if (Platform.OS === "web") {
    return false;
  }

  return Boolean(snapshot?.lifecycleInitialized && !isAppForeground(snapshot));
}

/*
 * =========================================================
 * EVALUATE
 * =========================================================
 */

function evaluate(): void {
  if (!realtimeClient.getSnapshot().configured) {
    realtimeClient.stop();

    return;
  }

  if (!latestSession || latestSession.status !== "authenticated") {
    realtimeClient.suspend("session_unavailable");

    return;
  }

  if (latestNetwork && isNetworkOffline(latestNetwork)) {
    realtimeClient.suspend("offline");

    return;
  }

  /*
   * Solamente native debe suspender realtime por lifecycle.
   *
   * En web cambiar de pestaña no equivale a cerrar
   * la aplicación.
   */
  if (shouldSuspendForBackground(latestNetwork)) {
    realtimeClient.suspend("background");

    return;
  }

  realtimeClient.resume();
}

/*
 * =========================================================
 * TOKEN ROTATION
 * =========================================================
 */

function handleAccessTokenChange(nextAccessToken: string | null): void {
  const previousAccessToken = latestAccessToken;

  latestAccessToken = nextAccessToken;

  /*
   * null -> token
   *
   * Login inicial o restauración.
   *
   * El listener de sesión llamará evaluate().
   */
  if (previousAccessToken === null || nextAccessToken === null) {
    return;
  }

  /*
   * No cambió realmente la credencial.
   */
  if (previousAccessToken === nextAccessToken) {
    return;
  }

  if (latestSession?.status !== "authenticated") {
    return;
  }

  /*
   * token A -> token B
   *
   * Socket.IO debe volver a autenticarse con la
   * credencial actual.
   */
  realtimeClient.reconnect();
}

/*
 * =========================================================
 * ATTACH
 * =========================================================
 */

function attach(): void {
  releaseNetworkRuntime = networkRuntime.start();

  latestNetwork = networkManager.getSnapshot();

  latestSession = sessionManager.getSnapshot();

  latestAccessToken = sessionTokenProvider.getAccessToken();

  unsubscribeNetwork = networkManager.subscribe((snapshot) => {
    latestNetwork = snapshot;

    evaluate();
  });

  unsubscribeSession = sessionManager.subscribe((snapshot) => {
    latestSession = snapshot;

    evaluate();
  });

  unsubscribeToken = sessionTokenProvider.subscribe(handleAccessTokenChange);

  /*
   * El observer se registra antes de evaluate()
   * para ver también la conexión inicial.
   */
  attachDevelopmentDiagnostics();

  evaluate();
}

/*
 * =========================================================
 * DETACH
 * =========================================================
 */

function detach(): void {
  detachDevelopmentDiagnostics();

  unsubscribeToken?.();

  unsubscribeToken = null;

  unsubscribeSession?.();

  unsubscribeSession = null;

  unsubscribeNetwork?.();

  unsubscribeNetwork = null;

  releaseNetworkRuntime?.();

  releaseNetworkRuntime = null;

  latestNetwork = null;

  latestSession = null;

  latestAccessToken = null;

  realtimeClient.stop();
}

/*
 * =========================================================
 * START
 * =========================================================
 */

function start(): () => void {
  consumers += 1;

  if (consumers === 1) {
    try {
      attach();
    } catch (error) {
      consumers = 0;

      detach();

      throw error;
    }
  }

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;

    consumers = Math.max(0, consumers - 1);

    if (consumers === 0) {
      detach();
    }
  };
}

export const realtimeRuntime = Object.freeze({
  start,
});
