import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ProximityEffect from "../src/ProximityEffect.js";


// A fake animation clock: frames only run when step() is called.
let frames, frameId, now;

function step(ms = 16)
{
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(cb => cb(now));
}

// A node whose layout box is centred on (x, y).
function makeNode(x, y, size = 10)
{
    const el = document.createElement("div");
    const h = size/2;
    el.getBoundingClientRect = () => ({ left: x-h, right: x+h, top: y-h, bottom: y+h, width: size, height: size, x: x-h, y: y-h });
    document.body.append(el);
    return el;
}

function movePointer(x, y)
{
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y }));
}

// construction defers init to a microtask
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function translateOf(el)
{
    const m = el.style.transform.match(/translateX\(([-\d.e]+)px\)/);
    return m ? Number(m[1]) : null;
}


let instances;

function create(nodes, params)
{
    const pe = new ProximityEffect(nodes, params);
    instances.push(pe);
    return pe;
}


beforeEach(() =>
{
    frames = new Map();
    frameId = 0;
    now = 0;
    instances = [];
    vi.stubGlobal("requestAnimationFrame", cb => { frames.set(++frameId, cb); return frameId; });
    vi.stubGlobal("cancelAnimationFrame", id => { frames.delete(id); });
    document.body.innerHTML = "";
});

afterEach(() =>
{
    instances.forEach(pe => pe.destroy());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});



describe("initialisation", () =>
{
    it("initialises when created after the page has loaded", async () =>
    {
        expect(document.readyState).toBe("complete");
        const pe = create(makeNode(0, 0));
        const ready = vi.fn();
        pe.addEventListener("ready", ready);
        await settle();
        expect(ready).toHaveBeenCalledOnce();
        expect(frames.size).toBe(1);
    });

    it("waits for the load event while the page is still loading", async () =>
    {
        vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
        const pe = create(makeNode(0, 0));
        const ready = vi.fn();
        pe.addEventListener("ready", ready);
        await settle();
        expect(ready).not.toHaveBeenCalled();
        window.dispatchEvent(new Event("load"));
        expect(ready).toHaveBeenCalledOnce();
    });

    it("never initialises if destroyed before load", async () =>
    {
        vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
        const pe = create(makeNode(0, 0));
        const ready = vi.fn();
        pe.addEventListener("ready", ready);
        pe.destroy();
        window.dispatchEvent(new Event("load"));
        await settle();
        expect(ready).not.toHaveBeenCalled();
        expect(frames.size).toBe(0);
    });

    it("does not dispatch a synthetic mousemove on the document", async () =>
    {
        const listener = vi.fn();
        document.addEventListener("mousemove", listener);
        create(makeNode(0, 0));
        await settle();
        document.removeEventListener("mousemove", listener);
        expect(listener).not.toHaveBeenCalled();
    });
});



describe("nodes", () =>
{
    it("accepts a NodeList, an HTMLCollection, an array or a single Element", () =>
    {
        const a = makeNode(0, 0), b = makeNode(10, 10);
        expect(create(document.querySelectorAll("div")).nodes).toEqual([a, b]);
        expect(create(document.getElementsByTagName("div")).nodes).toEqual([a, b]);
        expect(create([a, b, a]).nodes).toEqual([a, b]);
        expect(create(a).nodes).toEqual([a]);
    });

    it("rejects other values", () =>
    {
        expect(() => new ProximityEffect()).toThrow(TypeError);
        expect(() => new ProximityEffect("div")).toThrow(TypeError);
        expect(() => new ProximityEffect([{}])).toThrow(TypeError);
        expect(() => new ProximityEffect([])).toThrow(RangeError);
        expect(() => new ProximityEffect(document.querySelectorAll("nothing"))).toThrow(RangeError);
    });

    it("gives nodes that are dropped their original inline style back", async () =>
    {
        const a = makeNode(0, 0), b = makeNode(500, 0);
        a.style.color = "red";
        const pe = create([a, b]);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        step();
        expect(a.style.transform).not.toBe("");
        pe.nodes = [b];
        expect(a.style.cssText).toBe("color: red;");
    });

    it("builds style and jitter data for nodes added later", async () =>
    {
        const pe = create(makeNode(0, 0), { jitter: 20 });
        pe.addStyle("translateX", [0, 100]);
        const c = makeNode(0, 0);
        pe.nodes = [c];
        expect(pe.getNodeData(c, "styles")).toEqual([{ near: 0, far: 100 }]);
        expect(pe.getNodeData(c, "jitter")).toEqual({ x: expect.any(Number), y: expect.any(Number) });
        await settle();
        movePointer(0, 0);
        expect(() => step()).not.toThrow();
    });
});



