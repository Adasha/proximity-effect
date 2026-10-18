import { describe, it, expect, vi, afterEach } from "vitest";
import * as U from "../src/AdashaUtils.mjs";

afterEach(() => vi.restoreAllMocks());

describe("constrain", () =>
{
    it("clamps to both bounds", () =>
    {
        expect(U.constrain(5, 0, 3)).toBe(3);
        expect(U.constrain(-5, 0, 3)).toBe(0);
        expect(U.constrain(2, 0, 3)).toBe(2);
    });
    it("ignores missing bounds", () =>
    {
        expect(U.constrain(-5, undefined, 3)).toBe(-5);
        expect(U.constrain(5, 0)).toBe(5);
        expect(U.constrain(5, null, null)).toBe(5);
        expect(U.constrain(5)).toBe(5);
    });
    it("handles NaN and Infinity", () =>
    {
        expect(U.constrain(NaN, 0, 1)).toBeNaN();
        expect(U.constrain(Infinity, 0, 1)).toBe(1);
        expect(U.constrain(-Infinity, 0, 1)).toBe(0);
    });
    it("throws a TypeError for non-numbers", () =>
    {
        expect(() => U.constrain("5", 0, 1)).toThrow(TypeError);
        expect(() => U.constrain(undefined, 0, 1)).toThrow(TypeError);
        expect(() => U.constrain(null)).toThrow(TypeError);
    });
});

describe("roundTo", () =>
{
    it("rounds to decimal places", () =>
    {
        expect(U.roundTo(1.2345, 2)).toBe(1.23);
        expect(U.roundTo(1.5)).toBe(2);
    });
    it("treats negative places as zero", () =>
    {
        expect(U.roundTo(1.6, -3)).toBe(2);
    });
});

describe("lerp", () =>
{
    it("interpolates", () =>
    {
        expect(U.lerp(0, 10, 20)).toBe(10);
        expect(U.lerp(0.5, 10, 20)).toBe(15);
        expect(U.lerp(1, 10, 20)).toBe(20);
        expect(U.lerp(0.5, 20, 10)).toBe(15);
    });
    it("clamps the position to 0..1", () =>
    {
        expect(U.lerp(-1, 10, 20)).toBe(10);
        expect(U.lerp(2, 10, 20)).toBe(20);
    });
});

describe("random", () =>
{
    it("uniform spans +/- v/2", () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(0);
        expect(U.random(4, "uniform")).toBe(-2);
        Math.random.mockReturnValue(1);
        expect(U.random(4, "uniform")).toBe(2);
    });
    it("defaults to uniform with v=2", () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(1);
        expect(U.random()).toBe(1);
    });
    it("accepts 'gaussian' as an alias of 'normal'", () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(1);
        expect(U.random(2, "gaussian")).toBe(U.random(2, "normal"));
        expect(U.random(2, "normal")).toBeCloseTo(1);
    });
    it("stays within bounds over many samples", () =>
    {
        for (const m of ["uniform", "normal"])
        {
            for (let i = 0; i < 500; i++)
            {
                expect(Math.abs(U.random(10, m))).toBeLessThanOrEqual(5);
            }
        }
    });
    it("throws a RangeError for an unknown method", () =>
    {
        expect(() => U.random(2, "bogus")).toThrow(RangeError);
    });
});

describe("xor", () =>
{
    it("returns real booleans", () =>
    {
        expect(U.xor(true, false)).toBe(true);
        expect(U.xor(false, true)).toBe(true);
        expect(U.xor(true, true)).toBe(false);
        expect(U.xor(false, false)).toBe(false);
        expect(U.xor(1, 0)).toBe(true);
        expect(U.xor("a", undefined)).toBe(true);
        expect(U.xor(0, null)).toBe(false);
    });
});

describe("isObject", () =>
{
    it("accepts plain objects only", () =>
    {
        expect(U.isObject({})).toBe(true);
        expect(U.isObject([])).toBe(false);
        expect(U.isObject(null)).toBe(false);
        expect(U.isObject("x")).toBe(false);
        expect(U.isObject(new Date())).toBe(false);
    });
});
