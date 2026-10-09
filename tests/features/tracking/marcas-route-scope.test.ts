import { describe, expect, test } from "@jest/globals";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("MARCAS tracking-only routing", () => {
  test("solo hay una pantalla principal y una de jornada", () => {
    const base = resolve(process.cwd(), "src/app/(app)");
    expect(readdirSync(base).sort()).toEqual(["_layout.tsx", "index.tsx", "tracking"].sort());
  });
  test("las rutas no autorizan los roles legacy de técnicos", () => {
    const src = readFileSync(resolve(process.cwd(), "src/app/(app)/tracking/_layout.tsx"), "utf8");
    expect(src).toContain('"REPARTIDOR"');
    expect(src).toContain('"VENDEDOR"');
    expect(src).not.toContain('"TECNICO"');
    expect(src).not.toContain('"COBRADOR"');
  });
});
