// Pins the 4.0 public API, so that any change to it is deliberate: adding,
// removing or renaming a member means updating the lists here, the type
// declarations and the CHANGELOG together.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ProximityEffect from "../src/ProximityEffect.js";


const READ_WRITE = [
    "target", "nodes", "threshold", "runoff", "invert", "zIndex", "perspectiveOrigin", "perspective", "attack", "decay",
    "offsetX", "offsetY", "jitter", "jitterX", "jitterY", "jitterMethod", "direction",
    "FPS", "tolerance", "reducedMotion", "scaleEffect", "pointerLeave", "touchDrag",
];

const READ_ONLY = [
    "totalNodes", "styles", "boundary", "motionReduced", "pointer", "paused", "resting", "destroyed",
];

const METHODS = [
    "addStyle", "hasStyle", "removeStyle", "updateStyle", "distanceFrom", "distanceFromIndex",
    "valueFrom", "valueFromIndex",
    "clearTarget", "getCoords", "setCoords", "clearCoords", "setCenterPoints",
    "pause", "resume", "destroy", "getNodeData", "getNodeIndexData", "hasNodeIndexData", "update",
];

const STYLE_GETTERS = [
    "name", "rule", "func", "unit", "min", "max", "defaultValue", "near", "far", "id", "params",
];

const NODE_DATA_KEYS = ["node", "measured", "center", "jitter", "distance", "lastDelta", "styles"];


const sorted = (list) => [...list].sort();


let frames, now, instances;

function step(ms = 16)
{
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(cb => cb(now));
}

function makeNode(x, y)
{
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({ left: x-5, right: x+5, top: y-5, bottom: y+5, width: 10, height: 10, x: x-5, y: y-5 });
    document.body.append(el);
    return el;
}

function create(nodes, params)
{
    const pe = new ProximityEffect(nodes, params);
    instances.push(pe);
    return pe;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() =>
{
    let id = 0;
    frames = new Map();
    now = 0;
    instances = [];
    vi.stubGlobal("requestAnimationFrame", cb => { frames.set(++id, cb); return id; });
    vi.stubGlobal("cancelAnimationFrame", id => { frames.delete(id); });
    document.body.innerHTML = "";
});

afterEach(() =>
{
    instances.forEach(pe => pe.destroy());
    vi.unstubAllGlobals();
});