describe("params", () =>
{
    it("does not store or change the caller's params object", () =>
    {
        const params = { threshold: 5 };
        const a = create(makeNode(0, 0), params);
        const b = create(makeNode(0, 0), params);
        a.threshold = 50;
        a.runoff = 0;
        expect(params).toEqual({ threshold: 5 });
        expect(b.threshold).toBe(5);
    });

    it("ignores inherited params", () =>
    {
        const params = Object.create({ threshold: 99 });
        expect(create(makeNode(0, 0), params).threshold).toBe(0);
    });

    it("defaults runoff to 100", () =>
    {
        expect(create(makeNode(0, 0)).runoff).toBe(100);
    });

    it("rejects a non-object params argument", () =>
    {
        expect(() => new ProximityEffect(makeNode(0, 0), 5)).toThrow(TypeError);
    });

    it("rejects an invalid direction", () =>
    {
        expect(() => create(makeNode(0, 0), { direction: "diagonal" })).toThrow(RangeError);
    });
});



describe("jitter", () =>
{
    it("is calculated from the constructor params", () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(1);
        const pe = create(makeNode(0, 0), { jitter: 10, jitterX: 10 });
        // uniform: (1 - 0.5) * range
        expect(pe.getNodeIndexData(0, "jitter")).toEqual({ x: 10, y: 5 });
    });

    it("validates the jitter method", () =>
    {
        const pe = create(makeNode(0, 0));
        expect(pe.jitterMethod).toBe("uniform");
        expect(() => { pe.jitterMethod = "random"; }).toThrow(RangeError);
        expect(() => create(makeNode(0, 0), { jitterMethod: "bogus" })).toThrow(RangeError);
        pe.jitterMethod = "gaussian";
        expect(pe.jitterMethod).toBe("gaussian");
    });

    it("moves the node centres", async () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(1);
        const pe = create(makeNode(100, 100), { jitter: 10 });
        await settle();
        expect(pe.getNodeIndexData(0, "center")).toEqual({ x: 105, y: 105 });
    });
});



describe("distance and easing", () =>
{
    it("getNodeData and distanceFrom find a node", async () =>
    {
        const a = makeNode(0, 0), b = makeNode(50, 0);
        const pe = create([a, b], { runoff: 100 });
        await settle();
        movePointer(0, 0);
        step();
        expect(pe.distanceFrom(a)).toBe(0);
        expect(pe.distanceFrom(b)).toBe(0.5);
        expect(pe.getNodeData(b).node).toBe(b);
        expect(() => pe.distanceFrom(document.body)).toThrow(RangeError);
    });

    it("rests at the far value before the pointer has moved", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        step();
        expect(pe.pointer).toBeNull();
        expect(translateOf(el)).toBe(100);
    });

    it("starts the first frame at the current distance, not from null", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { attack: 0.5, decay: 0.5 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        step();
        expect(pe.getNodeIndexData(0, "lastDelta")).toBe(0);
        expect(translateOf(el)).toBe(0);
    });

    it("primeDistances starts from the far value and eases in", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { attack: 0.5, primeDistances: true });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        step();
        expect(translateOf(el)).toBe(50);
        step();
        expect(translateOf(el)).toBe(25);
    });

    it("a runoff of 0 gives a hard edge instead of NaN", async () =>
    {
        const near = makeNode(0, 0), edge = makeNode(10, 0), far = makeNode(11, 0);
        const pe = create([near, edge, far], { threshold: 10, runoff: 0 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        step();
        expect([translateOf(near), translateOf(edge), translateOf(far)]).toEqual([0, 0, 100]);
    });

    it("reads data-offsetx and data-offsety as numbers", async () =>
    {
        const el = makeNode(100, 0);
        el.dataset.offsetx = "50";
        el.dataset.offsety = "nonsense";
        const pe = create(el);
        await settle();
        movePointer(50, 0);
        step();
        expect(pe.distanceFrom(el)).toBe(0);
    });

    it("draws without any styles", async () =>
    {
        const pe = create(makeNode(0, 0));
        await settle();
        movePointer(0, 0);
        expect(() => step()).not.toThrow();
        expect(pe.styles).toEqual([]);
    });
});



