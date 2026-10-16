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

    it("rejects NaN and infinite keyframe values", () =>
    {
        expect(() => new Style("translateX", [NaN, 1])).toThrow(RangeError);
        expect(() => new Style("translateX", [0, { value: Infinity }])).toThrow(RangeError);
    });
});


describe("Style hardening", () =>
{
    it("accepts camelCase, kebab-case and vendor-prefixed property names", () =>
    {
        expect(new Style({ rule: "letterSpacing", unit: "px" }, [0, 1]).rule).toBe("letterSpacing");
        expect(new Style({ rule: "letter-spacing", unit: "px" }, [0, 1]).rule).toBe("letter-spacing");
        expect(new Style({ rule: "-webkit-filter", func: "blur", unit: "px" }, [0, 1]).rule).toBe("-webkit-filter");
        expect(new Style({ rule: "webkitFilter", func: "blur", unit: "px" }, [0, 1]).rule).toBe("webkitFilter");
    });

    it("rejects rules that aren't CSS property names", () =>
    {
        for (const rule of ["cssText", "setProperty", "parentRule", "length", "constructor", "__proto__",
            "color; background: red", "background:url(x)", "", "1px", "--custom", "Transform"])
        {
            expect(() => new Style({ rule }, [0, 1]), rule).toThrow(RangeError);
        }
    });

    it("rejects funcs that aren't plain CSS function names, or that load resources", () =>
    {
        for (const func of ["url", "URL", "image-set", "attr", "var", "expression", "translate(1px)", "a b", "", "-x"])
        {
            expect(() => new Style({ rule: "transform", func }, [0, 1]), func).toThrow(RangeError);
        }
        expect(() => new Style({ rule: "transform", func: 5 }, [0, 1])).toThrow(TypeError);
        expect(new Style({ rule: "filter", func: "hue-rotate", unit: "deg" }, [0, 1]).func).toBe("hue-rotate");
    });

    it("only accepts known CSS units", () =>
    {
        for (const unit of ["px", "%", "deg", "rem", "vmin", "Q", "ms", "PX"])
        {
            expect(() => new Style({ rule: "letterSpacing", unit }, [0, 1]), unit).not.toThrow();
        }
        for (const unit of ["px; color: red", "px)", "furlongs", " px"])
        {
            expect(() => new Style({ rule: "letterSpacing", unit }, [0, 1]), unit).toThrow(RangeError);
        }
        expect(() => new Style({ rule: "letterSpacing", unit: 5 }, [0, 1])).toThrow(TypeError);
        expect(new Style({ rule: "letterSpacing", unit: "" }, [0, 1]).unit).toBeUndefined();
    });

    it("validates min, max and default", () =>
    {
        expect(() => new Style({ rule: "opacity", min: "0" }, [0, 1])).toThrow(TypeError);
        expect(() => new Style({ rule: "opacity", max: NaN }, [0, 1])).toThrow(RangeError);
        expect(() => new Style({ rule: "opacity", default: Infinity }, [0, 1])).toThrow(RangeError);
        expect(() => new Style({ rule: "opacity", min: 1, max: 0 }, [0, 1])).toThrow(RangeError);
    });

    it("ignores inherited properties on style objects and keyframes", () =>
    {
        expect(() => new Style(Object.create({ rule: "opacity" }), [0, 1])).toThrow(TypeError);
        expect(() => new Style("blur", [0, Object.create({ value: 5 })])).toThrow(TypeError);
    });

    it("is not affected by a polluted Object.prototype", () =>
    {
        Object.prototype.scatter = 1000;
        Object.prototype.unit = "; color: red";
        try
        {
            const s = new Style({ rule: "letterSpacing" }, [0, { value: 5 }]);
            expect(s.unit).toBeUndefined();
            expect(s.near.scatter).toBeUndefined();
            expect(s.far.scatter).toBeUndefined();
        }
        finally
        {
            delete Object.prototype.scatter;
            delete Object.prototype.unit;
        }
    });

    it("validates keyframe scatter, scatterMethod and distance", () =>
    {
        expect(() => new Style("blur", [0, { value: 1, scatter: "2" }])).toThrow(TypeError);
        expect(() => new Style("blur", [0, { value: 1, scatter: -2 }])).toThrow(RangeError);
        expect(() => new Style("blur", [0, { value: 1, scatter: 2, scatterMethod: "bogus" }])).toThrow(RangeError);
        expect(() => new Style("blur", [0, { value: 1, distance: 2 }])).toThrow(RangeError);
        expect(new Style("blur", [0, { value: 1, scatter: 2, scatterMethod: "gaussian" }]).far.scatterMethod).toBe("gaussian");
    });

    it("validates per-style params and keeps only known ones", () =>
    {
        const s = new Style("blur", [0, 1], { id: "a", attack: 2, threshold: -5, invert: true, extra: 1 });
        expect(s.params).toEqual({ id: "a", attack: 1, threshold: 0, invert: true });
        expect(() => new Style("blur", [0, 1], { id: 5 })).toThrow(TypeError);
        expect(() => new Style("blur", [0, 1], { runoff: "5" })).toThrow(TypeError);
        expect(() => new Style("blur", [0, 1], { decay: NaN })).toThrow(RangeError);
        expect(() => new Style("blur", [0, 1], { invert: "yes" })).toThrow(TypeError);
        expect(() => new Style("blur", [0, 1], 5)).toThrow(TypeError);
    });

    it("returns copies of its keyframes", () =>
    {
        const s = new Style("translateX", [0, 10]);
        s.far.value = 99;
        expect(s.far.value).toBe(10);
    });
});
