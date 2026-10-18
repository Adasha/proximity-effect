// Type checks for src/ProximityEffect.d.ts, run with `npm run typecheck`.
// Nothing here runs: each line must type-check, and each @ts-expect-error
// line must fail to.

import ProximityEffect, {
    type NodeData,
    type Point,
    type ProximityEffectParams,
    type Style,
} from "../../src/ProximityEffect.js";


const assert = <T>(value: T): T => value;

const el = document.createElement("div");


// constructor
new ProximityEffect(el);
new ProximityEffect(document.querySelectorAll("div"));
new ProximityEffect(document.querySelectorAll(".x"));
new ProximityEffect(document.getElementsByClassName("x"));
new ProximityEffect([el, el]);
new ProximityEffect(el, null);
const params: ProximityEffectParams = {
    threshold: 10, runoff: 200, invert: true, direction: "horizontal", attack: 0.5, decay: 0.2,
    offsetX: 1, offsetY: 2, jitter: 3, jitterX: 4, jitterY: 5, jitterMethod: "gaussian",
    tolerance: 0.01, FPS: 30, target: el, primeDistances: true, zIndex: true, perspectiveOrigin: true, perspective: 500, reducedMotion: "snap",
};
const pe = new ProximityEffect(el, params);
new ProximityEffect(el, { FPS: false, target: null, threshold: null });
// @ts-expect-error nodes are required
new ProximityEffect();
// @ts-expect-error a selector string isn't accepted
new ProximityEffect("div");
// @ts-expect-error text nodes aren't elements
new ProximityEffect(document.body.childNodes);
// @ts-expect-error unknown direction
new ProximityEffect(el, { direction: "diagonal" });
// @ts-expect-error unknown reducedMotion
new ProximityEffect(el, { reducedMotion: "off" });
// @ts-expect-error unknown parameter
new ProximityEffect(el, { accuracy: 5 });


// properties
assert<Element | null>(pe.target);
pe.target = el;
pe.target = null;
pe.target = undefined;
assert<Element[]>(pe.nodes);
pe.nodes = [el];
pe.nodes = el;
assert<number>(pe.totalNodes);
assert<Style[]>(pe.styles);
assert<number>(pe.boundary);
pe.threshold = 1;
pe.runoff = 1;
pe.invert = false;
pe.zIndex = false;
pe.perspectiveOrigin = true;
assert<boolean>(pe.perspectiveOrigin);
pe.perspective = 800;
pe.perspective = false;
assert<number | null>(pe.perspective);
pe.attack = 1;
pe.decay = 1;
pe.offsetX = 1;
pe.offsetY = 1;
pe.jitter = 1;
pe.jitterX = 1;
pe.jitterY = 1;
pe.jitterMethod = "normal";
pe.direction = "vertical";
pe.FPS = 60;
pe.FPS = null;
assert<number | null>(pe.FPS);
pe.tolerance = 0.1;
pe.reducedMotion = "ignore";
assert<boolean>(pe.motionReduced);
assert<Point | null>(pe.pointer);
assert<boolean>(pe.paused);
assert<boolean>(pe.destroyed);
// @ts-expect-error read-only
pe.totalNodes = 3;
// @ts-expect-error read-only
pe.boundary = 3;
// @ts-expect-error read-only
pe.motionReduced = true;
// @ts-expect-error read-only
pe.paused = true;
// @ts-expect-error not a number
pe.threshold = "10";
// @ts-expect-error unknown method
pe.jitterMethod = "poisson";


// styles
pe.addStyle("blur", [0, 10]);
pe.addStyle("hueRotate", [{ value: 0, scatter: 10, scatterMethod: "normal" }, 90], { id: "hue" });
pe.addStyle({ rule: "letter-spacing", unit: "px", min: 0 }, [4, 0]);
pe.addStyle({ rule: "transform", func: "perspective", unit: "px" }, [100, 50], null);
// @ts-expect-error unknown preset
pe.addStyle("color", [0, 1]);
// @ts-expect-error a custom style needs a rule
pe.addStyle({ unit: "px" }, [0, 1]);
// @ts-expect-error two keyframes only
pe.addStyle("blur", [0, 5, 10]);
// @ts-expect-error one keyframe isn't enough
pe.addStyle("blur", [0]);
// @ts-expect-error keyframe distance isn't supported yet
pe.addStyle("blur", [0, { value: 1, distance: 1 }]);
// @ts-expect-error per-style threshold isn't supported yet
pe.addStyle("blur", [0, 1], { threshold: 10 });
assert<boolean>(pe.hasStyle("hue"));
assert<boolean>(pe.removeStyle("hue"));
const style = pe.styles[0];
assert<string>(style.name);
assert<string>(style.rule);
assert<string | undefined>(style.func);
assert<number>(style.near.value);
assert<string | undefined>(style.id);
// @ts-expect-error read-only
style.rule = "width";


// methods
assert<number | undefined>(pe.distanceFrom(el));
assert<number | undefined>(pe.distanceFromIndex(0));
pe.clearTarget();
assert<Point | null>(pe.getCoords());
pe.setCoords(1, 2);
pe.clearCoords();
pe.setCenterPoints();
pe.pause();
pe.resume();
pe.update();
pe.destroy();
// @ts-expect-error update takes no arguments
pe.update(16);
// @ts-expect-error private
pe.updatePointer(new PointerEvent("pointermove"));
// @ts-expect-error private
pe.reflowEvent();
// @ts-expect-error removed
pe.addProperty("x", {});


// node data
const data = pe.getNodeData(el);
assert<NodeData>(data);
assert<Element>(data.node);
assert<Point | undefined>(data.center);
assert<number | undefined>(pe.getNodeIndexData(0, "distance"));
assert<{ near: number; far: number }[]>(pe.getNodeData(el, "styles"));
assert<boolean>(pe.hasNodeIndexData(0, "center"));
// @ts-expect-error not a node data property
pe.getNodeData(el, "scrollsWithPage");


// events
pe.addEventListener("ready", (evt) => assert<Event>(evt));
pe.addEventListener("redraw", function () { assert<ProximityEffect>(this); });
pe.addEventListener("reflow", () => {}, { once: true });
pe.removeEventListener("redraw", () => {});
pe.addEventListener("custom", () => {});
