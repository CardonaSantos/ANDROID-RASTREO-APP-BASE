import { describe, expect, test } from "@jest/globals";

import type * as Location from "expo-location";

import { normalizeTrackingLocation } from "@/features/tracking/application/tracking-location.normalizer";

function createLocation(
  overrides: Partial<Location.LocationObject["coords"]> = {},
): Location.LocationObject {
  return {
    timestamp: 1_777_651_200_000,

    coords: {
      latitude: 15.3198,

      longitude: -91.4708,

      altitude: null,

      accuracy: 10,

      altitudeAccuracy: null,

      heading: null,

      speed: 4,

      ...overrides,
    },
  };
}

describe("tracking location normalizer", () => {
  test("normaliza una ubicación válida", () => {
    const result = normalizeTrackingLocation(25, createLocation(), 0.76);

    expect(result).not.toBeNull();

    expect(result?.sesionTrackingId).toBe(25);

    expect(result?.claveIdempotencia).toContain("marcas:25:");

    expect(result?.latitud).toBe(15.3198);

    expect(result?.longitud).toBe(-91.4708);

    expect(result?.precision).toBe(10);

    expect(result?.velocidad).toBe(4);

    expect(result?.bateria).toBe(76);
  });

  test("velocidad y precisión negativas se convierten en null", () => {
    const result = normalizeTrackingLocation(
      25,
      createLocation({
        accuracy: -1,

        speed: -1,
      }),
      0.5,
    );

    expect(result?.precision).toBeNull();

    expect(result?.velocidad).toBeNull();
  });

  test("batería desconocida se convierte en null", () => {
    const result = normalizeTrackingLocation(25, createLocation(), -1);

    expect(result?.bateria).toBeNull();
  });

  test("descarta coordenadas inválidas", () => {
    const result = normalizeTrackingLocation(
      25,
      createLocation({
        latitude: 120,
      }),
      0.9,
    );

    expect(result).toBeNull();
  });
});
