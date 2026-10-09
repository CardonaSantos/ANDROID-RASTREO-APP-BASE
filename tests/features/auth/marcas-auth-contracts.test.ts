import { describe, expect, test } from "@jest/globals";
import {
  authUserSchema, loginResponseSchema, TRACKING_ALLOWED_ROLES,
} from "@/features/auth/api/auth.contracts.api";

describe("MARCAS tracking auth", () => {
  const usuario = {
    id: 37, nombre: "Usuario", correo: "user@example.com",
    rol: "REPARTIDOR", activo: true, empresaId: 1,
  };
  test("acepta la respuesta real de POST /auth/login", () => {
    expect(loginResponseSchema.parse({authToken:"jwt",usuario}).usuario.rol).toBe("REPARTIDOR");
  });
  test("acepta empresaId null y rechaza datos CRM innecesarios como obligatorios", () => {
    expect(authUserSchema.safeParse({...usuario, empresaId:null}).success).toBe(true);
  });
  test("los únicos roles autorizados coinciden con el controller de tracking", () => {
    expect([...TRACKING_ALLOWED_ROLES]).toEqual(["VENDEDOR","REPARTIDOR","ADMIN"]);
  });
  test("rechaza el formato legacy access_token / user", () => {
    expect(loginResponseSchema.safeParse({access_token:"x",user:usuario}).success).toBe(false);
  });
});