describe("target and coords", () =>
{
    it("rejects a target that isn't an Element", () =>
    {
        const pe = create(makeNode(0, 0));
        expect(() => { pe.target = {}; }).toThrow(TypeError);
        expect(() => { pe.target = "div"; }).toThrow(TypeError);
        pe.target = makeNode(5, 5);
        pe.clearTarget();
        expect(pe.target).toBeNull();
    });

    it("tracks a target element", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { target: makeNode(0, 50) });
        await settle();
        step();
        expect(pe.distanceFrom(el)).toBe(0.5);
    });

    it("setCoords validates and takes priority", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        expect(() => pe.setCoords("1", 2)).toThrow(TypeError);
        expect(() => pe.setCoords(NaN, 2)).toThrow(RangeError);
        expect(() => pe.setCoords(1, Infinity)).toThrow(RangeError);
        expect(pe.getCoords()).toBeNull();
        pe.setCoords(30, 40);
        expect(pe.getCoords()).toEqual({ x: 30, y: 40 });
        await settle();
        movePointer(500, 500);
        step();
        expect(pe.distanceFrom(el)).toBe(0.5);
        // the loop keeps running with coords set
        expect(frames.size).toBe(1);
        pe.clearCoords();
        expect(pe.getCoords()).toBeNull();
    });
});



describe("styles", () =>
{
    it("removeStyleProp removes every match and keeps the rest aligned", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 10]);
        pe.addStyle("scale", [1, 2]);
        pe.addStyle("translateX", [0, 20]);
        pe.addStyle("rotate", [0, 90]);

        expect(pe.removeStyleProp("translateX")).toBe(true);
        expect(pe.hasStyleProp("translateX")).toBe(false);
        expect(pe.styles.map(s => s.name)).toEqual(["scale", "rotate"]);
        expect(pe.getNodeData(el, "styles")).toEqual([{ near: 1, far: 2 }, { near: 0, far: 90 }]);
        expect(pe.removeStyleProp("translateX")).toBe(false);

        await settle();
        step();
        expect(el.style.transform).toBe("scale(2) rotate(90deg)");
    });

    it("finds presets by name, including ones whose func differs", () =>
    {
        const pe = create(makeNode(0, 0));
        pe.addStyle("hueRotate", [0, 90]);
        expect(pe.hasStyleProp("hueRotate")).toBe(true);
        expect(pe.hasStyleProp("hue-rotate")).toBe(true);
        expect(pe.removeStyleProp("hueRotate")).toBe(true);
        expect(pe.styles).toEqual([]);
    });

    it("restores properties that nothing animates any more", async () =>
    {
        const el = makeNode(0, 0);
        el.style.transform = "rotate(5deg)";
        el.style.zIndex = "3";
        const pe = create(el);
        pe.addStyle("translateX", [0, 10]);
        await settle();
        step();
        expect(el.style.transform).toBe("translateX(10px)");
        pe.removeStyleProp("translateX");
        expect(el.style.transform).toBe("rotate(5deg)");
        expect(el.style.zIndex).toBe("3");
    });

    it("clamps scattered values to the style's range", () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(1);
        const pe = create(makeNode(0, 0));
        pe.addStyle("opacity", [{ value: 100, scatter: 50 }, 0]);
        expect(pe.getNodeIndexData(0, "styles")[0].near).toBe(100);
    });
});