describe("public API", () =>
{
    it("has exactly the pinned members", () =>
    {
        const names = Object.getOwnPropertyNames(ProximityEffect.prototype).filter(name => name!=="constructor");
        expect(sorted(names)).toEqual(sorted([...READ_WRITE, ...READ_ONLY, ...METHODS]));
        expect(sorted(Object.getOwnPropertyNames(ProximityEffect))).toEqual(["length", "name", "prototype"]);
    });

    it("has getters and setters, read-only getters and methods where pinned", () =>
    {
        const kind = (name) =>
        {
            const d = Object.getOwnPropertyDescriptor(ProximityEffect.prototype, name);
            return typeof d.value==="function" ? "method" : d.set ? "read-write" : "read-only";
        };
        READ_WRITE.forEach(name => expect(kind(name), name).toBe("read-write"));
        READ_ONLY.forEach(name => expect(kind(name), name).toBe("read-only"));
        METHODS.forEach(name => expect(kind(name), name).toBe("method"));
    });

    it("exposes Style objects with only read-only getters", () =>
    {
        const pe = create(makeNode(0, 0));
        pe.addStyle("blur", [0, 1]);
        const proto = Object.getPrototypeOf(pe.styles[0]);
        const names = Object.getOwnPropertyNames(proto).filter(name => name!=="constructor");
        expect(sorted(names)).toEqual(sorted(STYLE_GETTERS));
        names.forEach(name =>
        {
            const d = Object.getOwnPropertyDescriptor(proto, name);
            expect(d.get, name).toBeTypeOf("function");
            expect(d.set, name).toBeUndefined();
        });
    });

    it("matches the type declarations", () =>
    {
        const dts = readFileSync(join(import.meta.dirname, "../src/ProximityEffect.d.ts"), "utf8");
        const member = /^ {4}(?:get |set )?(\w+)[(<]/gm;
        const classBody = dts.slice(dts.indexOf("export default class ProximityEffect"));
        const declared = new Set([...classBody.matchAll(member)].map(m => m[1]));
        declared.delete("constructor");
        declared.delete("addEventListener");
        declared.delete("removeEventListener");
        expect(sorted(declared)).toEqual(sorted([...READ_WRITE, ...READ_ONLY, ...METHODS]));

        const styleBody = dts.slice(dts.indexOf("export interface Style\n"), dts.indexOf("export interface NodeStyleValues"));
        const styleKeys = [...styleBody.matchAll(/^ {4}readonly (\w+):/gm)].map(m => m[1]);
        expect(sorted(styleKeys)).toEqual(sorted(STYLE_GETTERS));

        const dataBody = dts.slice(dts.indexOf("export interface NodeData\n"), dts.indexOf("export interface ProximityEffectEventMap"));
        const dataKeys = [...dataBody.matchAll(/^ {4}(\w+)\??:/gm)].map(m => m[1]);
        expect(sorted(dataKeys)).toEqual(sorted(NODE_DATA_KEYS));
    });
});



describe("node data", () =>
{
    it("is a snapshot of the public fields only", async () =>
    {
        const el = makeNode(50, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);

        // before measuring and drawing, fields without a value are left out
        expect(Object.keys(pe.getNodeData(el))).toEqual(["node", "jitter", "styles"]);
        expect(pe.hasNodeIndexData(0, "center")).toBe(false);
        expect(pe.hasNodeIndexData(0, "jitter")).toBe(true);

        await settle();
        pe.setCoords(0, 0);
        step();
        const data = pe.getNodeData(el);
        expect(sorted(Object.keys(data))).toEqual(sorted(NODE_DATA_KEYS));
        expect(data).toEqual({
            node: el,
            measured: { x: 50, y: 0 },
            center: { x: 50, y: 0 },
            // random(0) can be -0
            jitter: { x: expect.closeTo(0), y: expect.closeTo(0) },
            distance: 0.5,
            lastDelta: 0.5,
            styles: [{ near: 0, far: 100 }],
        });
        for (const key of ["style", "hadStyle", "originals", "scrollsWithPage"])
        {
            expect(pe.getNodeData(el, key), key).toBeUndefined();
            expect(pe.hasNodeIndexData(0, key), key).toBe(false);
        }
    });

    it("can't be used to change the running effect", async () =>
    {
        const el = makeNode(50, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        pe.setCoords(0, 0);
        step();

        const data = pe.getNodeData(el);
        data.center.x = 0;
        data.styles[0].far = 0;
        data.styles.push({ near: 1, far: 1 });
        pe.getNodeIndexData(0, "measured").x = 0;
        pe.getNodeIndexData(0, "jitter").x = 99;

        expect(pe.getNodeData(el)).toEqual({ ...data, center: { x: 50, y: 0 }, styles: [{ near: 0, far: 100 }] });
        pe.setCoords(0, 0);
        pe.update();
        expect(el.style.transform).toBe("translateX(50px)");
    });
});



describe("copies", () =>
{
    it("nodes and styles return copies", () =>
    {
        const a = makeNode(0, 0), b = makeNode(10, 0);
        const pe = create([a, b]);
        pe.addStyle("blur", [0, 1]);
        pe.nodes.pop();
        pe.styles.pop();
        expect(pe.nodes).toEqual([a, b]);
        expect(pe.totalNodes).toBe(2);
        expect(pe.styles).toHaveLength(1);
    });
});



describe("style ids", () =>
{
    it("hasStyle and removeStyle find a style by its id", () =>
    {
        const pe = create(makeNode(0, 0));
        pe.addStyle("blur", [0, 1], { id: "soft" });
        pe.addStyle("blur", [0, 5]);
        expect(pe.hasStyle("soft")).toBe(true);
        expect(pe.removeStyle("soft")).toBe(true);
        expect(pe.styles).toHaveLength(1);
        expect(pe.styles[0].far.value).toBe(5);
        expect(pe.hasStyle("soft")).toBe(false);
        expect(pe.removeStyle("soft")).toBe(false);
    });

    it("hasStyle and removeStyle reject a missing name instead of matching every unnamed style", () =>
    {
        const pe = create(makeNode(0, 0));
        pe.addStyle({ rule: "opacity" }, [1, 0]);
        expect(() => pe.hasStyle()).toThrow(TypeError);
        expect(() => pe.removeStyle()).toThrow(TypeError);
        expect(() => pe.removeStyle(null)).toThrow(TypeError);
        expect(pe.styles).toHaveLength(1);
    });
});



describe("events", () =>
{
    it("are plain, non-bubbling, non-cancelable Events", async () =>
    {
        const pe = create(makeNode(0, 0));
        const seen = [];
        const record = (evt) => seen.push(evt);
        for (const type of ["ready", "redraw", "reflow", "beforeupdate", "wake", "rest"])
        {
            pe.addEventListener(type, record);
        }
        await settle();
        step();
        pe.setCenterPoints();
        // a remeasure that finds a move dispatches reflow
        pe.nodes[0].getBoundingClientRect = () => ({ left: 95, right: 105, top: -5, bottom: 5, width: 10, height: 10 });
        window.dispatchEvent(new Event("resize"));
        step();

        expect(seen.map(evt => evt.type)).toEqual(["ready", "beforeupdate", "redraw", "reflow", "beforeupdate", "redraw", "rest"]);
        for (const evt of seen)
        {
            expect(evt.constructor).toBe(Event);
            expect(evt.bubbles).toBe(false);
            expect(evt.cancelable).toBe(false);
            expect(evt.target).toBe(pe);
        }
    });

    it("update() draws without dispatching redraw", async () =>
    {
        const el = makeNode(50, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        step();
        const redraw = vi.fn();
        pe.addEventListener("redraw", redraw);
        pe.pause();
        pe.setCoords(0, 0);
        pe.update();
        expect(el.style.transform).toBe("translateX(50px)");
        expect(redraw).not.toHaveBeenCalled();
    });
});



describe("rest state", () =>
{
    const LOOP_EVENTS = ["wake", "beforeupdate", "redraw", "rest"];

    function record(pe)
    {
        const seen = [];
        for (const type of LOOP_EVENTS)
        {
            pe.addEventListener(type, () => seen.push(type));
        }
        return seen;
    }

    function runUntilIdle(max = 100)
    {
        for (let i=0; i<max && frames.size>0; i++)
        {
            step();
        }
    }

    it("isn't resting until the first frames settle", async () =>
    {
        const pe = create(makeNode(50, 0));
        pe.addStyle("translateX", [0, 100]);
        const seen = record(pe);
        expect(pe.resting).toBe(false);
        await settle();
        expect(pe.resting).toBe(false);
        runUntilIdle();
        expect(pe.resting).toBe(true);
        expect(seen.at(-1)).toBe("rest");
        expect(seen.filter(type => type==="rest")).toHaveLength(1);
        expect(seen).not.toContain("wake");
    });

    it("dispatches wake, then a beforeupdate and redraw per frame, then rest", async () =>
    {
        const pe = create(makeNode(50, 0), { attack: 0.5, decay: 0.5 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle();
        const seen = record(pe);

        pe.setCoords(0, 0);
        step();
        expect(seen).toEqual(["wake", "beforeupdate", "redraw"]);
        expect(pe.resting).toBe(false);

        // still easing, so no rest yet
        step();
        expect(seen.slice(3)).toEqual(["beforeupdate", "redraw"]);
        expect(pe.resting).toBe(false);

        runUntilIdle();
        expect(seen.at(-1)).toBe("rest");
        expect(pe.resting).toBe(true);
        expect(seen.filter(type => type==="wake")).toHaveLength(1);
        expect(seen.filter(type => type==="rest")).toHaveLength(1);
        expect(seen.filter(type => type==="beforeupdate")).toHaveLength(seen.filter(type => type==="redraw").length);
        expect(frames.size).toBe(0);
    });

    it("doesn't rest while something keeps changing", async () =>
    {
        const pe = create(makeNode(50, 0));
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle();
        const seen = record(pe);
        for (let i=0; i<5; i++)
        {
            pe.setCoords(i*10, 0);
            step();
        }
        expect(seen.filter(type => type==="wake")).toHaveLength(1);
        expect(seen).not.toContain("rest");
        expect(pe.resting).toBe(false);
    });

    it("rests straight after waking when the change moves nothing", async () =>
    {
        const pe = create(makeNode(50, 0));
        pe.addStyle("translateX", [0, 100]);
        pe.setCoords(0, 0);
        await settle();
        runUntilIdle();
        const seen = record(pe);
        pe.setCoords(0, 0);
        step();
        expect(seen).toEqual(["wake", "beforeupdate", "redraw", "rest"]);
        expect(pe.resting).toBe(true);
    });

    it("draws changes made in beforeupdate in the same frame", async () =>
    {
        const el = makeNode(50, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);
        pe.setCoords(0, 0);
        await settle();
        runUntilIdle();
        pe.addEventListener("beforeupdate", () => pe.updateStyle("translateX", [0, 200]), { once: true });
        pe.setCoords(0, 0);
        step();
        expect(el.style.transform).toBe("translateX(100px)");
        // the change kept it awake, so the next frame confirms it has settled
        expect(pe.resting).toBe(false);
        runUntilIdle();
        expect(pe.resting).toBe(true);
    });

    it("isn't changed by pause() and resume()", async () =>
    {
        const pe = create(makeNode(50, 0), { attack: 0.5, decay: 0.5 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle();
        const seen = record(pe);

        pe.pause();
        pe.resume();
        runUntilIdle();
        expect(seen).toEqual([]);
        expect(pe.resting).toBe(true);

        // paused mid-ease: resuming carries on without a second wake
        pe.setCoords(0, 0);
        step();
        pe.pause();
        expect(pe.resting).toBe(false);
        pe.resume();
        runUntilIdle();
        expect(seen.filter(type => type==="wake")).toHaveLength(1);
        expect(seen.filter(type => type==="rest")).toHaveLength(1);

        // a change made while paused is drawn, with a wake, on resume
        pe.pause();
        pe.setCoords(100, 0);
        step();
        expect(seen.filter(type => type==="wake")).toHaveLength(1);
        pe.resume();
        step();
        expect(seen.filter(type => type==="wake")).toHaveLength(2);
    });

    it("rests while a followed target stays still, and wakes when it moves", async () =>
    {
        let at = 0;
        const target = makeNode(0, 0);
        target.getBoundingClientRect = () => ({ left: at-5, right: at+5, top: -5, bottom: 5, width: 10, height: 10 });
        const pe = create(makeNode(50, 0), { target });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        for (let i=0; i<5; i++)
        {
            step();
        }
        expect(pe.resting).toBe(true);
        const seen = record(pe);

        step();
        step();
        expect(seen).toEqual([]);
        expect(frames.size).toBe(1);

        at = 20;
        step();
        expect(seen.slice(0, 3)).toEqual(["wake", "beforeupdate", "redraw"]);
        step();
        expect(seen.at(-1)).toBe("rest");
    });

    it("update() dispatches nothing and leaves resting alone", async () =>
    {
        const pe = create(makeNode(50, 0));
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle();
        const seen = record(pe);
        pe.pause();
        pe.setCoords(0, 0);
        pe.update();
        expect(seen).toEqual([]);
        expect(pe.resting).toBe(true);
    });

    it("stops dispatching once a listener destroys the instance", async () =>
    {
        const pe = create(makeNode(50, 0));
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle();
        const seen = record(pe);
        pe.addEventListener("beforeupdate", () => pe.destroy());
        pe.setCoords(0, 0);
        step();
        expect(seen).toEqual(["wake", "beforeupdate"]);
        expect(frames.size).toBe(0);
    });
});
