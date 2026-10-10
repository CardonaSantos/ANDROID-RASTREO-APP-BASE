import { DEFAULT_HTTP_TIMEOUT_MS } from "./config.constants";

import { appEnvironmentSchema } from "./config.schema";

import { rawEnvironment } from "./environment";
import { resolveRealtimeConnectionConfig } from "./realtime-config";

const result = appEnvironmentSchema.safeParse(rawEnvironment);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "environment";

      return `- ${path}: ${issue.message}`;
    })
    .join("\n");

  throw new Error(
    ["[core/config] Invalid application configuration.", details].join("\n"),
  );
}

const environment = result.data;

const apiConfig = Object.freeze({
  baseUrl: environment.EXPO_PUBLIC_API_URL,

  timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
});

const realtimeConfig = resolveRealtimeConnectionConfig(environment);

export const appConfig = Object.freeze({
  environment: environment.EXPO_PUBLIC_APP_ENV,

  api: apiConfig,

  realtime: realtimeConfig,
});

export type AppConfig = typeof appConfig;
