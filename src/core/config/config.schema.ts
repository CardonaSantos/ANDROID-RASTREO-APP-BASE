import { z } from "zod";

import { APP_ENVIRONMENTS } from "./config.constants";

const appEnvironmentNameSchema = z.enum(APP_ENVIRONMENTS);

/*
 * =========================================================
 * HTTP API
 * =========================================================
 */

const httpUrlSchema = z.url().refine(
  (value) => {
    const normalized = value.toLowerCase();

    return (
      normalized.startsWith("http://") || normalized.startsWith("https://")
    );
  },
  {
    error: "Must use http:// or https://",
  },
);

/*
 * =========================================================
 * REALTIME / SOCKET.IO SERVER
 * =========================================================
 *
 * Socket.IO does not receive a raw ws:// endpoint here.
 *
 * We configure the HTTP(S) origin of the Socket.IO server:
 *
 * development:
 * http://192.168.1.10:3000
 *
 * production:
 * https://api.example.com
 *
 * Namespace and Socket.IO path belong to the realtime
 * transport adapter, not to environment configuration.
 * =========================================================
 */

const realtimeServerUrlSchema = z.url().refine(
  (value) => {
    const normalized = value.toLowerCase();

    return (
      normalized.startsWith("http://") || normalized.startsWith("https://")
    );
  },
  {
    error: "Must use http:// or https://",
  },
);

const optionalRealtimeServerUrlSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, realtimeServerUrlSchema.optional());

/*
 * =========================================================
 * ENVIRONMENT
 * =========================================================
 */

export const appEnvironmentSchema = z
  .object({
    EXPO_PUBLIC_APP_ENV: appEnvironmentNameSchema,

    EXPO_PUBLIC_API_URL: httpUrlSchema,

    EXPO_PUBLIC_REALTIME_URL: optionalRealtimeServerUrlSchema,

    // El socket es opt-in en la app de campo; para el GPS usamos HTTP.
    EXPO_PUBLIC_REALTIME_ENABLED: z.preprocess(
      (value) => value === "" ? undefined : value,
      z.enum(["true", "false"]).default("false"),
    ),
  })

  /*
   * Preview and production HTTP API
   * must use TLS.
   */
  .refine(
    (environment) => {
      if (environment.EXPO_PUBLIC_APP_ENV === "development") {
        return true;
      }

      return environment.EXPO_PUBLIC_API_URL.toLowerCase().startsWith(
        "https://",
      );
    },
    {
      error: "Preview and production environments must use HTTPS",

      path: ["EXPO_PUBLIC_API_URL"],
    },
  )

  /*
   * The Socket.IO server must also use TLS
   * outside development.
   */
  .refine(
    (environment) => {
      if (environment.EXPO_PUBLIC_APP_ENV === "development") {
        return true;
      }

      const realtimeUrl = environment.EXPO_PUBLIC_REALTIME_URL;

      if (!realtimeUrl) {
        return true;
      }

      return realtimeUrl.toLowerCase().startsWith("https://");
    },
    {
      error: "Preview and production realtime servers must use HTTPS",

      path: ["EXPO_PUBLIC_REALTIME_URL"],
    },
  );

export type AppEnvironment = z.infer<typeof appEnvironmentNameSchema>;
