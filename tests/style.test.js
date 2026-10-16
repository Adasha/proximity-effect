import { describe, it, expect } from "vitest";
import Style from "../src/StyleClass.mjs";
import { DEFINED_STYLES } from "../src/definedStyles.mjs";

describe("DEFINED_STYLES", () =>
{
    it("is frozen and contains only single-value styles", () =>
    {
        expect(Object.isFrozen(DEFINED_STYLES)).toBe(true);
        expect(Object.isFrozen(DEFINED_STYLES.opacity)).toBe(true);
        for (const def of Object.values(DEFINED_STYLES))
        {
            expect(typeof def.default).toBe("number");
            expect(def.args).toBeUndefined();
        }
    });
    it("no longer defines the unsupported multi-argument styles", () =>
    {
        for (const name of ["color", "backgroundColor", "scale3D"])
        {
            expect(DEFINED_STYLES[name]).toBeUndefined();
        }
    });
});

describe("Style", () =>
{
    it("builds a preset from numeric keyframes", () =>
    {
        const s = new Style("translateX", [0, 100]);
        expect(s.rule).toBe("transform");
        expect(s.func).toBe("translateX");
        expect(s.unit).toBe("px");
        expect(s.defaultValue).toBe(0);
        expect(s.near).toEqual({ value: 0, distance: 0 });
        expect(s.far).toEqual({ value: 100, distance: 1 });
    });

    it("clamps preset values to the style bounds", () =>
    {
        const s = new Style("opacity", [150, -20]);
        expect(s.near.value).toBe(100);
        expect(s.far.value).toBe(0);
    });

    it("clamps object keyframes too and keeps their extra properties", () =>
    {
        const s = new Style("opacity", [{ value: 500, scatter: 5, scatterMethod: "normal" }, 0]);
        expect(s.near.value).toBe(100);
        expect(s.near.scatter).toBe(5);
        expect(s.near.scatterMethod).toBe("normal");
    });

    it("uses first and last of several keyframes", () =>
    {
        const s = new Style("scale", [1, 5, 2]);
        expect(s.near.value).toBe(1);
        expect(s.far.value).toBe(2);
    });

    it("does not mutate the caller's keyframes", () =>
    {
        const frames = [0, { value: 10 }];
        const copy = structuredClone(frames);
        new Style("translateX", frames);
        expect(frames).toEqual(copy);

        const obj = { value: 5 };
        const s = new Style("translateX", [obj, 1]);
        s.near.value = 99;
        expect(obj.value).toBe(5);
    });

    it("accepts a custom style object", () =>
    {
        const s = new Style({ rule: "letterSpacing", unit: "px", min: 0 }, [-5, 10]);
        expect(s.rule).toBe("letterSpacing");
        expect(s.func).toBeUndefined();
        expect(s.near.value).toBe(0);
        expect(s.far.value).toBe(10);
    });

    it("copies params defensively", () =>
    {
        const params = { id: "a" };
        const s = new Style("blur", [0, 5], params);
        params.id = "b";
        expect(s.params.id).toBe("a");
        s.params.id = "c";
        expect(s.params.id).toBe("a");
        expect(new Style("blur", [0, 5]).params).toEqual({});
    });

    it("rejects unknown presets, including inherited names", () =>
    {
        expect(() => new Style("nope", [0, 1])).toThrow(RangeError);
        expect(() => new Style("toString", [0, 1])).toThrow(RangeError);
        expect(() => new Style("__proto__", [0, 1])).toThrow(RangeError);
    });

    it("rejects invalid style definitions", () =>
    {
        expect(() => new Style({}, [0, 1])).toThrow(TypeError);
        expect(() => new Style(null, [0, 1])).toThrow(TypeError);
        expect(() => new Style(42, [0, 1])).toThrow(TypeError);
    });

    it("rejects missing, short or malformed keyframes", () =>
    {
        expect(() => new Style("blur")).toThrow(TypeError);
        expect(() => new Style("blur", [])).toThrow(TypeError);
        expect(() => new Style("blur", [1])).toThrow(TypeError);
        expect(() => new Style("blur", [0, "5"])).toThrow(TypeError);
        expect(() => new Style("blur", [0, {}])).toThrow(TypeError);
        expect(() => new Style("blur", "01")).toThrow(TypeError);
    });

    it("preserves NaN keyframe values rather than hiding them", () =>
    {
        expect(new Style("translateX", [NaN, 1]).near.value).toBeNaN();
    });
});
