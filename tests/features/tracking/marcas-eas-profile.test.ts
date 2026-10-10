import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "@jest/globals";

type BuildProfile = {
  extends?: string;
  environment?: string;
  env?: Record<string, string>;
  android?: { buildType?: string };
};

describe("MARCAS EAS production profile", () => {
  const eas = JSON.parse(
    readFileSync(resolve(process.cwd(), "eas.json"), "utf8"),
  ) as { build: Record<string, BuildProfile> };

  test("la APK interna hereda de production", () => {
    expect(eas.build["marcas-production"].extends).toBe("production");
    expect(eas.build.production.android?.buildType).toBe("apk");
    expect(eas.build["marcas-production"].environment).toBe("production");
  });

  test("la API remota se configura en el entorno EAS, no en eas.json", () => {
    expect(eas.build["marcas-production"].env?.EXPO_PUBLIC_API_URL).toBeUndefined();
    expect(eas.build["marcas-production"].env?.EXPO_PUBLIC_APP_ENV).toBe("production");
    expect(eas.build["marcas-production"].env?.EXPO_PUBLIC_REALTIME_ENABLED).toBe("false");
  });

  test("ninguna variable build.env puede tener valor vacío", () => {
    for (const profile of Object.values(eas.build)) {
      for (const value of Object.values(profile.env ?? {})) {
        expect(value.length).toBeGreaterThan(0);
      }
    }
    expect(eas.build["marcas-production"].env?.EXPO_PUBLIC_REALTIME_URL).toBeUndefined();
  });
});