describe("lifecycle", () =>
{
    it("destroy() stops the loop, removes listeners and restores styles", async () =>
    {
        const el = makeNode(0, 0);
        el.style.color = "blue";
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        step();
        expect(el.style.transform).not.toBe("");

        const reflow = vi.fn();
        pe.addEventListener("reflow", reflow);
        pe.destroy();

        expect(pe.destroyed).toBe(true);
        expect(frames.size).toBe(0);
        expect(el.style.cssText).toBe("color: blue;");
        movePointer(99, 99);
        expect(pe.pointer).toEqual({ x: 0, y: 0 });
        window.dispatchEvent(new Event("scroll"));
        expect(reflow).not.toHaveBeenCalled();

        expect(() => pe.destroy()).not.toThrow();
        expect(() => pe.resume()).toThrow(Error);
        pe.update();
        expect(el.style.cssText).toBe("color: blue;");
    });

    it("pause() and resume() stop and restart the loop", async () =>
    {
        const pe = create(makeNode(0, 0));
        await settle();
        expect(frames.size).toBe(1);
        pe.pause();
        expect(pe.paused).toBe(true);
        expect(frames.size).toBe(0);
        pe.resume();
        expect(pe.paused).toBe(false);
        expect(frames.size).toBe(1);
        pe.resume();
        expect(frames.size).toBe(1);
    });

    it("stays paused through initialisation if paused first", async () =>
    {
        const pe = create(makeNode(0, 0));
        pe.pause();
        await settle();
        expect(frames.size).toBe(0);
        pe.resume();
        expect(frames.size).toBe(1);
    });

    it("multiple instances keep their listeners separate", async () =>
    {
        const a = create(makeNode(0, 0));
        const b = create(makeNode(0, 0));
        await settle();
        a.destroy();
        movePointer(7, 8);
        expect(a.pointer).toBeNull();
        expect(b.pointer).toEqual({ x: 7, y: 8 });
    });

    it("FPS throttles the one animation clock instead of adding a timer", async () =>
    {
        const setInterval = vi.spyOn(window, "setInterval");
        const pe = create(makeNode(0, 0), { FPS: 30 });
        const redraw = vi.fn();
        pe.addEventListener("redraw", redraw);
        await settle();
        for (let i=0; i<6; i++)
        {
            step(1000/60);
        }
        expect(redraw).toHaveBeenCalledTimes(3);
        expect(setInterval).not.toHaveBeenCalled();
        expect(frames.size).toBe(1);

        pe.FPS = null;
        step();
        step();
        expect(redraw).toHaveBeenCalledTimes(5);
    });

    it("follows the screen refresh for falsy FPS values and rejects invalid ones", () =>
    {
        const pe = create(makeNode(0, 0), { FPS: 30 });
        for (const value of [0, null, undefined, false])
        {
            pe.FPS = 30;
            pe.FPS = value;
            expect(pe.FPS).toBeNull();
        }
        pe.FPS = 30;
        expect(() => { pe.FPS = "30"; }).toThrow(TypeError);
        for (const value of [-5, NaN, Infinity])
        {
            expect(() => { pe.FPS = value; }).toThrow(RangeError);
        }
        expect(pe.FPS).toBe(30);
    });
});



