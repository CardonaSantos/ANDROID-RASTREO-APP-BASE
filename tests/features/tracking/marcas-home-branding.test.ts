import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "@jest/globals";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Marcas Guatemala presentation", () => {
  test("el nombre visible de Expo es Marcas Guatemala sin cambiar el package Android", () => {
    const app = JSON.parse(read("app.json")) as {
      expo: { name: string; android: { package: string } };
    };
    expect(app.expo.name).toBe("Marcas Guatemala");
    expect(app.expo.android.package).toBe("com.cardonasantos.marcasrastreo");
  });

  test("la Home utiliza el menú de cuenta para cerrar sesión", () => {
    const home = read("src/app/(app)/index.tsx");
    expect(home).toContain("Marcas Guatemala");
    expect(home).toContain("<AppMenu");
    expect(home).toContain('label: "Cerrar sesión"');
    expect(home).toContain("await logout.mutateAsync()");
    expect(home).not.toContain("MARCAS Rastreo");
  });

  test("la Home tiene header propio sin duplicar el título", () => {
    const layout = read("src/app/(app)/_layout.tsx");
    expect(layout).toContain('name="index" options={{ headerShown: false }}');
    expect(layout).toContain('name="tracking" options={{ title: "Jornada" }}');
  });

  test("la pantalla mantiene estados verdaderos del dispositivo", () => {
    const home = read("src/app/(app)/index.tsx");
    expect(home).toContain("useTrackingDeviceStatusQuery");
    expect(home).toContain('device.data.backgroundPermission === "granted"');
    expect(home).toContain("Reintentar consulta");
  });
});
