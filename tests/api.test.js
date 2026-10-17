// Pins the 4.0 public API, so that any change to it is deliberate: adding,
// removing or renaming a member means updating the lists here, the type
// declarations and the CHANGELOG together.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ProximityEffect from "../src/ProximityEffect.js";


const READ_WRITE = [
    "target", "nodes", "threshold", "runoff", "invert", "zIndex", "attack", "decay",
    "offsetX", "offsetY", "jitter", "jitterX", "jitterY", "jitterMethod", "direction",
    "FPS", "tolerance", "reducedMotion",
];

const READ_ONLY = [
    "totalNodes", "styles", "boundary", "motionReduced", "pointer", "paused", "destroyed",
];

const METHODS = [
    "addStyle", "hasStyleProp", "removeStyleProp", "distanceFrom", "distanceFromIndex",
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
    it("hasStyleProp and removeStyleProp find a style by its id", () =>
    {
        const pe = create(makeNode(0, 0));
        pe.addStyle("blur", [0, 1], { id: "soft" });
        pe.addStyle("blur", [0, 5]);
        expect(pe.hasStyleProp("soft")).toBe(true);
        expect(pe.removeStyleProp("soft")).toBe(true);
        expect(pe.styles).toHaveLength(1);
        expect(pe.styles[0].far.value).toBe(5);
        expect(pe.hasStyleProp("soft")).toBe(false);
        expect(pe.removeStyleProp("soft")).toBe(false);
    });
});



describe("events", () =>
{
    it("are plain, non-bubbling, non-cancelable Events", async () =>
    {
        const pe = create(makeNode(0, 0));
        const seen = [];
        const record = (evt) => seen.push(evt);
        for (const type of ["ready", "redraw", "reflow"])
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

        expect(seen.map(evt => evt.type)).toEqual(["ready", "redraw", "reflow", "redraw"]);
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
