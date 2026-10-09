import type { ZodType } from "zod";
import { AppError } from "@/core/errors";
import { httpClient } from "@/core/http";
import { readAuthProfile } from "../storage/auth-user.storage";
import {
  loginResponseSchema,
  type AuthSessionPayload,
  type AuthUser,
  type LoginCredentials,
} from "./auth.contracts.api";

function parseAuthResponse<T>(schema: ZodType<T>, payload: unknown, code: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError({
      kind: "server",
      source: "application",
      code,
      message: "MARCAS devolvió una respuesta de autenticación inválida.",
      details: result.error.issues,
    });
  }
  return result.data;
}

export async function loginUser(
  credentials: LoginCredentials,
  signal?: AbortSignal,
): Promise<AuthSessionPayload> {
  const payload = await httpClient.request<unknown, LoginCredentials>({
    method: "POST",
    path: "auth/login",
    body: credentials,
    auth: "none",
    signal,
  });
  const response = parseAuthResponse(
    loginResponseSchema, payload, "MARCAS_AUTH_LOGIN_INVALID_RESPONSE",
  );
  return { user: response.usuario, accessToken: response.authToken };
}

/**
 * MARCAS no tiene GET /auth/profile. El perfil de la sesión procede
 * exclusivamente del login validado por el servidor y se restaura del
 * almacenamiento seguro. La API sigue verificando JWT y rol en cada request.
 */
export async function loadAuthProfile(_signal?: AbortSignal): Promise<AuthUser> {
  const user = await readAuthProfile();
  if (!user) {
    throw new AppError({
      kind: "session",
      source: "session",
      code: "MARCAS_AUTH_PROFILE_NOT_AVAILABLE",
      message: "No hay perfil de sesión guardado. Inicia sesión nuevamente.",
    });
  }
  return user;
}
