import { z } from "zod";
import type { RealtimeEvent } from "@/core/realtime";

const stateChanged = z.object({ usuarioId: z.number().int().positive() });
const locationUpdated = z.object({
  usuario: z.object({ id: z.number().int().positive() }),
});

/** El servidor publica estos eventos solo a role:ADMIN. */
export function shouldInvalidateOwnTracking(
  event: RealtimeEvent,
  currentUser: { id: number; rol: string } | null,
): boolean {
  if (!currentUser || currentUser.rol !== "ADMIN") return false;

  if (event.type === "tracking:state-changed") {
    const result = stateChanged.safeParse(event.payload);
    return result.success && result.data.usuarioId === currentUser.id;
  }

  if (event.type === "tracking:location-updated") {
    const result = locationUpdated.safeParse(event.payload);
    return result.success && result.data.usuario.id === currentUser.id;
  }

  return false;
}
