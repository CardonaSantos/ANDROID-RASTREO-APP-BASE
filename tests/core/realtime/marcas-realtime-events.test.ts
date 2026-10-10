import { describe, expect, test } from "@jest/globals";
import { shouldInvalidateOwnTracking } from "@/application/realtime/tracking-realtime.events";

const admin = { id: 37, rol: "ADMIN" };
const vendor = { id: 37, rol: "VENDEDOR" };

describe("realtime tracking invalidation scoping", () => {
  test("acepta estado propio del ADMIN", () => {
    expect(shouldInvalidateOwnTracking({
      type: "tracking:state-changed",
      payload: { usuarioId: 37, estado: "ACTIVA" },
    }, admin)).toBe(true);
  });
  test("rechaza otros usuarios y roles sin eventos recibibles", () => {
    const event = { type: "tracking:state-changed", payload: { usuarioId: 50 } };
    expect(shouldInvalidateOwnTracking(event, admin)).toBe(false);
    expect(shouldInvalidateOwnTracking(event, vendor)).toBe(false);
  });
  test("el evento ubicación del servidor identifica usuario.id", () => {
    const event = {
      type: "tracking:location-updated",
      payload: { usuario: { id: 37 }, ubicacion: { latitud: 1 } },
    };
    expect(shouldInvalidateOwnTracking(event, admin)).toBe(true);
  });
  test("descarta eventos desconocidos o payload incorrecto", () => {
    expect(shouldInvalidateOwnTracking({
      type: "tracking:state-changed",
      payload: { usuarioId: "37" },
    }, admin)).toBe(false);
    expect(shouldInvalidateOwnTracking({
      type: "unauthorized:event",
      payload: { usuarioId: 37 },
    }, admin)).toBe(false);
  });
});
