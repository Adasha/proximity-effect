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

// A layout box centred on (x, y).
function boxAt(x, y, size = 10)
{
    const h = size/2;
    return { left: x-h, right: x+h, top: y-h, bottom: y+h, width: size, height: size, x: x-h, y: y-h };
}

// A node whose layout box is centred on (x, y).
function makeNode(x, y, size = 10)
{
    const el = document.createElement("div");
    el.getBoundingClientRect = () => boxAt(x, y, size);
    document.body.append(el);
    return el;
}

function movePointer(x, y, init = {})
{
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, isPrimary: true, pointerType: "mouse", ...init }));
}

// A stand-in for matchMedia("(prefers-reduced-motion: reduce)") that can be flipped.
function fakeMotionQuery(matches)
{
    const query = new EventTarget();
    query.matches = matches;
    query.media = "(prefers-reduced-motion: reduce)";
    query.set = (value) =>
    {
        query.matches = value;
        const evt = new Event("change");
        evt.matches = value;
        query.dispatchEvent(evt);
    };
    vi.stubGlobal("matchMedia", (media) => { expect(media).toBe(query.media); return query; });
    return query;
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

    it("easing snaps to the target once within the tolerance", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { attack: 0.5, tolerance: 0.01, primeDistances: true });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        // halving from 1: 1/64 is still outside the tolerance, 1/128 is inside
        for (let i=0; i<6; i++)
        {
            step();
        }
        expect(pe.getNodeIndexData(0, "lastDelta")).toBe(1/64);
        step();
        expect(pe.getNodeIndexData(0, "lastDelta")).toBe(0);
        expect(translateOf(el)).toBe(0);
    });

    it("eased values are not quantised", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { attack: 0.3, primeDistances: true });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        step();
        step();
        expect(pe.getNodeIndexData(0, "lastDelta")).toBeCloseTo(0.49, 10);
    });

    it("an attack of 0 never moves", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { attack: 0, primeDistances: true });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        step();
        step();
        expect(translateOf(el)).toBe(100);
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
    it("removeStyle removes every match and keeps the rest aligned", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 10]);
        pe.addStyle("scale", [1, 2]);
        pe.addStyle("translateX", [0, 20]);
        pe.addStyle("rotate", [0, 90]);

        expect(pe.removeStyle("translateX")).toBe(true);
        expect(pe.hasStyle("translateX")).toBe(false);
        expect(pe.styles.map(s => s.name)).toEqual(["scale", "rotate"]);
        expect(pe.getNodeData(el, "styles")).toEqual([{ near: 1, far: 2 }, { near: 0, far: 90 }]);
        expect(pe.removeStyle("translateX")).toBe(false);

        await settle();
        step();
        expect(el.style.transform).toBe("scale(2) rotate(90deg)");
    });

    it("finds presets by name, including ones whose func differs", () =>
    {
        const pe = create(makeNode(0, 0));
        pe.addStyle("hueRotate", [0, 90]);
        expect(pe.hasStyle("hueRotate")).toBe(true);
        expect(pe.hasStyle("hue-rotate")).toBe(true);
        expect(pe.removeStyle("hueRotate")).toBe(true);
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
        pe.removeStyle("translateX");
        expect(el.style.transform).toBe("rotate(5deg)");
        expect(el.style.zIndex).toBe("3");
    });

    it("treats camelCase and kebab-case spellings of a property as one", async () =>
    {
        const el = makeNode(0, 0);
        el.style.letterSpacing = "1px";
        const pe = create(el);
        pe.addStyle({ rule: "letter-spacing", unit: "px" }, [0, 4], { id: "a" });
        pe.addStyle({ rule: "letterSpacing", unit: "px" }, [0, 2]);
        await settle();
        step();
        expect(el.style.letterSpacing).toBe("2px");
        // the other spelling still animates it, so it isn't restored
        pe.removeStyle("a");
        expect(el.style.letterSpacing).toBe("2px");
    });

    it("combines functions written to one property under different spellings", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle({ rule: "-webkit-filter", func: "blur", unit: "px" }, [0, 3]);
        pe.addStyle({ rule: "webkitFilter", func: "brightness", unit: "%" }, [100, 50]);
        await settle();
        step();
        // written with the first style's spelling
        expect(el.style["-webkit-filter"]).toBe("blur(3px) brightness(50%)");
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
        document.dispatchEvent(new Event("scroll"));
        window.dispatchEvent(new Event("resize"));
        step();
        expect(reflow).not.toHaveBeenCalled();

        expect(() => pe.destroy()).not.toThrow();
        expect(() => pe.resume()).toThrow(Error);
        // nothing can touch the nodes or start listening again
        expect(() => { pe.nodes = [el, makeNode(0, 0)]; }).toThrow(Error);
        expect(() => pe.addStyle("blur", [0, 1])).toThrow(Error);
        expect(() => pe.removeStyle("translateX")).toThrow(Error);
        expect(() => pe.setCenterPoints()).toThrow(Error);
        expect(pe.nodes).toEqual([el]);
        expect(pe.styles).toHaveLength(1);
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
            movePointer(i*10, 0);
            step(1000/60);
        }
        expect(redraw).toHaveBeenCalledTimes(3);
        expect(setInterval).not.toHaveBeenCalled();
        expect(frames.size).toBe(1);

        pe.FPS = null;
        movePointer(100, 0);
        step();
        movePointer(110, 0);
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
    const NUMERIC = ["threshold", "runoff", "attack", "decay", "tolerance", "offsetX", "offsetY", "jitter", "jitterX", "jitterY"];

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
        const pe = create(makeNode(0, 0), { threshold: -5, runoff: -1, attack: 2, decay: -1, tolerance: 5, jitter: -3 });
        expect(pe.threshold).toBe(0);
        expect(pe.runoff).toBe(0);
        expect(pe.attack).toBe(1);
        expect(pe.decay).toBe(0);
        expect(pe.tolerance).toBe(1);
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

    it("doesn't touch the nodes when turned off after destroy()", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { zIndex: true });
        pe.addStyle("translateX", [0, 10]);
        await settle();
        step();
        pe.destroy();
        el.style.zIndex = "5";
        pe.zIndex = false;
        expect(el.style.zIndex).toBe("5");
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
        pe.removeStyle("translateX");
        expect(el.style.zIndex).toBe("3");
    });
});



