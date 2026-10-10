import { useEffect, type PropsWithChildren } from "react";
import { appTrackingFeatureRuntime } from "./tracking/app-tracking-feature.runtime";
import { appRealtimeFeatureRuntime } from "./realtime/app-realtime-feature.runtime";

export function AppApplicationRuntime({ children }: PropsWithChildren) {
  useEffect(() => {
    const releaseTracking = appTrackingFeatureRuntime.start();
    const releaseRealtime = appRealtimeFeatureRuntime.start();
    return () => {
      releaseRealtime();
      releaseTracking();
    };
  }, []);
  return <>{children}</>;
}
