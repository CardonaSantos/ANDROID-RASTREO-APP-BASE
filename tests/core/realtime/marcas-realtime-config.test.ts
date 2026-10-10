import { describe, expect, test } from "@jest/globals";
import { appEnvironmentSchema } from "@/core/config/config.schema";
import { resolveRealtimeConnectionConfig } from "@/core/config/realtime-config";

const base = {
  EXPO_PUBLIC_APP_ENV: "development",
  EXPO_PUBLIC_API_URL: "http://10.0.2.2:4000",
  EXPO_PUBLIC_REALTIME_URL: "",
};

describe("MARCAS realtime config", () => {
  test("default: desactivado incluso si .env tenía una URL antigua", () => {
    const env = appEnvironmentSchema.parse({
      ...base,
      EXPO_PUBLIC_REALTIME_URL: "http://localhost:3000",
    });
    expect(resolveRealtimeConnectionConfig(env)).toEqual({
      enabled: false,
      url: null,
    });
  });

  test("activado: usa la URL de MARCAS HTTP sin configuración duplicada", () => {
    const env = appEnvironmentSchema.parse({
      ...base,
      EXPO_PUBLIC_REALTIME_ENABLED: "true",
    });
    expect(resolveRealtimeConnectionConfig(env)).toEqual({
      enabled: true,
      url: "http://10.0.2.2:4000",
    });
  });

  test("override remoto explícito sigue siendo posible", () => {
    const env = appEnvironmentSchema.parse({
      ...base,
      EXPO_PUBLIC_REALTIME_ENABLED: "true",
      EXPO_PUBLIC_REALTIME_URL: "https://ws.example.com",
    });
    expect(resolveRealtimeConnectionConfig(env).url).toBe(
      "https://ws.example.com",
    );
  });

  test("no acepta booleanos ambiguos", () => {
    expect(appEnvironmentSchema.safeParse({
      ...base,
      EXPO_PUBLIC_REALTIME_ENABLED: "yes",
    }).success).toBe(false);
  });
});
