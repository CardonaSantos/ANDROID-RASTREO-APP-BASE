import {
  createRealtimeFeatureBinding,
  createRealtimeQueryInvalidationHandler,
} from "@/core/realtime/realtime-handlers";
import { readAuthProfile } from "@/features/auth/storage/auth-user.storage";
import { trackingStateQueryKey } from "@/features/tracking/hooks/tracking.hooks";
import { shouldInvalidateOwnTracking } from "./tracking-realtime.events";

// La lógica de keys y la suscripción quedan fuera de Core.
// Otras features podrán registrar nuevos bindings sin tocar el transporte.
const invalidateOwnState = createRealtimeQueryInvalidationHandler(() => [
  { queryKey: trackingStateQueryKey, exact: true },
]);

async function handleTrackingEvent(
  event: Parameters<typeof invalidateOwnState>[0],
): Promise<void> {
  const user = await readAuthProfile();
  if (shouldInvalidateOwnTracking(event, user)) {
    await invalidateOwnState(event);
  }
}

export const appTrackingRealtimeBinding = createRealtimeFeatureBinding({
  handlers: [
    { type: "tracking:state-changed", handle: handleTrackingEvent },
    { type: "tracking:location-updated", handle: handleTrackingEvent },
  ],
  onError: (error, event) => {
    if (__DEV__) {
      console.info("[realtime] No pudo invalidarse query del evento", {
        type: event.type,
        reason: error instanceof Error ? error.name : "unknown",
      });
    }
  },
});