describe("perspective", () =>
{
    it("puts perspective() in front of the transform functions", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { perspective: 500 });
        pe.addStyle("rotateX", [45, 0]);
        pe.addStyle("translateZ", [20, 0]);
        await settle();
        pe.setCoords(0, 0);
        step();
        expect(pe.perspective).toBe(500);
        expect(el.style.transform).toBe("perspective(500px) rotateX(45deg) translateZ(20px)");
    });

    it("is left out of other properties, and off by default", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { perspective: 500 });
        pe.addStyle("blur", [4, 0]);
        await settle();
        step();
        expect(el.style.filter).toBe("blur(0px)");
        expect(el.style.transform).toBe("");

        const other = makeNode(0, 0);
        const plain = create(other);
        plain.addStyle("translateZ", [20, 0]);
        await settle();
        step();
        expect(plain.perspective).toBeNull();
        expect(other.style.transform).toBe("translateZ(0px)");
    });

    it("rewrites resting nodes when it changes, and turns off for falsy values", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("translateZ", [20, 0]);
        await settle();
        step();
        pe.perspective = 300;
        step();
        expect(el.style.transform).toBe("perspective(300px) translateZ(0px)");

        for (const value of [null, undefined, false, 0])
        {
            pe.perspective = 300;
            pe.perspective = value;
            expect(pe.perspective).toBeNull();
        }
        step();
        expect(el.style.transform).toBe("translateZ(0px)");
    });

    it("rejects invalid values and keeps the old one", () =>
    {
        const pe = create(makeNode(0, 0), { perspective: 400 });
        expect(() => { pe.perspective = "400"; }).toThrow(TypeError);
        for (const value of [-1, NaN, Infinity])
        {
            expect(() => { pe.perspective = value; }).toThrow(RangeError);
        }
        expect(pe.perspective).toBe(400);
        expect(() => create(makeNode(0, 0), { perspective: -5 })).toThrow(RangeError);
    });
});



