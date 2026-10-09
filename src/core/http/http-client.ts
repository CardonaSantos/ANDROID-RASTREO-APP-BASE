import { appConfig } from "@/core/config";
import { sessionTokenProvider } from "@/core/session";
import { createHttpClient } from "./create-http-client";

// MARCAS-GT-SERVER emite authToken, pero no refreshToken.
// Ante 401 propagamos unauthorized: reintentar refresh no es posible.
export const httpClient = createHttpClient({
  baseUrl: appConfig.api.baseUrl,
  timeoutMs: appConfig.api.timeoutMs,
  tokenProvider: sessionTokenProvider,
});
