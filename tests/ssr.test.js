// @vitest-environment node

import { describe, it, expect } from "vitest";

describe("without a DOM", () =>
{
    it("can be imported", async () =>
    {
        expect(typeof document).toBe("undefined");
        const { default: ProximityEffect } = await import("../src/ProximityEffect.js");
        expect(typeof ProximityEffect).toBe("function");
    });

    it("throws a clear error if constructed", async () =>
    {
        const { default: ProximityEffect } = await import("../src/ProximityEffect.js");
        expect(() => new ProximityEffect([])).toThrow(/browser DOM/);
    });
});
