/*
 * Type declarations for ProximityEffect, written by hand.
 * tests/api.test.js checks that the class members here match the runtime
 * ones, and tests/types/ checks that they type-check as intended.
 */


/** The nodes an effect can animate. */
export type ProximityEffectNodes =
    | Element
    | NodeListOf<Element>
    | HTMLCollection
    | readonly Element[];

/** Which distance the effect measures. */
export type Direction = "both" | "horizontal" | "vertical";

/** How random values (jitter, scatter) are distributed. "gaussian" is an alias for "normal". */
export type RandomMethod = "uniform" | "normal" | "gaussian";

/** What the effect does when the user prefers reduced motion. */
export type ReducedMotion = "rest" | "snap" | "ignore";

/** The names of the preset styles accepted by addStyle(). */
export type PresetStyle =
    | "translateX" | "translateY" | "translateZ"
    | "rotate" | "rotateX" | "rotateY" | "rotateZ"
    | "scale" | "scaleX" | "scaleY" | "scaleZ"
    | "skewX" | "skewY"
    | "blur" | "brightness" | "contrast" | "grayscale" | "hueRotate"
    | "invert" | "opacity" | "saturate" | "sepia";

/** A point relative to the viewport, in pixels. */
export interface Point
{
    x: number;
    y: number;
}

/** Parameters for the constructor. A null or missing value means the default. */
export interface ProximityEffectParams
{
    /** The distance within which styles are at their near value, in pixels. Default 0. */
    threshold?: number | null;
    /** The distance beyond the threshold over which styles are interpolated, in pixels. Default 100. */
    runoff?: number | null;
    /** Swap near and far. Default false. */
    invert?: boolean | null;
    /** Which distance to measure: straight-line ("both"), or along one axis. Default "both". */
    direction?: Direction | null;
    /** Easing rate (0 to 1) as the target approaches. Default 1 (no easing). */
    attack?: number | null;
    /** Easing rate (0 to 1) as the target moves away. Default 1 (no easing). */
    decay?: number | null;
    /** Shifts every node's centre horizontally, in pixels; a positive value moves it left. Adds to each node's data-offsetx. Default 0. */
    offsetX?: number | null;
    /** Shifts every node's centre vertically, in pixels; a positive value moves it up. Adds to each node's data-offsety. Default 0. */
    offsetY?: number | null;
    /** Random offset of each node's centre on both axes, in pixels. Default 0. */
    jitter?: number | null;
    /** Random offset of each node's centre on the x axis only, in pixels. Adds to jitter. Default 0. */
    jitterX?: number | null;
    /** Random offset of each node's centre on the y axis only, in pixels. Adds to jitter. Default 0. */
    jitterY?: number | null;
    /** How the jitter is distributed. Default "uniform". */
    jitterMethod?: RandomMethod | null;
    /** How close (0 to 1) easing must get to its target before snapping to it. Default 0.0001. */
    tolerance?: number | null;
    /** A frame rate limit, or a falsy value to follow the screen refresh. Default null. */
    FPS?: number | false | null;
    /** An element to track instead of the pointer. Default null. */
    target?: Element | null;
    /** Start every node at its far value and ease in. Constructor only. Default false. */
    primeDistances?: boolean | null;
    /** Set each node's z-index from its distance. Default false. */
    zIndex?: boolean | null;
    /** Set the nodes' parent's perspective-origin to the centre of the nodes at rest. The nodes must share a parent, or it warns and does nothing. Default false. */
    perspectiveOrigin?: boolean | null;
    /** A perspective distance for each node's transform, in pixels, viewed from the centre of the node at rest. Use instead of a parent's perspective. A falsy value means none. Default null. */
    perspective?: number | false | null;
    /** What to do when the user prefers reduced motion: stay at rest, follow without easing, or ignore it. Default "rest". */
    reducedMotion?: ReducedMotion | null;
}

/** A custom style for addStyle(). */
export interface CustomStyle
{
    /** The CSS property, in camelCase or kebab-case. */
    rule: string;
    /** A CSS function wrapping the value, such as "perspective". */
    func?: string;
    /** A CSS unit, such as "px" or "%". */
    unit?: string;
    min?: number;
    max?: number;
    default?: number;
}

/** A keyframe value: a number, or an object adding random scatter to it. */
export type Keyframe =
    | number
    | {
        value: number;
        /** The size of a random amount added to each node's value. */
        scatter?: number;
        scatterMethod?: RandomMethod;
    };

/** The near and far keyframes. */
export type Keyframes = readonly [near: Keyframe, far: Keyframe];

/** Per-style parameters for addStyle(). */
export interface StyleParams
{
    /** A name for the style, which hasStyle() and removeStyle() accept. */
    id?: string;
}

/** A keyframe as a Style stores it. */
export interface StyleKeyframe
{
    value: number;
    /** 0 for the near keyframe, 1 for the far one. */
    distance: number;
    scatter: number | undefined;
    scatterMethod: RandomMethod | undefined;
}

