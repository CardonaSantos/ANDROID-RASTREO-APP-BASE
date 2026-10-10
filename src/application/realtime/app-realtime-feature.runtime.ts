import { queryClient } from "@/core/query";
import { realtimeClient } from "@/core/realtime";
import { createRealtimeFeatureRuntime } from "@/core/realtime/realtime-handlers";
import { trackingStateQueryKey } from "@/features/tracking/hooks/tracking.hooks";
import { appTrackingRealtimeBinding } from "./app-realtime-feature.bindings";

const bindingRuntime = createRealtimeFeatureRuntime({
  bindings: [appTrackingRealtimeBinding],
});

export const appRealtimeFeatureRuntime = Object.freeze({
  start(): () => void {
    const releaseBindings = bindingRuntime.start();
    let lastStatus = realtimeClient.getSnapshot().status;

    const releaseState = realtimeClient.subscribeState((snapshot) => {
      // Socket.IO se suspende en background; al volver a conectarse
      // hay que recuperar eventos que se pudieron perder.
      if (snapshot.status === "connected" && lastStatus !== "connected") {
        void queryClient.invalidateQueries({
          queryKey: trackingStateQueryKey,
          exact: true,
        });
      }
      lastStatus = snapshot.status;
    });

    return () => {
      releaseState();
      releaseBindings();
    };
  },
});