describe("perspectiveOrigin", () =>
{
    // a parent at (left, top), size w x h, holding nodes centred on the given points
    function group(left, top, w, h, points)
    {
        const parent = document.createElement("div");
        parent.getBoundingClientRect = () => ({ left, top, right: left+w, bottom: top+h, width: w, height: h, x: left, y: top });
        document.body.append(parent);
        const nodes = points.map(([x, y]) => { const el = makeNode(x, y); parent.append(el); return el; });
        return { parent, nodes };
    }

    it("puts the parent's perspective-origin at the centre of the nodes", async () =>
    {
        // nodes span 0-100 x 0-50, in the top-left of a 400 x 1000 parent
        const { parent, nodes } = group(0, 0, 400, 1000, [[5, 5], [95, 45]]);
        parent.style.perspectiveOrigin = "10px 20px";
        const pe = create(nodes, { perspectiveOrigin: true });
        expect(parent.style.perspectiveOrigin).toBe("10px 20px");
        await settle();
        expect(pe.perspectiveOrigin).toBe(true);
        expect(parent.style.perspectiveOrigin).toBe("12.5% 2.5%");

        pe.perspectiveOrigin = false;
        expect(parent.style.perspectiveOrigin).toBe("10px 20px");
    });

    it("follows the nodes when they're measured again", async () =>
    {
        const { parent, nodes } = group(0, 0, 400, 400, [[100, 100]]);
        const pe = create(nodes, { perspectiveOrigin: true });
        await settle();
        expect(parent.style.perspectiveOrigin).toBe("25% 25%");
        nodes[0].getBoundingClientRect = () => boxAt(200, 300);
        pe.setCenterPoints();
        expect(parent.style.perspectiveOrigin).toBe("50% 75%");
    });

    it("leaves parents alone by default, and gives the parent back on destroy()", async () =>
    {
        const { parent, nodes } = group(0, 0, 400, 400, [[100, 100]]);
        const pe = create(nodes);
        await settle();
        expect(pe.perspectiveOrigin).toBe(false);
        expect(parent.style.perspectiveOrigin).toBe("");

        pe.perspectiveOrigin = true;
        step();
        expect(parent.style.perspectiveOrigin).toBe("25% 25%");
        pe.destroy();
        expect(parent.getAttribute("style")).toBe("");
        pe.perspectiveOrigin = false;
        pe.perspectiveOrigin = true;
        expect(parent.style.perspectiveOrigin).toBe("");
    });

    it("warns and sets nothing when the nodes have different parents", async () =>
    {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const a = group(0, 0, 400, 400, [[100, 100]]),
              b = group(0, 0, 400, 400, [[300, 300]]);
        const pe = create([...a.nodes, ...b.nodes], { perspectiveOrigin: true });
        await settle();
        step();
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toMatch(/perspectiveOrigin/);
        expect(a.parent.style.perspectiveOrigin).toBe("");
        expect(b.parent.style.perspectiveOrigin).toBe("");

        // narrowing the nodes to one parent starts using it
        pe.nodes = b.nodes;
        step();
        expect(b.parent.style.perspectiveOrigin).toBe("75% 75%");
        // and moving to another gives the first one back
        pe.nodes = a.nodes;
        expect(b.parent.style.perspectiveOrigin).toBe("");
        step();
        expect(a.parent.style.perspectiveOrigin).toBe("25% 25%");
        expect(warn).toHaveBeenCalledOnce();
    });

    it("requires a boolean", () =>
    {
        const pe = create(makeNode(0, 0));
        expect(() => { pe.perspectiveOrigin = 1; }).toThrow(TypeError);
        expect(pe.perspectiveOrigin).toBe(false);
    });
});



