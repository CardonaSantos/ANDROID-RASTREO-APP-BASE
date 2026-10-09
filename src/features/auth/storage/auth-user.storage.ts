import { secureStorage } from "@/core/storage";
import { authUserSchema, type AuthUser } from "../api/auth.contracts.api";

const PROFILE_KEY = "marcas.tracking.auth-user.v1";

export async function saveAuthProfile(user: AuthUser): Promise<void> {
  const verified = authUserSchema.parse(user);
  await secureStorage.setItem(PROFILE_KEY, JSON.stringify(verified));
}

export async function readAuthProfile(): Promise<AuthUser | null> {
  const raw = await secureStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const result = authUserSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function clearAuthProfile(): Promise<void> {
  await secureStorage.removeItem(PROFILE_KEY);
}