/** A style on an effect's stack, as returned by the styles property. Read-only. */
export interface Style
{
    /** The preset name, or a custom style's func (or rule if it has none). */
    readonly name: string;
    readonly rule: string;
    readonly func: string | undefined;
    readonly unit: string | undefined;
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly defaultValue: number | undefined;
    /** A copy of the near keyframe. */
    readonly near: StyleKeyframe;
    /** A copy of the far keyframe. */
    readonly far: StyleKeyframe;
    readonly id: string | undefined;
    /** A copy of the style's params. */
    readonly params: StyleParams;
}

/** One node's near and far values for one style, after scatter. */
export interface NodeStyleValues
{
    near: number;
    far: number;
}

/** A snapshot of one node's effect data. Fields without a value yet are left out. */
export interface NodeData
{
    node: Element;
    /** The measured centre, with any data-offsetx/data-offsety applied. */
    measured?: Point;
    /** The centre used for distances, with global offset and jitter applied. */
    center?: Point;
    jitter: Point;
    /** The normalised distance (0 to 1) to the target as of the last frame. */
    distance?: number;
    /** The eased distance as of the last frame. */
    lastDelta?: number;
    /** Values for each style on the stack, in stack order. */
    styles: NodeStyleValues[];
}

/** The events an effect dispatches. They don't bubble, can't be cancelled and carry no detail. */
export interface ProximityEffectEventMap
{
    /** The instance is set up, once the document has loaded. Always asynchronous. */
    ready: Event;
    /** The animation loop drew a frame. */
    redraw: Event;
    /** A remeasure found that a node moved. */
    reflow: Event;
}


/** Animates CSS properties of many elements by their distance from the pointer or a target. */
export default class ProximityEffect extends EventTarget
{
    constructor(nodes: ProximityEffectNodes, params?: ProximityEffectParams | null);

    get target(): Element | null;
    set target(target: Element | null | undefined | false);
    /** A copy of the node list. */
    get nodes(): Element[];
    set nodes(list: ProximityEffectNodes);
    get totalNodes(): number;
    /** A copy of the style stack. */
    get styles(): Style[];
    get threshold(): number;
    set threshold(value: number);
    get runoff(): number;
    set runoff(value: number);
    /** threshold + runoff. */
    get boundary(): number;
    get invert(): boolean;
    set invert(flag: boolean);
    get zIndex(): boolean;
    set zIndex(flag: boolean);
    get perspectiveOrigin(): boolean;
    set perspectiveOrigin(flag: boolean);
    get perspective(): number | null;
    set perspective(value: number | false | null | undefined);
    get attack(): number;
    set attack(value: number);
    get decay(): number;
    set decay(value: number);
    get offsetX(): number;
    set offsetX(value: number);
    get offsetY(): number;
    set offsetY(value: number);
    get jitter(): number;
    set jitter(value: number);
    get jitterX(): number;
    set jitterX(value: number);
    get jitterY(): number;
    set jitterY(value: number);
    get jitterMethod(): RandomMethod;
    set jitterMethod(method: RandomMethod);
    get direction(): Direction;
    set direction(direction: Direction);
    get FPS(): number | null;
    set FPS(value: number | false | null | undefined);
    get tolerance(): number;
    set tolerance(value: number);
    get reducedMotion(): ReducedMotion;
    set reducedMotion(mode: ReducedMotion);
    /** Whether motion is being reduced right now. */
    get motionReduced(): boolean;
    /** The last pointer position, or null before it moves and after it leaves the page. */
    get pointer(): Point | null;
    get paused(): boolean;
    get destroyed(): boolean;

    addStyle(property: PresetStyle | CustomStyle, keyframes: Keyframes, params?: StyleParams | null): void;
    hasStyle(name: string): boolean;
    removeStyle(name: string): boolean;
    distanceFrom(node: Element): number | undefined;
    distanceFromIndex(index: number): number | undefined;
    clearTarget(): void;
    getCoords(): Point | null;
    setCoords(x: number, y: number): void;
    clearCoords(): void;
    setCenterPoints(): void;
    pause(): void;
    resume(): void;
    destroy(): void;
    getNodeData(node: Element): NodeData;
    getNodeData<K extends keyof NodeData>(node: Element, prop: K): NodeData[K];
    getNodeIndexData(index: number): NodeData;
    getNodeIndexData<K extends keyof NodeData>(index: number, prop: K): NodeData[K];
    hasNodeIndexData(index: number, prop: keyof NodeData): boolean;
    /** Draw one frame now. */
    update(): void;

    addEventListener<K extends keyof ProximityEffectEventMap>(type: K, listener: (this: ProximityEffect, evt: ProximityEffectEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof ProximityEffectEventMap>(type: K, listener: (this: ProximityEffect, evt: ProximityEffectEventMap[K]) => void, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}