describe("performance", () =>
{
    // settle the loop: draw frames until it stops asking for more
    function runUntilIdle(limit = 100)
    {
        let count = 0;
        while (frames.size>0 && count<limit)
        {
            step();
            count++;
        }
        return count;
    }

    it("stops the loop once every node has settled, and wakes on pointer movement", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { attack: 0.5, decay: 0.5 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(1000, 0);
        runUntilIdle();
        movePointer(0, 0);
        const count = runUntilIdle();
        expect(count).toBeGreaterThan(2);
        expect(count).toBeLessThan(100);
        expect(frames.size).toBe(0);
        expect(translateOf(el)).toBe(0);

        movePointer(50, 0);
        expect(frames.size).toBe(1);
        runUntilIdle();
        expect(translateOf(el)).toBe(50);
    });

    it("draws no frames while idle", async () =>
    {
        const pe = create(makeNode(0, 0));
        const redraw = vi.fn();
        pe.addEventListener("redraw", redraw);
        await settle();
        runUntilIdle();
        redraw.mockClear();
        step();
        step();
        expect(redraw).not.toHaveBeenCalled();
    });

    it("wakes when a setting that changes the output is set", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el, { runoff: 100 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        pe.setCoords(50, 0);
        runUntilIdle();
        expect(translateOf(el)).toBe(50);

        const changes = [
            [() => { pe.threshold = 25; }, 25],
            [() => { pe.runoff = 50; }, 50],
            [() => { pe.invert = true; }, 50],
            [() => { pe.direction = "vertical"; }, 100],
            // centre moves to y -60: (60 - 25) / 50 = 0.7, inverted
            [() => { pe.offsetY = 60; }, 30],
            [() => { pe.setCoords(0, -60); }, 100],
        ];
        for (const [change, expected] of changes)
        {
            change();
            expect(frames.size).toBe(1);
            runUntilIdle();
            expect(translateOf(el)).toBeCloseTo(expected, 10);
        }
    });

    it("rewrites every node when the style stack changes, even if nothing moved", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        pe.setCoords(0, 0);
        runUntilIdle();

        pe.addStyle("rotate", [0, 90]);
        expect(frames.size).toBe(1);
        runUntilIdle();
        expect(el.style.transform).toBe("translateX(0px) rotate(0deg)");

        pe.removeStyle("translateX");
        runUntilIdle();
        expect(el.style.transform).toBe("rotate(0deg)");
    });

    it("keeps running while following a target element, which can move without an event", async () =>
    {
        const target = makeNode(0, 0);
        const pe = create(makeNode(0, 0), { target });
        await settle();
        for (let i=0; i<5; i++)
        {
            step();
        }
        expect(frames.size).toBe(1);
        pe.clearTarget();
        runUntilIdle();
        expect(frames.size).toBe(0);
    });

    it("skips drawing while a followed target stays still, and draws when it moves", async () =>
    {
        let at = 0;
        const target = makeNode(0, 0);
        target.getBoundingClientRect = () => boxAt(at, 0);
        const el = makeNode(0, 0);
        const pe = create(el, { target });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle(5);
        const update = vi.spyOn(pe, "update");
        const redraw = vi.fn();
        pe.addEventListener("redraw", redraw);

        step();
        step();
        expect(update).not.toHaveBeenCalled();
        expect(redraw).not.toHaveBeenCalled();
        expect(frames.size).toBe(1);

        at = 50;
        step();
        expect(update).toHaveBeenCalledOnce();
        expect(translateOf(el)).toBe(50);
        // one more frame confirms nothing is still easing, then it rests again
        step();
        step();
        expect(update).toHaveBeenCalledTimes(2);
    });

    it("still draws for other changes while following a still target", async () =>
    {
        const target = makeNode(0, 0);
        const el = makeNode(50, 0);
        const pe = create(el, { target });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        runUntilIdle(5);
        pe.runoff = 200;
        step();
        expect(translateOf(el)).toBe(25);
    });

    it("stops following the target while coordinates are set", async () =>
    {
        const target = makeNode(0, 0);
        const pe = create(makeNode(0, 0), { target });
        await settle();
        pe.setCoords(100, 100);
        runUntilIdle();
        expect(frames.size).toBe(0);
        pe.clearCoords();
        step();
        step();
        expect(frames.size).toBe(1);
    });

    it("only writes styles for nodes whose distance changed", async () =>
    {
        const near = makeNode(0, 0), far = makeNode(1000, 0);
        const pe = create([near, far], { runoff: 100 });
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(0, 0);
        runUntilIdle();
        expect(translateOf(far)).toBe(100);

        far.style.transform = "none";
        movePointer(10, 0);
        runUntilIdle();
        expect(translateOf(near)).toBe(10);
        // still out of range, so it wasn't written
        expect(far.style.transform).toBe("none");
    });

    it("measures every node in one pass, with layout-moving styles taken off", async () =>
    {
        const nodes = [makeNode(0, 0), makeNode(50, 0)];
        nodes[0].style.transform = "rotate(1deg)";
        const log = [];
        for (const el of nodes)
        {
            const rect = el.getBoundingClientRect;
            el.getBoundingClientRect = () => { log.push(nodes.map(n => n.style.transform)); return rect(); };
        }
        const pe = create(nodes);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        pe.setCoords(0, 0);
        step();
        expect(nodes.map(translateOf)).toEqual([0, 50]);

        log.length = 0;
        const cssText = vi.spyOn(CSSStyleDeclaration.prototype, "cssText", "set");
        pe.setCenterPoints();
        // every node is back to its original transform before any is measured
        expect(log).toEqual([["rotate(1deg)", ""], ["rotate(1deg)", ""]]);
        expect(cssText).not.toHaveBeenCalled();
        expect(nodes.map(translateOf)).toEqual([0, 50]);
    });

    it("measures without touching the nodes when the styles can't move them", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        pe.addStyle("blur", [0, 4]);
        pe.addStyle("opacity", [100, 50]);
        await settle();
        step();
        const rect = el.getBoundingClientRect;
        let filter;
        el.getBoundingClientRect = () => { filter = el.style.filter; return rect(); };
        pe.setCenterPoints();
        expect(filter).toBe("blur(4px) opacity(50%)");
    });

    it("shifts nodes by the page scroll instead of remeasuring them", async () =>
    {
        const el = makeNode(100, 100);
        const pe = create(el, { runoff: 100 });
        await settle();
        pe.setCoords(100, 100);
        step();
        expect(pe.distanceFrom(el)).toBe(0);

        const measure = vi.spyOn(el, "getBoundingClientRect");
        const reflow = vi.fn();
        pe.addEventListener("reflow", reflow);
        vi.spyOn(window, "scrollY", "get").mockReturnValue(50);
        document.dispatchEvent(new Event("scroll"));
        expect(frames.size).toBe(1);
        step();
        expect(measure).not.toHaveBeenCalled();
        expect(reflow).not.toHaveBeenCalled();
        expect(pe.getNodeIndexData(0, "center")).toEqual({ x: 100, y: 50 });
        expect(pe.distanceFrom(el)).toBe(0.5);
    });

    it("remeasures fixed and sticky nodes, and only them, when the page scrolls", async () =>
    {
        const bar = document.createElement("nav");
        bar.style.position = "fixed";
        document.body.append(bar);
        const pinned = makeNode(0, 0), sticky = makeNode(0, 0), flow = makeNode(0, 0);
        bar.append(pinned);
        sticky.style.position = "sticky";
        const pe = create([pinned, sticky, flow]);
        await settle();

        const measured = [pinned, sticky, flow].map(el => vi.spyOn(el, "getBoundingClientRect"));
        const reflow = vi.fn();
        pe.addEventListener("reflow", reflow);
        vi.spyOn(window, "scrollY", "get").mockReturnValue(30);
        document.dispatchEvent(new Event("scroll"));
        step();
        expect(measured.map(spy => spy.mock.calls.length)).toEqual([1, 1, 0]);
        // they're pinned, so they didn't move
        expect(reflow).not.toHaveBeenCalled();
        expect(pe.getNodeData(pinned, "center").y).toBe(0);
        expect(pe.getNodeData(flow, "center").y).toBe(-30);
    });

    it("takes a controlled parent's transform off while remeasuring a sticky node inside it", async () =>
    {
        const card = makeNode(0, 0);
        const sticky = document.createElement("div");
        sticky.style.position = "sticky";
        card.append(sticky);
        // the child moves with the card's current translateX
        sticky.getBoundingClientRect = () => boxAt(translateOf(card) ?? 0, 0);
        const pe = create([card, sticky]);
        pe.addStyle("translateX", [0, 100]);
        await settle();
        movePointer(1000, 0);
        step();
        expect(translateOf(card)).toBe(100);

        const measured = [card, sticky].map(el => vi.spyOn(el, "getBoundingClientRect"));
        vi.spyOn(window, "scrollY", "get").mockReturnValue(30);
        document.dispatchEvent(new Event("scroll"));
        step();
        expect(measured.map(spy => spy.mock.calls.length)).toEqual([1, 1]);
        expect(pe.getNodeData(sticky, "center").x).toBe(0);
        // the card was measured at the new scroll, so it isn't shifted by it again
        expect(pe.getNodeData(card, "center").y).toBe(0);
        expect(translateOf(card)).toBe(100);
    });

    it("remeasures every node after a page scroll when layout styles could move the pinned ones", async () =>
    {
        const sticky = makeNode(0, 0), flow = makeNode(0, 0);
        sticky.style.position = "sticky";
        const pe = create([sticky, flow]);
        pe.addStyle({ rule: "width", unit: "px" }, [20, 10]);
        await settle();
        const measured = [sticky, flow].map(el => vi.spyOn(el, "getBoundingClientRect"));
        vi.spyOn(window, "scrollY", "get").mockReturnValue(30);
        document.dispatchEvent(new Event("scroll"));
        step();
        expect(measured.map(spy => spy.mock.calls.length)).toEqual([1, 1]);
    });

    it("knows any spelling of a paint-only property can't move the pinned nodes", async () =>
    {
        const sticky = makeNode(0, 0), flow = makeNode(0, 0);
        sticky.style.position = "sticky";
        const pe = create([sticky, flow]);
        pe.addStyle({ rule: "-webkit-filter", func: "blur", unit: "px" }, [0, 2]);
        pe.addStyle({ rule: "backdrop-filter", func: "blur", unit: "px" }, [0, 2]);
        await settle();
        const measured = [sticky, flow].map(el => vi.spyOn(el, "getBoundingClientRect"));
        vi.spyOn(window, "scrollY", "get").mockReturnValue(30);
        document.dispatchEvent(new Event("scroll"));
        step();
        expect(measured.map(spy => spy.mock.calls.length)).toEqual([1, 0]);
    });

    it("ignores scrolling in containers that hold none of its nodes", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        await settle();
        runUntilIdle();
        const other = document.createElement("div");
        document.body.append(other);
        other.dispatchEvent(new Event("scroll"));
        expect(frames.size).toBe(0);
        expect(pe.paused).toBe(false);
    });

    describe("shadow DOM", () =>
    {
        // a host in the page, a scrolling box inside its shadow root, and a node in the box
        function shadowNode(parent = document.body)
        {
            const host = document.createElement("div");
            parent.append(host);
            const root = host.attachShadow({ mode: "closed" });
            const box = document.createElement("div");
            root.append(box);
            const el = makeNode(0, 0);
            box.append(el);
            return { host, root, box, el };
        }

        // scroll events don't bubble or leave their shadow root
        const scroll = el => el.dispatchEvent(new Event("scroll"));

        it("remeasures when a container inside a shadow root scrolls", async () =>
        {
            const { box, el } = shadowNode();
            create(el);
            await settle();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");
            scroll(box);
            step();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("remeasures when a page container scrolls a host whose shadow root holds a node", async () =>
        {
            const outer = document.createElement("div");
            document.body.append(outer);
            const { el } = shadowNode(outer);
            create(el);
            await settle();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");
            scroll(outer);
            step();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("listens through nested shadow roots", async () =>
        {
            const outer = shadowNode();
            const inner = shadowNode(outer.box);
            create(inner.el);
            await settle();
            runUntilIdle();
            const measure = vi.spyOn(inner.el, "getBoundingClientRect");
            scroll(outer.box);
            step();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("stops listening in shadow roots that no longer hold a node, and on destroy", async () =>
        {
            const a = shadowNode(), b = shadowNode();
            const pe = create(a.el);
            await settle();
            pe.nodes = [b.el];
            runUntilIdle();
            scroll(a.box);
            expect(frames.size).toBe(0);
            scroll(b.box);
            expect(frames.size).toBe(1);
            pe.destroy();
            frames.clear();
            scroll(b.box);
            expect(frames.size).toBe(0);
        });
    });

    it("batches resize and container scroll events into one measurement on the next frame", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        await settle();
        runUntilIdle();

        const measure = vi.spyOn(el, "getBoundingClientRect").mockReturnValue(boxAt(20, 0));
        const reflow = vi.fn();
        pe.addEventListener("reflow", reflow);
        const timer = vi.spyOn(window, "setTimeout");

        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("resize"));
        // scrolling inside a container doesn't bubble, but is still seen
        const box = document.createElement("div");
        document.body.append(box);
        box.append(el);
        box.dispatchEvent(new Event("scroll"));

        expect(measure).not.toHaveBeenCalled();
        expect(frames.size).toBe(1);
        step();
        expect(measure).toHaveBeenCalledOnce();
        expect(reflow).toHaveBeenCalledOnce();
        expect(timer).not.toHaveBeenCalled();
    });

    it("applies offsets and jitter without remeasuring", async () =>
    {
        vi.spyOn(Math, "random").mockReturnValue(1);
        const el = makeNode(100, 100);
        const pe = create(el);
        await settle();
        const measure = vi.spyOn(el, "getBoundingClientRect");
        pe.offsetX = 10;
        pe.jitter = 10;
        expect(measure).not.toHaveBeenCalled();
        expect(pe.getNodeIndexData(0, "center")).toEqual({ x: 95, y: 105 });
    });

    it("measures nodes added later on the next frame", async () =>
    {
        const pe = create(makeNode(0, 0));
        await settle();
        runUntilIdle();
        const added = makeNode(40, 0);
        pe.nodes = [pe.nodes[0], added];
        expect(pe.getNodeData(added, "center")).toBeUndefined();
        pe.setCoords(0, 0);
        step();
        expect(pe.distanceFrom(added)).toBe(0.4);
    });

    describe("ResizeObserver", () =>
    {
        let observer;

        beforeEach(() =>
        {
            vi.stubGlobal("ResizeObserver", class
            {
                constructor(callback) { this.callback = callback; this.observed = new Set(); observer = this; }
                observe(el) { this.observed.add(el); }
                unobserve(el) { this.observed.delete(el); }
                disconnect() { this.observed.clear(); this.disconnected = true; }
            });
        });

        // the observer reports sizes after layout, in the same frame as the writes
        const report = (...targets) => observer.callback(targets.map(target => ({ target })));
        // as a browser does, report every element's size when observing begins
        const reportInitial = () => report(...observer.observed);

        it("observes the page and the nodes, and disconnects on destroy", async () =>
        {
            const a = makeNode(0, 0), b = makeNode(10, 0);
            const pe = create([a, b]);
            await settle();
            expect(observer.observed).toEqual(new Set([document.documentElement, a, b]));
            pe.nodes = [b];
            expect(observer.observed.has(a)).toBe(false);
            pe.destroy();
            expect(observer.disconnected).toBe(true);
        });

        it("only starts observing the nodes that are new to the list", async () =>
        {
            const a = makeNode(0, 0), b = makeNode(10, 0);
            const pe = create(a);
            await settle();
            const observe = vi.spyOn(observer, "observe");
            pe.nodes = [a, b];
            expect(observe.mock.calls).toEqual([[b]]);
        });

        it("remeasures after an outside size change, dispatching reflow only if a node moved", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el);
            await settle();
            reportInitial();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");
            const reflow = vi.fn();
            pe.addEventListener("reflow", reflow);

            report(el);
            step();
            expect(measure).toHaveBeenCalledOnce();
            expect(reflow).not.toHaveBeenCalled();

            measure.mockReturnValue(boxAt(20, 0));
            report(document.documentElement);
            step();
            expect(measure).toHaveBeenCalledTimes(2);
            expect(reflow).toHaveBeenCalledOnce();
            expect(pe.getNodeIndexData(0, "center")).toEqual({ x: 20, y: 0 });
        });

        it("ignores size changes the effect makes itself", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el);
            pe.addStyle({ rule: "width", unit: "px" }, [20, 10]);
            await settle();
            reportInitial();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");

            pe.setCoords(0, 0);
            step();
            expect(el.style.width).toBe("20px");
            report(el);
            expect(runUntilIdle()).toBe(1);
            expect(measure).not.toHaveBeenCalled();

            // a later change to the same node is someone else's
            report(el);
            step();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("still counts nodes resized only by a transform", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el);
            pe.addStyle("scale", [2, 1]);
            await settle();
            reportInitial();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");
            pe.setCoords(0, 0);
            step();
            report(el);
            runUntilIdle();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("waits for nodes to settle before remeasuring", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el, { attack: 0.5 });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            reportInitial();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");

            pe.setCoords(0, 0);
            step();
            report(document.documentElement);
            step();
            step();
            expect(measure).not.toHaveBeenCalled();
            runUntilIdle();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("measures straight away for a window resize, even while nodes are moving", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el, { attack: 0.5 });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            runUntilIdle();
            const measure = vi.spyOn(el, "getBoundingClientRect");
            pe.setCoords(0, 0);
            step();
            window.dispatchEvent(new Event("resize"));
            step();
            expect(measure).toHaveBeenCalledOnce();
        });

        it("skips the first report for each element, which only gives its starting size", async () =>
        {
            const a = makeNode(0, 0), b = makeNode(10, 0);
            const pe = create(a);
            await settle();
            const measure = vi.spyOn(a, "getBoundingClientRect");
            reportInitial();
            runUntilIdle();
            expect(measure).not.toHaveBeenCalled();

            // nodes added later are measured once, by the nodes setter
            pe.nodes = [a, b];
            reportInitial();
            runUntilIdle();
            expect(measure).toHaveBeenCalledOnce();

            // a node dropped and added back starts again
            pe.nodes = [b];
            pe.nodes = [a, b];
            reportInitial();
            runUntilIdle();
            expect(measure).toHaveBeenCalledTimes(2);
        });
    });

    it("stops while the page is hidden and remeasures when it's shown again", async () =>
    {
        const el = makeNode(0, 0);
        const pe = create(el);
        await settle();
        expect(frames.size).toBe(1);

        const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
        expect(frames.size).toBe(0);
        movePointer(5, 5);
        expect(frames.size).toBe(0);

        visibility.mockReturnValue("visible");
        el.getBoundingClientRect = () => boxAt(20, 0);
        const reflow = vi.fn();
        pe.addEventListener("reflow", reflow);
        document.dispatchEvent(new Event("visibilitychange"));
        expect(frames.size).toBe(1);
        step();
        expect(reflow).toHaveBeenCalledOnce();
    });
});



