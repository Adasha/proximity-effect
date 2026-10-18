// Smoke tests for the built files, to catch packaging mistakes
// (wrong format, missing global, broken exports).

import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));


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
        expect(pkg.types).toBe("./dist/proximity-effect.d.ts");
        expect(pkg.exports["."].types).toBe(pkg.types);
        expect(read(pkg.types)).toBe(read("src/ProximityEffect.d.ts"));
    });

    it("ships the global declaration, pointing at the renamed module types", () =>
    {
        const file = pkg.exports["./global"].types;
        expect(file).toBe("./dist/proximity-effect.global.d.ts");
        const dts = read(file);
        expect(dts).toContain(`from "./proximity-effect.js"`);
        expect(dts.replace(`"./proximity-effect.js"`, `"./ProximityEffect.js"`))
            .toBe(read("src/ProximityEffect.global.d.ts"));
    });

    it("every file package.json names exists", () =>
    {
        const targets = [pkg.module, pkg.types, pkg.unpkg, pkg.jsdelivr,
            ...Object.values(pkg.exports).flatMap((e) => typeof e === "string" ? [e] : Object.values(e))];
        for (const file of targets)
        {
            expect(existsSync(join(root, file)), file).toBe(true);
        }
        expect(pkg.unpkg).toBe("./dist/proximity-effect.min.js");
        expect(pkg.jsdelivr).toBe(pkg.unpkg);
    });

    it("packs exactly the expected files", () =>
    {
        const [result] = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"],
            { cwd: root, encoding: "utf8" }));
        expect(result.files.map((f) => f.path).sort()).toEqual([
            "CHANGELOG.md",
            "LICENSE",
            "README.md",
            "dist/proximity-effect.d.ts",
            "dist/proximity-effect.global.d.ts",
            "dist/proximity-effect.min.js",
            "dist/proximity-effect.min.js.map",
            "dist/proximity-effect.mjs",
            "package.json",
        ]);
    });

    it("states the same version in package.json, the lockfile, the README, the source and the builds", () =>
    {
        const { version } = pkg;
        expect(JSON.parse(read("package-lock.json")).version).toBe(version);
        expect(read("README.md")).toMatch(new RegExp(`^# .+\\n\\nv${version.replaceAll(".", "\\.")}\\n`));
        expect(read("src/ProximityEffect.js")).toContain(`@version ${version}\n`);
        for (const file of ["dist/proximity-effect.mjs", "dist/proximity-effect.min.js"])
        {
            expect(read(file).startsWith(`/*! ${pkg.name} v${version} |`), file).toBe(true);
        }
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
