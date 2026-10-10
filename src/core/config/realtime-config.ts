/**
 * El GPS depende de HTTP/SQLite, no de Socket.IO.
 * Realtime queda disponible de forma opt-in para handlers de features.
 */
export function resolveRealtimeConnectionConfig(environment: {
  EXPO_PUBLIC_API_URL: string;
  EXPO_PUBLIC_REALTIME_URL?: string;
  EXPO_PUBLIC_REALTIME_ENABLED: "true" | "false";
}) {
  const enabled = environment.EXPO_PUBLIC_REALTIME_ENABLED === "true";
  return Object.freeze({
    enabled,
    // Default = misma instancia MARCAS que la API HTTP.
    url: enabled
      ? environment.EXPO_PUBLIC_REALTIME_URL?.trim() || environment.EXPO_PUBLIC_API_URL
      : null,
  });
}
