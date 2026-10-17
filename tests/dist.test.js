// Smoke tests for the built files, to catch packaging mistakes
// (wrong format, missing global, broken exports).

import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");


beforeAll(() =>
{
    execFileSync(process.execPath, ["scripts/build.js"], { cwd: root });
});


describe("dist", () =>
{
    it("proximity-effect.mjs exports the class as default", async () =>
    {
        const mod = await import(join(root, "dist/proximity-effect.mjs"));
        expect(typeof mod.default).toBe("function");
    });

    it("ships the type declarations where package.json points", () =>
    {
        const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
        expect(pkg.types).toBe("./dist/proximity-effect.d.ts");
        expect(pkg.exports["."].types).toBe(pkg.types);
        expect(readFileSync(join(root, pkg.types), "utf8"))
            .toBe(readFileSync(join(root, "src/ProximityEffect.d.ts"), "utf8"));
    });

    it("proximity-effect.min.js is a classic script that sets a global", () =>
    {
        const code = readFileSync(join(root, "dist/proximity-effect.min.js"), "utf8");
        expect(code).not.toMatch(/^\s*(import|export)\s/m);
        delete globalThis.ProximityEffect;
        new Function(code)();
        expect(typeof globalThis.ProximityEffect).toBe("function");
        delete globalThis.ProximityEffect;
    });
});
