import { describe, it, expect } from "vitest";
import ProximityEffect from "../src/ProximityEffect.js";

describe("ProximityEffect", () =>
{
    it("can be imported as the default export", () =>
    {
        expect(typeof ProximityEffect).toBe("function");
        expect(ProximityEffect.prototype).toBeInstanceOf(EventTarget);
    });
});