describe("accessibility", () =>
{
    describe("pointer events", () =>
    {
        it("follows touch and pen as well as the mouse", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el, { runoff: 100 });
            await settle();
            movePointer(50, 0, { pointerType: "touch" });
            step();
            expect(pe.distanceFrom(el)).toBe(0.5);
            movePointer(0, 25, { pointerType: "pen" });
            step();
            expect(pe.distanceFrom(el)).toBe(0.25);
        });

        it("starts following a touch on pointerdown", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el, { runoff: 100 });
            await settle();
            document.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0, clientY: 50, isPrimary: true, pointerType: "touch" }));
            step();
            expect(pe.pointer).toEqual({ x: 0, y: 50 });
            expect(pe.distanceFrom(el)).toBe(0.5);
        });

        it("ignores all but the primary pointer", async () =>
        {
            const pe = create(makeNode(0, 0));
            await settle();
            movePointer(10, 10);
            movePointer(90, 90, { isPrimary: false, pointerType: "touch" });
            expect(pe.pointer).toEqual({ x: 10, y: 10 });
        });

        it("no longer listens for mousemove", async () =>
        {
            const pe = create(makeNode(0, 0));
            await settle();
            document.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10 }));
            expect(pe.pointer).toBeNull();
        });

        it("settles to rest when the pointer leaves the page", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el, { decay: 0.5 });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            movePointer(0, 0);
            step();
            expect(translateOf(el)).toBe(0);

            // moving between elements isn't leaving
            el.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, isPrimary: true, relatedTarget: document.body }));
            expect(pe.pointer).not.toBeNull();

            el.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, isPrimary: true, relatedTarget: null }));
            expect(pe.pointer).toBeNull();
            step();
            expect(translateOf(el)).toBe(50);
            for (let i=0; i<40; i++) step();
            expect(translateOf(el)).toBe(100);
            expect(frames.size).toBe(0);
        });

        it("ignores a secondary touch lifting off", async () =>
        {
            const pe = create(makeNode(0, 0));
            await settle();
            movePointer(10, 10);
            document.dispatchEvent(new PointerEvent("pointerout", { isPrimary: false, pointerType: "touch", relatedTarget: null }));
            expect(pe.pointer).toEqual({ x: 10, y: 10 });
        });

        it("settles to rest when the window loses focus", async () =>
        {
            const el = makeNode(0, 0);
            const pe = create(el);
            pe.addStyle("translateX", [0, 100]);
            await settle();
            movePointer(0, 0);
            step();
            window.dispatchEvent(new Event("blur"));
            expect(pe.pointer).toBeNull();
            step();
            expect(translateOf(el)).toBe(100);
        });

        it("removes the pointer listeners on destroy", async () =>
        {
            const pe = create(makeNode(0, 0));
            await settle();
            movePointer(10, 10);
            pe.destroy();
            movePointer(20, 20);
            document.dispatchEvent(new PointerEvent("pointerout", { isPrimary: true, relatedTarget: null }));
            window.dispatchEvent(new Event("blur"));
            expect(pe.pointer).toEqual({ x: 10, y: 10 });
        });
    });


    describe("reduced motion", () =>
    {
        it("defaults to 'rest' and validates the mode", () =>
        {
            const pe = create(makeNode(0, 0));
            expect(pe.reducedMotion).toBe("rest");
            for (const mode of ["snap", "ignore", "rest"])
            {
                pe.reducedMotion = mode;
                expect(pe.reducedMotion).toBe(mode);
            }
            expect(() => { pe.reducedMotion = "off"; }).toThrow(RangeError);
            expect(() => { pe.reducedMotion = true; }).toThrow(RangeError);
            expect(pe.reducedMotion).toBe("rest");
            expect(() => create(makeNode(0, 0), { reducedMotion: "none" })).toThrow(RangeError);
        });

        it("works without matchMedia", async () =>
        {
            vi.stubGlobal("matchMedia", undefined);
            const el = makeNode(0, 0);
            const pe = create(el, { runoff: 100 });
            await settle();
            movePointer(50, 0);
            step();
            expect(pe.motionReduced).toBe(false);
            expect(pe.distanceFrom(el)).toBe(0.5);
        });

        it("'rest' keeps nodes at rest and ignores the pointer, target and coords", async () =>
        {
            fakeMotionQuery(true);
            const el = makeNode(0, 0);
            const pe = create(el, { attack: 0.1, target: makeNode(0, 0) });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            expect(pe.motionReduced).toBe(true);
            movePointer(0, 0);
            step();
            expect(translateOf(el)).toBe(100);
            pe.setCoords(0, 0);
            step();
            expect(translateOf(el)).toBe(100);
            // nothing to follow, so the loop rests even with a target set
            expect(frames.size).toBe(0);
        });

        it("'rest' with invert rests at the near value, as with nothing tracked", async () =>
        {
            fakeMotionQuery(true);
            const el = makeNode(0, 0);
            const pe = create(el, { invert: true });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            movePointer(500, 500);
            step();
            expect(translateOf(el)).toBe(0);
        });

        it("'snap' follows the pointer without easing", async () =>
        {
            fakeMotionQuery(true);
            const el = makeNode(0, 0);
            const pe = create(el, { attack: 0.1, decay: 0.1, reducedMotion: "snap", primeDistances: true });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            movePointer(50, 0);
            step();
            expect(translateOf(el)).toBe(50);
            movePointer(0, 0);
            step();
            expect(translateOf(el)).toBe(0);
            step();
            expect(frames.size).toBe(0);
        });

        it("'ignore' eases as normal", async () =>
        {
            fakeMotionQuery(true);
            const el = makeNode(0, 0);
            const pe = create(el, { attack: 0.5, reducedMotion: "ignore", primeDistances: true });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            expect(pe.motionReduced).toBe(false);
            movePointer(0, 0);
            step();
            expect(translateOf(el)).toBe(50);
        });

        it("follows the preference as it changes", async () =>
        {
            const query = fakeMotionQuery(false);
            const el = makeNode(0, 0);
            const pe = create(el, { attack: 0.5, decay: 0.5 });
            pe.addStyle("translateX", [0, 100]);
            await settle();
            movePointer(0, 0);
            step();
            expect(translateOf(el)).toBe(0);

            // turning it on snaps straight to rest, without easing
            query.set(true);
            expect(pe.motionReduced).toBe(true);
            expect(frames.size).toBe(1);
            step();
            expect(translateOf(el)).toBe(100);

            // turning it off picks the pointer up again, eased
            query.set(false);
            step();
            expect(translateOf(el)).toBe(50);
        });

        it("changing reducedMotion while reduced takes effect straight away", async () =>
        {
            fakeMotionQuery(true);
            const el = makeNode(0, 0);
            const pe = create(el);
            pe.addStyle("translateX", [0, 100]);
            await settle();
            movePointer(0, 0);
            step();
            expect(translateOf(el)).toBe(100);
            pe.reducedMotion = "snap";
            step();
            expect(translateOf(el)).toBe(0);
        });

        it("stops listening for preference changes on destroy", async () =>
        {
            const query = fakeMotionQuery(false);
            const pe = create(makeNode(0, 0));
            await settle();
            pe.destroy();
            query.set(true);
            expect(pe.motionReduced).toBe(false);
        });
    });


    it("only ever changes the nodes' style attribute", async () =>
    {
        const host = document.createElement("div");
        host.innerHTML = `<button aria-label="One" tabindex="0">One</button><a href="#" aria-hidden="false">Two</a><p hidden>Three</p>`;
        document.body.append(host);
        const nodes = [...host.children];
        nodes.forEach((el, i) => { el.getBoundingClientRect = () => boxAt(i*20, 0); });
        const before = host.innerHTML;

        const records = [];
        const observer = new MutationObserver(list => records.push(...list));
        observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });

        const pe = create(nodes, { runoff: 50, zIndex: true });
        pe.addStyle("opacity", [100, 40]);
        pe.addStyle("translateY", [-5, 0]);
        pe.addStyle({ rule: "letterSpacing", unit: "px" }, [2, 0]);
        await settle();
        for (let i=0; i<5; i++)
        {
            movePointer(i*10, 0);
            step();
        }
        pe.removeStyle("opacity");
        step();
        pe.destroy();
        await settle();
        observer.disconnect();
        records.push(...observer.takeRecords());

        expect(records.length).toBeGreaterThan(0);
        for (const record of records)
        {
            expect(record.type).toBe("attributes");
            expect(record.attributeName).toBe("style");
            expect(nodes).toContain(record.target);
        }
        // and destroy leaves the markup exactly as it was
        expect(host.innerHTML).toBe(before);
    });
});
