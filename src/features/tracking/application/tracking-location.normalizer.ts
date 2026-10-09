import type * as Location from "expo-location";

import type { RegisterTrackingLocationInput } from "../api";

function normalizeOptionalPositiveNumber(
  value: number | null | undefined,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizeBatteryPercent(batteryLevel: number | null): number | null {
  if (
    batteryLevel === null ||
    !Number.isFinite(batteryLevel) ||
    batteryLevel < 0
  ) {
    return null;
  }

  /*
   * expo-battery entrega normalmente
   * un valor entre 0 y 1.
   */
  const percentage = Math.round(batteryLevel * 100);

  return Math.min(100, Math.max(0, percentage));
}

function normalizeCapturedAt(timestamp: number): string {
  if (Number.isFinite(timestamp) && timestamp > 0) {
    const date = new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  /*
   * No fabricamos coordenadas,
   * pero sí podemos usar el instante
   * actual si Android entrega un
   * timestamp anómalo.
   */
  return new Date().toISOString();
}

export function normalizeTrackingLocation(
  sessionId: number,
  location: Location.LocationObject,
  batteryLevel: number | null,
): RegisterTrackingLocationInput | null {
  const latitude = location.coords.latitude;

  const longitude = location.coords.longitude;

  /*
   * Una coordenada inválida se descarta.
   * Nunca hacemos clamp porque eso
   * inventaría una posición diferente.
   */
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return null;
  }

  return {
    sesionTrackingId: sessionId,

    claveIdempotencia: `marcas:${sessionId}:${normalizeCapturedAt(location.timestamp)}:${latitude}:${longitude}`,

    latitud: latitude,

    longitud: longitude,

    precision: normalizeOptionalPositiveNumber(location.coords.accuracy),

    velocidad: normalizeOptionalPositiveNumber(location.coords.speed),

    bateria: normalizeBatteryPercent(batteryLevel),

    capturadoEn: normalizeCapturedAt(location.timestamp),
  };
}