describe("hardening", () =>
{
    const NUMERIC = ["threshold", "runoff", "attack", "decay", "accuracy", "offsetX", "offsetY", "jitter", "jitterX", "jitterY"];

    it("rejects non-numbers and non-finite numbers in every numeric setter, leaving the value unchanged", () =>
    {
        const pe = create(makeNode(0, 0));
        for (const key of NUMERIC)
        {
            const before = pe[key];
            expect(() => { pe[key] = "5"; }, key).toThrow(TypeError);
            expect(() => { pe[key] = null; }, key).toThrow(TypeError);
            expect(() => { pe[key] = NaN; }, key).toThrow(RangeError);
            expect(() => { pe[key] = Infinity; }, key).toThrow(RangeError);
            expect(() => { pe[key] = -Infinity; }, key).toThrow(RangeError);
            expect(pe[key], key).toBe(before);
        }
    });

    it("rejects invalid numeric params at construction", () =>
    {
        for (const key of NUMERIC)
        {
            expect(() => new ProximityEffect(makeNode(0, 0), { [key]: "5" }), key).toThrow(TypeError);
            expect(() => new ProximityEffect(makeNode(0, 0), { [key]: NaN }), key).toThrow(RangeError);
        }
    });

    it("clamps numbers that are out of range", () =>
    {
        const pe = create(makeNode(0, 0), { threshold: -5, runoff: -1, attack: 2, decay: -1, accuracy: 1000, jitter: -3 });
        expect(pe.threshold).toBe(0);
        expect(pe.runoff).toBe(0);
        expect(pe.attack).toBe(1);
        expect(pe.decay).toBe(0);
        expect(pe.accuracy).toBe(20);
        expect(pe.jitter).toBe(0);
    });

    it("requires real booleans for invert, zIndex and primeDistances", () =>
    {
        const pe = create(makeNode(0, 0));
        expect(() => { pe.invert = "false"; }).toThrow(TypeError);
        expect(() => { pe.zIndex = 1; }).toThrow(TypeError);
        expect(pe.invert).toBe(false);
        expect(() => new ProximityEffect(makeNode(0, 0), { primeDistances: "yes" })).toThrow(TypeError);
        expect(() => new ProximityEffect(makeNode(0, 0), { invert: 0 })).toThrow(TypeError);
    });

    it("leaves the style stack unchanged when addStyle fails", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 10]);
        expect(() => pe.addStyle({ rule: "cssText", unit: "px" }, [0, 1])).toThrow(RangeError);
        expect(() => pe.addStyle("blur", [0, { value: 1, scatter: 1, scatterMethod: "bogus" }])).toThrow(RangeError);
        expect(pe.styles).toHaveLength(1);
        expect(pe.getNodeIndexData(0, "styles")).toHaveLength(1);
        await settle();
        step();
        expect(el.style.transform).toBe("translateX(10px)");
    });

    it("writes kebab-case custom properties", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle({ rule: "letter-spacing", unit: "px" }, [0, 4]);
        await settle();
        step();
        expect(el.style.letterSpacing).toBe("4px");
    });

    it("validates node indexes and reads only own data properties", () =>
    {
        const pe = create([makeNode(0, 0), makeNode(10, 0)]);
        expect(() => pe.getNodeIndexData("0", "distance")).toThrow(TypeError);
        for (const i of [-1, 2, 0.5, NaN])
        {
            expect(() => pe.getNodeIndexData(i, "distance"), String(i)).toThrow(RangeError);
            expect(() => pe.hasNodeIndexData(i, "distance"), String(i)).toThrow(RangeError);
        }
        expect(() => pe.distanceFromIndex(5)).toThrow(RangeError);
        expect(pe.getNodeIndexData(1, "constructor")).toBeUndefined();
        expect(pe.getNodeData(pe.nodes[0], "__proto__")).toBeUndefined();
        expect(pe.getNodeIndexData(0).node).toBe(pe.nodes[0]);
    });

    it("ignores unusable data-offsetx and data-offsety values", async () =>
    {
        const el = makeNode(0, 0);
        el.dataset.offsetx = "Infinity";
        el.dataset.offsety = "abc";
        const pe = create(el, { threshold: 0, runoff: 100 });
        await settle();
        pe.setCoords(50, 0);
        step();
        expect(pe.distanceFrom(el)).toBe(0.5);
    });
});



describe("zIndex", () =>
{
    it("leaves z-index alone by default", async () =>
    {
        const el = makeNode(0, 0);
        el.style.zIndex = "7";
        const pe = create(el);
        pe.addStyle("translateX", [0, 10]);
        await settle();
        pe.setCoords(0, 0);
        step();
        expect(pe.zIndex).toBe(false);
        expect(el.style.zIndex).toBe("7");
    });

    it("sets z-index from distance when enabled, and restores it when turned off", async () =>
    {
        const near = makeNode(0, 0);
        const far  = makeNode(200, 0);
        far.style.zIndex = "7";
        const pe = create([near, far], { zIndex: true, runoff: 100 });
        pe.addStyle("translateX", [0, 10]);
        await settle();
        pe.setCoords(0, 0);
        step();
        expect(near.style.zIndex).toBe("1000");
        expect(far.style.zIndex).toBe("0");

        pe.zIndex = false;
        expect(near.style.zIndex).toBe("");
        expect(far.style.zIndex).toBe("7");
        step();
        expect(far.style.zIndex).toBe("7");
    });

    it("restores z-index when the last style is removed", async () =>
    {
        const el = makeNode(0, 0);
        el.style.zIndex = "3";
        const pe = create(el, { zIndex: true });
        pe.addStyle("translateX", [0, 10]);
        await settle();
        pe.setCoords(0, 0);
        step();
        expect(el.style.zIndex).toBe("1000");
        pe.removeStyleProp("translateX");
        expect(el.style.zIndex).toBe("3");
    });
});
