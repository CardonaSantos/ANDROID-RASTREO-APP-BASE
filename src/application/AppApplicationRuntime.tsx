import { useEffect, type PropsWithChildren } from "react";
import { appTrackingFeatureRuntime } from "./tracking/app-tracking-feature.runtime";

export function AppApplicationRuntime({ children }: PropsWithChildren) {
  useEffect(() => appTrackingFeatureRuntime.start(), []);
  return <>{children}</>;
}
