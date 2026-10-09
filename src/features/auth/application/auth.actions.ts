import { currentUserQueryKey, removeCurrentUser } from "@/core/access";

import { AppError } from "@/core/errors";

import { queryClient } from "@/core/query";

import { sessionManager } from "@/core/session";

import { loginUser, type AuthUser, type LoginCredentials } from "../api";

import { authProfileQueryKey } from "./auth-profile.query";
import { TRACKING_ALLOWED_ROLES } from "../api/auth.contracts.api";
import { clearAuthProfile, saveAuthProfile } from "../storage/auth-user.storage";
import { mapAuthUserToCurrentUser } from "./auth.mapper";

export type BeforeLogoutHandler = () => Promise<void>;

let beforeLogoutHandler: BeforeLogoutHandler | null = null;

/**
 * Registra una operación que debe
 * completarse antes de destruir
 * la sesión autenticada.
 *
 * El feature Auth no conoce Tracking.
 * La composición se realiza desde
 * src/application/backend/bootstrap.ts.
 */
export function configureBeforeLogoutHandler(
  handler: BeforeLogoutHandler,
): () => void {
  if (beforeLogoutHandler !== null && beforeLogoutHandler !== handler) {
    throw new AppError({
      kind: "bad_request",

      source: "application",

      code: "AUTH_BEFORE_LOGOUT_HANDLER_ALREADY_CONFIGURED",

      message: "Before-logout handler is already configured.",
    });
  }

  beforeLogoutHandler = handler;

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;

    if (beforeLogoutHandler === handler) {
      beforeLogoutHandler = null;
    }
  };
}


export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await loginUser(credentials);
  if (!response.user.activo ||
      !TRACKING_ALLOWED_ROLES.some((role) => role === response.user.rol)) {
    throw new AppError({
      kind: "forbidden",
      source: "application",
      code: "MARCAS_TRACKING_ROLE_FORBIDDEN",
      message: "La cuenta no tiene acceso al seguimiento de jornadas.",
    });
  }
  // El JWT de MARCAS no incluye refresh-token y se guarda por la
  // estrategia access-token existente de Core.
  await saveAuthProfile(response.user);
  await sessionManager.establish({
    accessToken: response.accessToken,
    persistence: { strategy: "access-token" },
  });
  queryClient.setQueryData(authProfileQueryKey, response.user);
  queryClient.setQueryData(currentUserQueryKey, mapAuthUserToCurrentUser(response.user));
  return response.user;
}

export async function logout(): Promise<void> {
  /*
   * IMPORTANTE:
   *
   * Esta operación ocurre mientras
   * todavía existe el access token.
   *
   * Si falla, NO debemos borrar el JWT.
   */
  if (beforeLogoutHandler) {
    await beforeLogoutHandler();
  }

  /*
   * Solamente llegamos aquí cuando
   * las operaciones previas al logout
   * terminaron correctamente.
   */
  await sessionManager.clear();

  try {
    await clearAuthProfile();
  } catch (error) {
    console.warn('[auth] No pudo limpiarse el perfil local.', error);
  }

  removeCurrentUser();

  queryClient.removeQueries({
    queryKey: authProfileQueryKey,

    exact: true,
  });
}
