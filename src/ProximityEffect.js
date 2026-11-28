import * as AdashaUtils from './AdashaUtils.mjs';
import Style from './StyleClass.mjs';
import * as Validate from './validate.mjs';

/*
 * ProximityEffect class by Adasha
 * Mass animate CSS properties based on mouse or arbitrary target's position.
 *
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/components/proximity-effect
 */


// A custom style's rule can be camelCase or kebab-case, so rules are compared
// by their camelCase form: "letter-spacing" and "letterSpacing" are one
// property, as are "-webkit-filter" and "webkitFilter". Styles are still
// written with the spelling they were given. Custom properties (--name) are
// case-sensitive and have no camelCase form, so they're their own key.
const isCustomProperty = (rule) => rule.startsWith("--");
const ruleKey = (rule) => isCustomProperty(rule)
    ? rule
    : rule.replace(/^-/, "").replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

// Read and write one property of an inline style. Custom properties aren't
// members of CSSStyleDeclaration, so they go through the property methods.
const readRule = (style, rule) => isCustomProperty(rule) ? style.getPropertyValue(rule) : style[rule];
const writeRule = (style, rule, value) =>
{
    if (isCustomProperty(rule))
    {
        style.setProperty(rule, value);
    }
    else
    {
        style[rule] = value;
    }
};

// properties that don't move or resize an element's box, so nodes can be
// measured without taking them off first (as rule keys). Custom properties
// count as paint-only too (see #measure).
const PAINT_ONLY_RULES = new Set(["filter", "webkitFilter", "backdropFilter", "webkitBackdropFilter", "opacity", "zIndex"]);
const paintOnly = (key) => PAINT_ONLY_RULES.has(key) || isCustomProperty(key);

// properties that can't change an element's size, so writing them never
// makes the ResizeObserver report (as rule keys)
const SIZE_NEUTRAL_RULES = new Set([...PAINT_ONLY_RULES, "transform", "webkitTransform", "translate", "rotate", "scale"]);

// the transform spellings a perspective() is put in front of (as rule keys)
const TRANSFORM_RULES = new Set(["transform", "webkitTransform"]);

// the public node data fields, each read as a copy (see getNodeData)
const point = (p) => p && { x: p.x, y: p.y };
const NODE_DATA = Object.freeze({
    __proto__: null,
    node:      (data) => data.node,
    measured:  (data) => point(data.measured),
    center:    (data) => point(data.center),
    jitter:    (data) => point(data.jitter),
    distance:  (data) => data.distance,
    lastDelta: (data) => data.lastDelta,
    styles:    (data) => data.styles.map(({ near, far }) => ({ near, far })),
});



/**
 * Animates CSS properties of many elements by their distance from the pointer or a target.
 * @version 4.1.0
 * @author Adam Shailer <adasha76@outlook.com>
 * @class
 * @extends EventTarget
 * @fires ProximityEffect#ready
 * @fires ProximityEffect#redraw
 * @fires ProximityEffect#reflow
 */
export default class ProximityEffect extends EventTarget
{

    #VALID_DIRECTIONS       = new Set(["both", "horizontal", "vertical"]);
    #VALID_REDUCED_MOTION   = new Set(["rest", "snap", "ignore"]);
    #VALID_POINTER_LEAVE    = new Set(["rest", "hold"]);
    #DEFAULT_DIRECTION      = "both";
    #DEFAULT_TOLERANCE      = 0.0001;
    #DEFAULT_RUNOFF         = 100;
    #DEFAULT_SCATTER_METHOD = "uniform";
    #DEFAULT_JITTER_METHOD  = "uniform";


    #globalParams = {};
    #pointer = null;
    // a touch or pen point kept after it lifted (pointerLeave "hold"), in page coordinates
    #held = null;
    #coords = null;
    #stylesStack = [];
    #styleGroups = [];
    #nodes = [];
    #nodeData = [];

    // lifecycle
    #ready = false;
    #paused = false;
    #destroyed = false;
    #abort = new AbortController();
    #shadowRoots = new Map();
    #resizeObserver = null;
    #frameId = null;
    #lastFrameTime;
    #needsMeasure = false;
    #needsPinnedMeasure = false;
    #measureWhenSettled = false;
    #ownResizes = new Set();
    #sizeReported = new WeakSet();
    #scrollX = 0;
    #scrollY = 0;
    #needsRewrite = true;
    #awake = false;
    #atRest = false;
    #lastTargetPoint = null;
    #changed = false;
    #scratchStyle;
    // the inline properties the instance has written and not yet put back,
    // rule key => spelling, so destroy() and dropped nodes give back only these
    #written = new Map();
    #prefersReducedMotion = false;
    // the parent whose perspective-origin is set, and its own inline value
    #originParent = null;
    #originParentValue = "";
    // the touchDrag container, and its own inline touch-action
    #dragArea = null;
    #dragAreaValue = "";

    // stable listener references, so they can all be removed
    #onPointerMove  = (evt) => this.#pointerMove(evt);
    #onPointerOut   = (evt) => this.#pointerOut(evt);
    #onBlur         = () => this.#pointerLeft();
    #onMotionPref   = (evt) => this.#motionPreference(evt.matches);
    #onReflow       = () => this.#reflow();
    #onResize       = (entries) => this.#resized(entries);
    #onScroll       = (evt) => this.#scrolled(evt);
    #onVisibility   = () => this.#visibilityChange();
    #onFrame        = (timestamp) => this.#frame(timestamp);





    /**
     * Create a ProximityEffect instance.
     * @constructor
     * @param {NodeList|HTMLCollection|Array<Element>|Element} nodes - The nodes to control.
     * @param {Object}  [params={}] - An object containing effect parameters.
     * @param {number}  [params.threshold=0] - The global effect threshold, in pixels.
     * @param {number}  [params.runoff=100] - The global effect runoff, in pixels.
     * @param {boolean} [params.invert=false] - Invert distances globally.
     * @param {string}  [params.direction="both"] - The effect direction, one of "both", "horizontal" or "vertical".
     * @param {number}  [params.attack=1] - The easing rate (0 to 1) as the target approaches. 1 is no easing.
     * @param {number}  [params.decay=1] - The easing rate (0 to 1) as the target moves away. 1 is no easing.
     * @param {number}  [params.scaleEffect=1] - A multiplier for every pixel distance in the effect: threshold, runoff, offsets, jitter and px style values. Negative values become 0.
     * @param {number}  [params.offsetX=0] - The global horizontal offset, in pixels. A positive value moves each node's centre left.
     * @param {number}  [params.offsetY=0] - The global vertical offset, in pixels. A positive value moves each node's centre up.
     * @param {number}  [params.jitter=0] - The size of a random offset to each node's centre, in pixels. Affects X and Y.
     * @param {number}  [params.jitterX=0] - The effect jitter for the X axis only, in pixels.
     * @param {number}  [params.jitterY=0] - The effect jitter for the Y axis only, in pixels.
     * @param {string}  [params.jitterMethod="uniform"] - The random method for generating jitter values, "uniform" or "normal" ("gaussian" is an alias).
     * @param {number}  [params.tolerance=0.0001] - How close (0 to 1) eased distances must get to their target before snapping to it.
     * @param {number|null|false} [params.FPS] - A frame rate limit, or null, false or 0 to follow the screen refresh.
     * @param {Element} [params.target] - An element to track instead of the pointer.
     * @param {boolean} [params.primeDistances=false] - Prime the initial distances to create a transition on load. Only available through params argument in constructor.
     * @param {boolean} [params.zIndex=false] - Set each node's z-index from its distance, so the nearest nodes sit on top.
     * @param {boolean} [params.perspectiveOrigin=false] - Set the nodes' parent's perspective-origin to the centre of the nodes at rest. The nodes must share a parent.
     * @param {number|null|false} [params.perspective] - A perspective distance in pixels to give each node's transform, viewed from the centre of the node at rest, or null, false or 0 to leave perspective to the parent.
     * @param {string}  [params.reducedMotion="rest"] - What to do when the user prefers reduced motion: "rest" (nodes stay at rest and ignore the pointer), "snap" (nodes follow without easing) or "ignore".
     * @param {boolean|Element} [params.touchDrag=false] - Keep a touch dragging over the effect for the effect instead of scrolling the page, by setting touch-action: pinch-zoom: true on each node, or an element (such as the nodes' container) to include the gaps between them. False or null leaves touch-action alone.
     * @param {string}  [params.pointerLeave="rest"] - What to do when a touch or pen lifts: "rest" (nodes settle back to rest) or "hold" (the last point is kept, on the same spot on the page, until the next pointer event). A mouse leaving the page always rests.
     * @throws {TypeError} If an argument or parameter is the wrong type.
     * @throws {RangeError} If a parameter value is not allowed (NaN, Infinity, an unknown name).
     */
    constructor(nodes, params = {})
    {
        super();

        if (typeof document==="undefined")
        {
            throw new Error("ProximityEffect: a browser DOM is required (document is not defined).");
        }
        if (!nodes)
        {
            throw new TypeError("ProximityEffect: nodes argument is required.");
        }
        if (params==null)
        {
            params = {};
        }
        if (!AdashaUtils.isObject(params))
        {
            throw new TypeError("ProximityEffect: params must be an object.");
        }

        // read own properties only; the caller's object is never stored or changed
        const param = (key, fallback) => Object.hasOwn(params, key) && params[key]!=null ? params[key] : fallback;

        this.#globalParams.primeDistances = Validate.boolean(param("primeDistances", false), "primeDistances");

        // set global parameter values (nodes come last, so their data is built once)
        this.scaleEffect  = param("scaleEffect", 1);
        this.threshold    = param("threshold", 0);
        this.runoff       = param("runoff", this.#DEFAULT_RUNOFF);
        this.attack       = param("attack", 1);
        this.decay        = param("decay", 1);
        this.tolerance    = param("tolerance", this.#DEFAULT_TOLERANCE);
        this.invert       = param("invert", false);
        this.zIndex       = param("zIndex", false);
        this.perspective  = param("perspective", null);
        this.reducedMotion = param("reducedMotion", "rest");
        this.pointerLeave = param("pointerLeave", "rest");
        this.offsetX      = param("offsetX", 0);
        this.offsetY      = param("offsetY", 0);
        this.jitterMethod = param("jitterMethod", this.#DEFAULT_JITTER_METHOD);
        this.jitter       = param("jitter", 0);
        this.jitterX      = param("jitterX", 0);
        this.jitterY      = param("jitterY", 0);
        this.direction    = param("direction", this.#DEFAULT_DIRECTION);
        this.FPS          = param("FPS", null);
        this.target       = param("target", null);

        this.nodes = nodes;
        // after the nodes, since they need them
        this.perspectiveOrigin = param("perspectiveOrigin", false);
        this.touchDrag = param("touchDrag", false);


        // finish setup once the document has loaded. Deferred even when it
        // already has, so listeners added after construction see 'ready'.
        if (document.readyState==="complete")
        {
            queueMicrotask(() => this.#init());
        }
        else
        {
            window.addEventListener("load", () => this.#init(), { once: true, signal: this.#abort.signal });
        }
    }





    /////////////////////////////////
    //                             //
    //     GETTER/SETTER PROPS     //
    //                             //
    /////////////////////////////////



    /**
     * Get the currently tracked target.
     * @return {Element|null} The current target.
     */
    get target()
    {
        return this.#globalParams.target;
    }

    /**
     * Set the target to track.
     * @param {Element|Falsy} target - A reference to a DOM Element, or falsy to target mouse.
     */
    set target(target)
    {
        if (!target)
        {
            this.#globalParams.target = null;
        }
        else if (target instanceof Element)
        {
            this.#globalParams.target = target;
        }
        else
        {
            throw new TypeError(`ProximityEffect: ${target} is not a valid target.`);
        }
        this.#start();
    }





    /**
     * Get the list of nodes.
     * @return {Array<Element>} A copy of the node array.
     */
    get nodes()
    {
        return [...this.#nodes];
    }

    /**
     * Set the nodes to animate. Nodes that are no longer in the list get their original values back for the properties the effect set, and keep any other inline styles.
     * @param {NodeList|HTMLCollection|Array<Element>|Element} list - The nodes.
     * @throws {Error} If the instance has been destroyed.
     */
    set nodes(list)
    {
        this.#assertAlive("change the nodes of");
        const nodes   = this.#toElementArray(list),
              keeping = new Set(nodes),
              kept    = new Map(this.#nodeData.map(data => [data.node, data]));

        for (const data of this.#nodeData)
        {
            if (!keeping.has(data.node))
            {
                this.#restoreWritten(data);
                this.#resizeObserver?.unobserve(data.node);
                this.#sizeReported.delete(data.node);
            }
        }

        this.#nodes    = nodes;
        this.#nodeData = nodes.map(node => kept.get(node) ?? this.#createNodeData(node));
        if (this.perspectiveOrigin)
        {
            this.#claimOriginParent();
        }
        // nodes that left were given their touch-action back already
        if (this.touchDrag===true)
        {
            this.#claimDrags();
        }

        if (this.#ready)
        {
            // observing a node again would queue another initial size report
            this.#observe(nodes.filter(node => !kept.has(node)));
            this.#listenInShadowRoots();
            this.#requestMeasure();
        }
    }



    /**
     * Get the number of nodes.
     * @return {number} The number of nodes being animated.
     */
    get totalNodes()
    {
        return this.#nodes.length;
    }



    /**
     * Get the list of styles.
     * @return {Array<Style>} A copy of the styles array.
     */
    get styles()
    {
        return [...this.#stylesStack];
    }





    /**
     * Get the effect threshold.
     * @return {number} The threshold radius, in pixels.
     */
    get threshold()
    {
    	return this.#globalParams.threshold;
    }

    /**
     * Set the effect threshold.
     * @param {number} value - The new threshold radius, in pixels.
     */
    set threshold(value)
    {
    	this.#globalParams.threshold = Math.max(Validate.finite(value, "threshold"), 0);
    	this.#start();
    }





    /**
     * Get the effect runoff.
     * @return {number} The runoff radius, in pixels.
     */
    get runoff()
    {
    	return this.#globalParams.runoff;
    }

    /**
     * Set the effect runoff. A runoff of 0 gives a hard edge at the threshold.
     * @param {number} value - The new runoff radius, in pixels.
     */
    set runoff(value)
    {
    	this.#globalParams.runoff = Math.max(Validate.finite(value, "runoff"), 0);
    	this.#start();
    }





    /**
     * Get the effect boundary: the distance beyond which styles are at their far value.
     * @return {number} threshold + runoff, in pixels.
     */
    get boundary()
    {
    	return this.threshold + this.runoff;
    }





    /**
     * Get the effect scale.
     * @return {number} The multiplier for the effect's pixel distances.
     */
    get scaleEffect()
    {
        return this.#globalParams.scaleEffect;
    }

    /**
     * Set a multiplier for every pixel distance in the effect, so it can grow
     * or shrink with its container: threshold, runoff, offsets, jitter and
     * styles in px (translateX, translateY, translateZ, blur, and custom
     * styles with a px unit). Getters still return the values you set.
     * perspective isn't scaled, and min and max are applied before scaling.
     * @param {number} value - The new scale, 0 or more (negative values become 0).
     */
    set scaleEffect(value)
    {
        this.#globalParams.scaleEffect = Math.max(Validate.finite(value, "scaleEffect"), 0);
        for (const data of this.#nodeData)
        {
            data.styles.forEach((entry, i) => this.#resolveStyleValues(this.#stylesStack[i], entry));
        }
        this.#applyOffsets();
        this.#invalidate();
    }





    /**
     * Get the invert state.
     * @return {boolean} The invert value.
     */
    get invert()
    {
        return this.#globalParams.invert;
    }

    /**
     * Set the invert state.
     * @param {boolean} flag - The new invert value.
     */
    set invert(flag)
    {
        this.#globalParams.invert = Validate.boolean(flag, "invert");
        this.#start();
    }





    /**
     * Get whether the effect sets each node's z-index.
     * @return {boolean} The zIndex value.
     */
    get zIndex()
    {
        return this.#globalParams.zIndex;
    }

    /**
     * Set whether the effect sets each node's z-index from its distance, so the
     * nearest nodes sit on top. Turning it off gives the nodes their original z-index back.
     * @param {boolean} flag - The new zIndex value.
     */
    set zIndex(flag)
    {
        const was = this.#globalParams.zIndex;
        this.#globalParams.zIndex = Validate.boolean(flag, "zIndex");
        if (was && !flag && !this.#destroyed)
        {
            for (const data of this.#nodeData)
            {
                this.#restoreProperty(data, "zIndex");
            }
            this.#written.delete("zIndex");
        }
        this.#claimZIndex();
        this.#invalidate();
    }





    /**
     * Get whether the effect sets the parent's perspective-origin.
     * @return {boolean} The perspectiveOrigin value.
     */
    get perspectiveOrigin()
    {
        return this.#globalParams.perspectiveOrigin;
    }

    /**
     * Set whether the effect sets the nodes' parent's perspective-origin to
     * the centre of the nodes at rest, so a perspective on the parent is
     * viewed from the middle of the nodes rather than the middle of the
     * parent. It follows the nodes when they're measured again. The nodes
     * must share a parent; if they don't, it warns and sets nothing. Turning
     * it off gives the parent its original perspective-origin back.
     * @param {boolean} flag - The new perspectiveOrigin value.
     */
    set perspectiveOrigin(flag)
    {
        const was = this.#globalParams.perspectiveOrigin;
        this.#globalParams.perspectiveOrigin = Validate.boolean(flag, "perspectiveOrigin");
        if (this.#destroyed || flag===was)
        {
            return;
        }
        if (flag)
        {
            this.#claimOriginParent();
        }
        else
        {
            this.#releaseOriginParent();
        }
    }





    /**
     * Get the perspective distance given to each node's transform.
     * @return {number|null} The distance, in pixels, or null if there is none.
     */
    get perspective()
    {
        return this.#globalParams.perspective;
    }

    /**
     * Set a perspective distance for each node's transform. A parent's
     * perspective is viewed from the parent's perspective-origin, so nodes far
     * from it are seen at an angle; this views each node from the centre of
     * its own box at rest instead, wherever it sits on the page. It's put in
     * front of the transform styles, so it does nothing without one. Use it
     * instead of a perspective on the parent, not as well, or the two stack.
     * @param {number|null|undefined|false} num - A positive distance in pixels, or null, undefined, false or 0 for none.
     * @throws {TypeError} If the value is any other non-number (including "").
     * @throws {RangeError} If the value is negative, NaN or infinite.
     */
    set perspective(num)
    {
        const off = num==null || num===false || num===0;
        if (!off && Validate.finite(num, "perspective")<0)
        {
            throw new RangeError(`ProximityEffect: perspective must be positive (received ${num}).`);
        }
        this.#globalParams.perspective = off ? null : num;
        this.#invalidate();
    }





    /**
     * Get the easing rate as the target approaches.
     * @return {number} The attack value, from 0 to 1.
     */
    get attack()
    {
    	return this.#globalParams.attack;
    }

    /**
     * Set the easing rate as the target approaches: 1 follows straight away,
     * smaller values ease in more slowly, and 0 doesn't move at all.
     * @param {number} value - The new attack value, from 0 to 1 (clamped).
     */
    set attack(value)
    {
    	this.#globalParams.attack = AdashaUtils.constrain(Validate.finite(value, "attack"), 0, 1);
    	this.#start();
    }




    /**
     * Get the easing rate as the target moves away.
     * @return {number} The decay value, from 0 to 1.
     */
    get decay()
    {
    	return this.#globalParams.decay;
    }

    /**
     * Set the easing rate as the target moves away: 1 follows straight away,
     * smaller values ease out more slowly, and 0 doesn't move at all.
     * @param {number} value - The new decay value, from 0 to 1 (clamped).
     */
    set decay(value)
    {
    	this.#globalParams.decay = AdashaUtils.constrain(Validate.finite(value, "decay"), 0, 1);
    	this.#start();
    }





    /**
     * Get the global horizontal offset.
     * @return {number} The offset value, in pixels.
     */
    get offsetX()
    {
        return this.#globalParams.offsetX;
  	}

    /**
     * Get the global vertical offset.
     * @return {number} The offset value, in pixels.
     */
    get offsetY()
    {
        return this.#globalParams.offsetY;
  	}



    /**
     * Set the global horizontal offset.
     * @param {number} value - The new offset value, in pixels.
     */
    set offsetX(value)
    {
        this.#globalParams.offsetX = Validate.finite(value, "offsetX");
        this.#applyOffsets();
  	}

    /**
     * Set the global vertical offset.
     * @param {number} value - The new offset value, in pixels.
     */
    set offsetY(value)
    {
        this.#globalParams.offsetY = Validate.finite(value, "offsetY");
        this.#applyOffsets();
  	}





    /**
     * Get the jitter value.
     * @return {number} The jitter value, in pixels.
     */
    get jitter()
    {
        return this.#globalParams.jitter;
  	}

    /**
     * Get the jitterX value.
     * @return {number} The jitterX value, in pixels.
     */
    get jitterX()
    {
        return this.#globalParams.jitterX;
  	}

    /**
     * Get the jitterY value.
     * @return {number} The jitterY value, in pixels.
     */
    get jitterY()
    {
        return this.#globalParams.jitterY;
  	}



    /**
     * Set the jitter value.
     * @param {number} num - The new jitter value, in pixels.
     */
    set jitter(num)
    {
        this.#globalParams.jitter = Math.max(Validate.finite(num, "jitter"), 0);
        this.#applyOffsets();
  	}

    /**
     * Set the jitterX value.
     * @param {number} num - The new jitterX value, in pixels.
     */
    set jitterX(num)
    {
        this.#globalParams.jitterX = Math.max(Validate.finite(num, "jitterX"), 0);
        this.#applyOffsets();
  	}

    /**
     * Set the jitterY value.
     * @param {number} num - The new jitterY value, in pixels.
     */
    set jitterY(num)
    {
        this.#globalParams.jitterY = Math.max(Validate.finite(num, "jitterY"), 0);
        this.#applyOffsets();
  	}



    /**
     * Get the jitter method.
     * @returns {string} The random jitter method.
     */
    get jitterMethod()
    {
        return this.#globalParams.jitterMethod;
    }

    /**
     * Set the jitter method, and pick new random jitter for every node.
     * @param {string} method - "uniform" or "normal" ("gaussian" is an alias).
     */
    set jitterMethod(method)
    {
        this.#globalParams.jitterMethod = Validate.randomMethod(method, "jitter method");
        this.#rollJitters();
    }





    /**
     * Get the effect direction.
     * @return {string} The direction value.
     */
    get direction()
    {
        return this.#globalParams.direction;
    }

    /**
     * Set the effect direction.
     * @param {string} str - The new direction value, both|horizontal|vertical.
     */
    set direction(str)
    {
        if (this.#VALID_DIRECTIONS.has(str))
        {
        	this.#globalParams.direction = str;
        	this.#start();
        }
        else
        {
            throw new RangeError(`ProximityEffect: '${String(str)}' is not a valid direction. Use "both", "horizontal" or "vertical".`);
        }
    }





    /**
     * Get the frame rate limit.
     * @return {number|null} The frame rate, or null to follow the screen refresh.
     */
    get FPS()
    {
    	return this.#globalParams.FPS;
    }

    /**
     * Set the frame rate limit.
     * @param {number|null|undefined|false} num - A positive frame rate, or null, undefined, false or 0 to follow the screen refresh.
     * @throws {TypeError} If the value is any other non-number (including "").
     * @throws {RangeError} If the value is negative, NaN or infinite.
     */
    set FPS(num)
    {
        const off = num==null || num===false || num===0;
        if (!off && Validate.finite(num, "FPS")<0)
        {
            throw new RangeError(`ProximityEffect: FPS must be positive (received ${num}).`);
        }
        this.#globalParams.FPS = off ? null : num;
        this.#lastFrameTime = undefined;
    }





    /**
     * Get the easing tolerance.
     * @return {number} The tolerance value.
     */
    get tolerance()
    {
        return this.#globalParams.tolerance;
    }

    /**
     * Set the easing tolerance: once an eased distance is within this amount
     * of its target it snaps to the target, letting the animation come to rest.
     * Larger values settle sooner but end with a bigger final step.
     * @param {number} num - The new tolerance, from 0 to 1 (clamped).
     */
    set tolerance(num)
    {
        this.#globalParams.tolerance = AdashaUtils.constrain(Validate.finite(num, "tolerance"), 0, 1);
        this.#start();
    }





    /**
     * Get what the effect does when the user prefers reduced motion.
     * @return {string} "rest", "snap" or "ignore".
     */
    get reducedMotion()
    {
        return this.#globalParams.reducedMotion;
    }

    /**
     * Set what the effect does when the user prefers reduced motion (the
     * prefers-reduced-motion media query, which is followed as it changes):
     * "rest" keeps the nodes at rest, as though nothing were being tracked;
     * "snap" follows the pointer or target without easing; "ignore" carries on as normal.
     * @param {string} mode - "rest", "snap" or "ignore".
     * @throws {RangeError} If the mode is not one of those.
     */
    set reducedMotion(mode)
    {
        if (!this.#VALID_REDUCED_MOTION.has(mode))
        {
            throw new RangeError(`ProximityEffect: '${String(mode)}' is not a valid reducedMotion. Use "rest", "snap" or "ignore".`);
        }
        this.#globalParams.reducedMotion = mode;
        this.#start();
    }



    /**
     * Whether motion is being reduced right now: the user prefers reduced
     * motion and reducedMotion isn't "ignore".
     * @return {boolean} True if motion is being reduced.
     */
    get motionReduced()
    {
        return this.#prefersReducedMotion && this.reducedMotion!=="ignore";
    }



    /**
     * Get what the effect does when a touch or pen lifts.
     * @return {string} "rest" or "hold".
     */
    get pointerLeave()
    {
        return this.#globalParams.pointerLeave;
    }

    /**
     * Set what the effect does when a touch or pen lifts: "rest" lets the
     * nodes settle back to rest; "hold" keeps the last point, on the same spot
     * on the page as it scrolls, until the next pointer event. A mouse leaving
     * the page, or the window losing focus, always rests. Setting "rest" drops
     * a held point.
     * @param {string} mode - "rest" or "hold".
     * @throws {RangeError} If the mode is not one of those.
     */
    set pointerLeave(mode)
    {
        if (!this.#VALID_POINTER_LEAVE.has(mode))
        {
            throw new RangeError(`ProximityEffect: '${String(mode)}' is not a valid pointerLeave. Use "rest" or "hold".`);
        }
        this.#globalParams.pointerLeave = mode;
        if (mode==="rest" && this.#held!==null)
        {
            this.#held = null;
            this.#start();
        }
    }



    /**
     * Get what keeps touch drags for the effect.
     * @return {boolean|Element} true (each node), the element, or false.
     */
    get touchDrag()
    {
        return this.#globalParams.touchDrag;
    }

    /**
     * Set what keeps a touch dragging over the effect for the effect, so the
     * point follows the finger instead of the page scrolling (the browser
     * would cancel the pointer as the scroll starts). It sets touch-action:
     * pinch-zoom, which still lets people zoom. true sets it on each node, so
     * a drag that starts between them still scrolls; an element, such as the
     * nodes' container, sets it on that element, so its gaps count too. Keep
     * that element smaller than the screen, or the page can't be scrolled by
     * touching it. false or null gives the original touch-action back.
     * @param {boolean|Element|null} value - true, an element, or false or null.
     * @throws {TypeError} If the value is anything else.
     */
    set touchDrag(value)
    {
        if (value!=null && typeof value!=="boolean" && !(value instanceof Element))
        {
            throw new TypeError(`ProximityEffect: touchDrag must be true, false, null or an element (received ${String(value)}).`);
        }
        const next = value ?? false;
        if (next===this.#globalParams.touchDrag)
        {
            return;
        }
        if (!this.#destroyed)
        {
            this.#releaseDrags();
        }
        this.#globalParams.touchDrag = next;
        if (!this.#destroyed)
        {
            this.#claimDrags();
        }
    }



    /**
     * Get the last known pointer coordinates, relative to the viewport, in pixels.
     * With pointerLeave "hold", this is the held point after a touch or pen lifts.
     * @return {Object|null} An object containing x and y properties, or null before the pointer has moved and after it leaves the page (or lifts, unless held).
     */
    get pointer()
    {
        const point = this.#pointer ?? this.#heldPoint();
        return point ? { x: point.x, y: point.y } : null;
    }



    /**
     * Whether the effect is paused.
     * @return {boolean} True between pause() and resume().
     */
    get paused()
    {
        return this.#paused;
    }



    /**
     * Whether the nodes have settled: the last frame the loop drew changed
     * nothing, and nothing has woken it since. Pausing doesn't change it.
     * @return {boolean} True between the 'rest' and 'wake' events.
     */
    get resting()
    {
        return this.#atRest;
    }



    /**
     * Whether the instance has been destroyed.
     * @return {boolean} True once destroy() has been called.
     */
    get destroyed()
    {
        return this.#destroyed;
    }





    ////////////////////////////
    //                        //
    //     PUBLIC METHODS     //
    //                        //
    ////////////////////////////



    /**
     * Add a new style rule to the styles animation stack.
     * @param {string|Object} property - The predefined style rule as a string, or an object containing a CSS style configuration.
     * @param {string} [property.rule] - The CSS property to write, in camelCase or kebab-case, or a custom property ("--name").
     * @param {string} [property.func] - The CSS function of the given style rule.
     * @param {number} [property.min] - The minimum style value.
     * @param {number} [property.max] - The maximum style value.
     * @param {number} [property.default] - The default style value.
     * @param {string} [property.unit] - The style rule's CSS unit.
     * @param {Array<number|Object>} keyframes - The near and far style values. Each is a number, or an object with a numeric value and optional scatter and scatterMethod.
     * Keyframes in between, and a keyframe distance, are planned for 4.3; passing them throws a RangeError.
     * @param {Object} [params] - An object containing additional effect parameters.
     * @param {string} [params.id] - A name for the style, which hasStyle(), removeStyle() and updateStyle() accept.
     * Per-style threshold, runoff, invert, attack and decay are planned for 4.2; passing them throws a RangeError.
     * @throws {TypeError} If an argument is the wrong type.
     * @throws {RangeError} If a value is not allowed (see Style).
     * @throws {Error} If the instance has been destroyed.
     */
    addStyle(property, keyframes, params)
    {
        this.#assertAlive("add a style to");
        // work everything out before changing anything, so a failure leaves the stack as it was
        const style  = new Style(property, keyframes, params),
              values = this.#nodeData.map(() => this.#styleValues(style));

        this.#stylesStack.push(style);
        this.#nodeData.forEach((data, i) => data.styles.push(values[i]));
        this.#groupStyles();
        this.#invalidate();
    }



    /**
     * Check if a named style is on the stack.
     * @param {string} name - The preset name, a custom style's func (or rule if it has none), or the id given in the style's params.
     * @return {boolean} True if the style exists at least once.
     * @throws {TypeError} If the name is not a string.
     */
    hasStyle(name)
    {
        Validate.string(name, "style name");
        return this.#stylesStack.some(style => this.#styleMatches(style, name));
    }



    /**
     * Remove all instances of a style from the stack. CSS properties no longer
     * animated by any style get the nodes' original inline values back.
     * @param {string} name - The preset name, a custom style's func (or rule if it has none), or the id given in the style's params.
     * @return {boolean} True if anything was removed.
     * @throws {TypeError} If the name is not a string.
     * @throws {Error} If the instance has been destroyed.
     */
    removeStyle(name)
    {
        this.#assertAlive("remove a style from");
        Validate.string(name, "style name");
        // rule key => a spelling to restore it with
        const rules = new Map();

        // backwards, so splicing doesn't skip entries
        for (let i=this.#stylesStack.length-1; i>=0; i--)
        {
            const style = this.#stylesStack[i];
            if (this.#styleMatches(style, name))
            {
                rules.set(ruleKey(style.rule), style.rule);
                this.#stylesStack.splice(i, 1);
                for (const data of this.#nodeData)
                {
                    data.styles.splice(i, 1);
                }
            }
        }

        if (this.zIndex && this.#stylesStack.length===0 && rules.size>0)
        {
            rules.set("zIndex", "zIndex");
        }
        for (const [key, rule] of rules)
        {
            if (!this.#stylesStack.some(style => ruleKey(style.rule)===key))
            {
                for (const data of this.#nodeData)
                {
                    this.#restoreProperty(data, rule);
                }
                this.#written.delete(key);
            }
        }

        if (rules.size>0)
        {
            this.#groupStyles();
            this.#invalidate();
        }
        return rules.size>0;
    }



    /**
     * Change the keyframes of every matching style, keeping its place in the
     * stack, its params and each node's scatter. A keyframe whose scatter
     * method changes picks new scatter, since the new method has a different
     * spread. To change the property, remove the style and add a new one.
     * @param {string} name - The preset name, a custom style's func (or rule if it has none), or the id given in the style's params.
     * @param {Array<number|Object>} keyframes - The new near and far keyframes, as for addStyle(). They are checked against each matching style.
     * @return {boolean} True if anything was updated.
     * @throws {TypeError} If an argument is the wrong type.
     * @throws {RangeError} If a value is not allowed for a matching style (see Style).
     * @throws {Error} If the instance has been destroyed.
     */
    updateStyle(name, keyframes)
    {
        this.#assertAlive("update a style on");
        Validate.string(name, "style name");
        // build every replacement before changing anything, so a failure leaves the stack as it was
        const updates = [];
        this.#stylesStack.forEach((style, index) =>
        {
            if (this.#styleMatches(style, name))
            {
                updates.push({ index, style: Style.withKeyframes(style, keyframes) });
            }
        });

        for (const { index, style } of updates)
        {
            const old = this.#stylesStack[index];
            this.#stylesStack[index] = style;
            for (const data of this.#nodeData)
            {
                this.#restyleValues(old, style, data.styles[index]);
            }
        }

        // the rule and func are unchanged, so the grouping still holds
        if (updates.length>0)
        {
            this.#invalidate();
        }
        return updates.length>0;
    }




    /**
     * Get the normalised distance (0 to 1) to the current target from the given node, as of the last frame.
     * @param {Element} n - The node to check.
     * @return {number|undefined} The distance, or undefined before the first frame.
     * @throws {RangeError} If the node isn't controlled by this instance.
     */
    distanceFrom(n)
    {
        return this.getNodeData(n, "distance");
    }



    /**
     * Get the normalised distance (0 to 1) to the current target from the given node index, as of the last frame.
     * @param {number} i - The node index to check.
     * @return {number|undefined} The distance, or undefined before the first frame.
     * @throws {TypeError} If the index is not a number.
     * @throws {RangeError} If the index is not a whole number within the node list.
     */
    distanceFromIndex(i)
    {
        return this.getNodeIndexData(i, "distance");
    }



    /**
     * Get the given node's eased value as of the last frame, from 0 (near) to 1 (far):
     * the value its styles were drawn with, after attack and decay, with invert applied.
     * Cheap enough to call for every node in each frame: nothing is copied.
     * @param {Element} n - The node to check.
     * @return {number|undefined} The value, or undefined before the first frame.
     * @throws {RangeError} If the node isn't controlled by this instance.
     */
    valueFrom(n)
    {
        const index = this.#nodes.indexOf(n);
        if (index<0)
        {
            throw new RangeError("ProximityEffect: that node is not controlled by this instance.");
        }
        return this.#easedValue(this.#nodeData[index]);
    }



    /**
     * Get the given node index's eased value as of the last frame, from 0 (near) to 1 (far):
     * the value its styles were drawn with, after attack and decay, with invert applied.
     * Cheap enough to call for every node in each frame: nothing is copied.
     * @param {number} i - The node index to check.
     * @return {number|undefined} The value, or undefined before the first frame.
     * @throws {TypeError} If the index is not a number.
     * @throws {RangeError} If the index is not a whole number within the node list.
     */
    valueFromIndex(i)
    {
        return this.#easedValue(this.#nodeData[this.#checkIndex(i)]);
    }





    /**
     * Clear the target, reverting to tracking the pointer.
     */
    clearTarget()
    {
        this.target = null;
    }





    /**
     * Return an object containing manual coordinates, if specified.
     * @return {Object|null} An object containing x and y properties, or null.
     */
    getCoords()
    {
        return this.#coords ? { ...this.#coords } : null;
    }

    /**
     * Manually specify coordinates, which take priority over the target and pointer.
     * @param {number} x - The horizontal coordinate, relative to the viewport, in pixels.
     * @param {number} y - The vertical coordinate, relative to the viewport, in pixels.
     */
    setCoords(x, y)
    {
        this.#coords = { x: Validate.finite(x, "x coordinate"), y: Validate.finite(y, "y coordinate") };
        this.#start();
    }


    /**
     * Clear manual coordinates if specified, returning to target-based coordinates.
     */
    clearCoords()
    {
        this.#coords = null;
        this.#start();
    }





    /**
     * Measure each node's centre point now, including global offset and jitter.
     * The instance remeasures by itself when the page scrolls or resizes, so this
     * is only needed after moving nodes in a way it can't detect.
     * @throws {Error} If the instance has been destroyed.
     */
    setCenterPoints()
    {
        this.#assertAlive("measure");
        this.#measure(this.#nodeData);
        this.#start();
    }



    /**
     * Pause the effect. Nodes keep their current styles.
     */
    pause()
    {
        this.#paused = true;
        this.#stop();
    }



    /**
     * Resume a paused effect.
     * @throws {Error} If the instance has been destroyed.
     */
    resume()
    {
        this.#assertAlive("resume");
        this.#paused = false;
        // anything that changed while paused has already asked for a frame; a
        // settled effect with nothing new stays settled, so resume() doesn't wake it
        if (this.#awake || this.#changed || !this.#atRest || this.#followingTarget())
        {
            this.#schedule();
        }
    }



    /**
     * Stop the effect for good: remove every listener, stop the animation loop
     * and give each node its original values back for the properties the effect
     * set, keeping any other inline styles. Safe to call more than once.
     */
    destroy()
    {
        if (this.#destroyed)
        {
            return;
        }
        this.#destroyed = true;
        this.#abort.abort();
        this.#shadowRoots.forEach(abort => abort.abort());
        this.#shadowRoots.clear();
        this.#resizeObserver?.disconnect();
        this.#stop();

        for (const data of this.#nodeData)
        {
            this.#restoreWritten(data);
        }
        this.#written.clear();
        this.#releaseOriginParent();
        // the nodes' touch-action went back with the other written properties
        this.#releaseDragArea();
    }





    /**
     * A snapshot of one node's effect data. It's a copy, so changing it has no
     * effect. Fields that have no value yet (before the node is measured or the
     * first frame is drawn) are left out.
     * @typedef {Object} NodeData
     * @property {Element} node - A reference to the node.
     * @property {Object} [measured] - The node's measured centre point (relative to the viewport, with any data-offsetx/data-offsety applied).
     * @property {Object} [center] - The node's centre point, including global offset and jitter.
     * @property {Object} jitter - The node's random x and y jitter.
     * @property {number} [distance] - The normalised distance to the target as of the last frame.
     * @property {number} [lastDelta] - The eased distance as of the last frame.
     * @property {Array<Object>} styles - The node's near and far values for each style on the stack, in stack order.
     */
    /**
     * Return a snapshot of the given node's effect data, or one property of that data.
     * @param {Element} n - The node to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {*|NodeData} A copy of the chosen property's value (undefined for anything that isn't a NodeData property), or the node's data.
     * @throws {RangeError} If the node isn't controlled by this instance.
     */
    getNodeData(n, prop)
    {
        const index = this.#nodes.indexOf(n);
        if (index<0)
        {
            throw new RangeError("ProximityEffect: that node is not controlled by this instance.");
        }
        return this.#readNodeData(this.#nodeData[index], prop);
    }



    /**
     * Return a snapshot of the given node index's effect data, or one property of that data.
     * @param {number} i - The node index to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {*|NodeData} A copy of the chosen property's value (undefined for anything that isn't a NodeData property), or the node's data.
     * @throws {TypeError} If the index is not a number.
     * @throws {RangeError} If the index is not a whole number within the node list.
     */
    getNodeIndexData(i, prop)
    {
        return this.#readNodeData(this.#nodeData[this.#checkIndex(i)], prop);
    }




    /**
     * Return a boolean determining if the given node has the given data.
     * @param {number} i - The node index to check.
     * @param {string} prop - The data property to check.
     * @return {boolean} True if the property is a NodeData property with a value, false otherwise.
     * @throws {TypeError} If the index is not a number.
     * @throws {RangeError} If the index is not a whole number within the node list.
     */
    hasNodeIndexData(i, prop)
    {
        return this.#readNodeData(this.#nodeData[this.#checkIndex(i)], prop)!==undefined;
    }





	///////////////////////////////
    //                           //
	//      PRIVATE METHODS      //
    //                           //
	///////////////////////////////



    // calls that would touch the nodes or start listening again can't
    // be made once destroy() has handed the nodes back
    #assertAlive(action)
    {
        if (this.#destroyed)
        {
            throw new Error(`ProximityEffect: cannot ${action} a destroyed instance.`);
        }
    }



    #init()
    {
        if (this.#ready || this.#destroyed)
        {
            return;
        }
        this.#ready = true;
        this.#measure(this.#nodeData);

        const options = { signal: this.#abort.signal, passive: true };
        // capture, so scrolling inside any container is seen as well as the page
        document.addEventListener("scroll", this.#onScroll, { ...options, capture: true });
        this.#listenInShadowRoots();
        window.addEventListener("resize", this.#onReflow, options);
        // pointerdown too, since a touch has no pointermove before it starts
        document.addEventListener("pointermove", this.#onPointerMove, options);
        document.addEventListener("pointerdown", this.#onPointerMove, options);
        document.addEventListener("pointerout", this.#onPointerOut, options);
        window.addEventListener("blur", this.#onBlur, options);
        document.addEventListener("visibilitychange", this.#onVisibility, options);

        if (typeof window.matchMedia==="function")
        {
            const query = window.matchMedia("(prefers-reduced-motion: reduce)");
            this.#prefersReducedMotion = query.matches;
            query.addEventListener("change", this.#onMotionPref, options);
        }

        if (typeof ResizeObserver!=="undefined")
        {
            // nodes, or the page around them, changing size moves the centres
            this.#resizeObserver = new ResizeObserver(this.#onResize);
            this.#resizeObserver.observe(document.documentElement);
            this.#observe(this.#nodes);
        }

        this.dispatchEvent(new Event("ready"));
        this.#start();
    }



    // Scroll events don't leave the shadow root they happen in, so listen in
    // every shadow root that holds a node, or holds the host of one that does.
    #listenInShadowRoots()
    {
        const roots = new Set();
        for (const node of this.#nodes)
        {
            for (let root = node.getRootNode(); root instanceof ShadowRoot && !roots.has(root); root = root.host.getRootNode())
            {
                roots.add(root);
            }
        }

        for (const [root, abort] of this.#shadowRoots)
        {
            if (!roots.has(root))
            {
                abort.abort();
                this.#shadowRoots.delete(root);
            }
        }
        for (const root of roots)
        {
            if (!this.#shadowRoots.has(root))
            {
                const abort = new AbortController();
                root.addEventListener("scroll", this.#onScroll, { capture: true, passive: true, signal: abort.signal });
                this.#shadowRoots.set(root, abort);
            }
        }
    }



    #observe(nodes)
    {
        for (const node of nodes)
        {
            this.#resizeObserver?.observe(node);
        }
    }



    // the loop only runs while there's something to draw; anything that could
    // change the output calls this to wake it
    #start()
    {
        this.#awake = true;
        this.#schedule();
    }



    // ask for the next frame without saying anything has changed
    #schedule()
    {
        if (this.#ready && !this.#paused && !this.#destroyed && this.#frameId===null
            && document.visibilityState!=="hidden")
        {
            this.#frameId = requestAnimationFrame(this.#onFrame);
        }
    }



    // the styles need writing even for nodes whose distance hasn't changed
    #invalidate()
    {
        this.#needsRewrite = true;
        this.#start();
    }



    // remeasure on the next frame, so a burst of scroll or resize events costs one measurement
    #requestMeasure()
    {
        this.#needsMeasure = true;
        this.#start();
    }



    // The observer reports after layout, in the same frame as the writes that
    // caused it. Size changes the effect made itself can't move the centres,
    // since #measure takes its styles off first, so only other changes count.
    // An element's first report is just its size when observing began; it was
    // measured then (in #init, or after nodes changed), so it's skipped.
    #resized(entries)
    {
        let external = false;
        for (const { target } of entries)
        {
            if (!this.#sizeReported.has(target))
            {
                this.#sizeReported.add(target);
            }
            else if (!this.#ownResizes.has(target))
            {
                external = true;
            }
        }
        this.#ownResizes.clear();

        if (external && this.#ready && !this.#destroyed)
        {
            // sizes can change every frame (the page reflowing around nodes the
            // effect resizes, images loading), so measure once things settle
            this.#measureWhenSettled = true;
            this.#start();
        }
    }



    #visibilityChange()
    {
        if (document.visibilityState==="hidden")
        {
            this.#stop();
        }
        else
        {
            // the page may have changed while hidden
            this.#requestMeasure();
        }
    }



    #stop()
    {
        if (this.#frameId!==null)
        {
            cancelAnimationFrame(this.#frameId);
            this.#frameId = null;
        }
    }



    // the one animation clock; FPS throttles it rather than running a second timer
    #frame(timestamp)
    {
        this.#frameId = null;

        const fps = this.FPS;
        const due = !fps || this.#lastFrameTime===undefined
            // 1ms tolerance, so 30fps on a 60Hz screen draws every other frame
            || timestamp - this.#lastFrameTime >= 1000/fps - 1;

        if (!due)
        {
            this.#schedule();
            return;
        }

        this.#lastFrameTime = timestamp;
        const awake = this.#awake;
        this.#awake = false;
        // marks from earlier frames have already been reported, if they resized anything
        this.#ownResizes.clear();

        let moved = false;
        if (this.#needsMeasure || (this.#measureWhenSettled && !this.#changed))
        {
            moved = this.#measure(this.#nodeData);
        }
        else if (this.#needsPinnedMeasure)
        {
            moved = this.#measure(this.#pinnedToMeasure());
        }
        if (moved)
        {
            this.dispatchEvent(new Event("reflow"));
        }

        // when the only reason for this frame is following the target, and it
        // hasn't moved, there's nothing to draw
        const idle = !awake && !moved && !this.#changed;
        if (!(idle && this.#followingTarget() && this.#samePoint(this.#targetPoint(), this.#lastTargetPoint)))
        {
            if (this.#atRest)
            {
                this.#atRest = false;
                this.dispatchEvent(new Event("wake"));
            }
            // outside code gets its turn before the frame is drawn, so changes
            // it makes now (updateStyle(), setCoords()) show in this frame
            this.dispatchEvent(new Event("beforeupdate"));
            if (this.#destroyed)
            {
                return;
            }
            this.update();
            this.dispatchEvent(new Event("redraw"));
            if (this.#destroyed)
            {
                return;
            }

            // settled once a drawn frame changes nothing and nothing is waiting
            if (!this.#changed && !this.#measureWhenSettled && !this.#awake && !this.#needsMeasure)
            {
                this.#atRest = true;
                this.dispatchEvent(new Event("rest"));
            }
        }

        // keep going while nodes are still easing, or a measurement is waiting
        // for them to stop. A target element is followed every frame, since it
        // can move without any event to say so.
        if (this.#changed || this.#measureWhenSettled || this.#followingTarget())
        {
            this.#schedule();
        }
    }



    // set coordinates take over from the target, so it needn't be watched
    #followingTarget()
    {
        return this.target!=null && this.#coords===null && !this.#reducedToRest();
    }



    // reduced motion in "rest" mode: nothing is tracked, so the nodes stay at rest
    #reducedToRest()
    {
        return this.motionReduced && this.reducedMotion==="rest";
    }



    #motionPreference(reduce)
    {
        this.#prefersReducedMotion = reduce;
        this.#start();
    }



    #samePoint(a, b)
    {
        return a!==null && b!==null && a.x===b.x && a.y===b.y;
    }



    // Measure nodes' centres without the effect's styles applied. Done in
    // three passes (write, read, write) so the page is laid out once, not
    // once per node. Only the properties that can move a node's box are put
    // back to their original values, one by one: replacing the whole cssText
    // would make the browser redo layout for every node. Custom properties are
    // left on: most pages use them for paint, and taking them off would restyle
    // everything that reads them. A page that uses one in layout gets its nodes
    // measured with it applied. Returns whether any node's position changed.
    #measure(all)
    {
        if (all===this.#nodeData)
        {
            this.#needsMeasure = false;
            this.#measureWhenSettled = false;
        }
        this.#needsPinnedMeasure = false;
        // bring every centre up to the current page scroll first, so the nodes
        // left out of a partial measure match the ones measured now
        this.#followScroll();

        const rules = [...new Map(this.#styleGroups.map(group => [group.key, group.rule])).entries()]
                  .filter(([key]) => !paintOnly(key))
                  .map(([, rule]) => rule),
              saved = all.map(data => rules.map(rule => readRule(data.node.style, rule)));

        for (const data of all)
        {
            for (const rule of rules)
            {
                writeRule(data.node.style, rule, this.#originalValue(data, rule));
            }
        }

        // read pass: positions, and whether each node scrolls with the page
        const bounds = all.map(data => data.node.getBoundingClientRect()),
              cache  = new Map(),
              pinned = all.map(data => this.#isPinned(data.node, cache)),
              parent = all===this.#nodeData && this.#originParent?.getBoundingClientRect();

        let moved = false;
        all.forEach((data, i) =>
        {
            const b    = bounds[i],
                  node = data.node,
                  last = data.measured;
            rules.forEach((rule, r) =>
            {
                writeRule(node.style, rule, saved[i][r]);
            });
            data.measured = {
                x: (b.left+b.right )*0.5 - this.#dataOffset(node.dataset.offsetx),
                y: (b.top +b.bottom)*0.5 - this.#dataOffset(node.dataset.offsety)
            };
            // scroll-shifted centres can be off by rounding noise, not a real move
            moved ||= !last
                || Math.abs(data.measured.x-last.x)>0.01
                || Math.abs(data.measured.y-last.y)>0.01;
            data.scrollsWithPage = !pinned[i];
            this.#applyOffset(data);
        });
        if (parent)
        {
            this.#setOrigin(bounds, parent);
        }
        return moved;
    }



    // Use the nodes' parent for perspectiveOrigin, giving back any parent
    // used before. Nodes with different parents warn, and none is used.
    #claimOriginParent()
    {
        const parents = new Set(this.#nodes.map(node => this.#parentOf(node))),
              [parent] = parents;
        if (parents.size>1 || !parent)
        {
            this.#releaseOriginParent();
            console.warn("ProximityEffect: perspectiveOrigin needs every node to share a parent element, and these don't, so it has no effect.");
            return;
        }
        if (parent!==this.#originParent)
        {
            this.#releaseOriginParent();
            this.#originParent = parent;
            this.#originParentValue = parent.style.perspectiveOrigin;
        }
        if (this.#ready)
        {
            this.#requestMeasure();
        }
    }



    // touch-action: pinch-zoom keeps one-finger drags for the page's pointer
    // events (no scroll, so no pointercancel), and still lets people zoom
    #claimDrags()
    {
        const value = this.#globalParams.touchDrag;
        if (value===true)
        {
            for (const data of this.#nodeData)
            {
                data.node.style.touchAction = "pinch-zoom";
            }
            this.#written.set("touchAction", "touchAction");
        }
        else if (value)
        {
            this.#dragArea = value;
            this.#dragAreaValue = value.style.touchAction;
            value.style.touchAction = "pinch-zoom";
        }
    }



    #releaseDrags()
    {
        if (this.#globalParams.touchDrag===true)
        {
            for (const data of this.#nodeData)
            {
                this.#restoreProperty(data, "touchAction");
            }
            this.#written.delete("touchAction");
        }
        this.#releaseDragArea();
    }



    #releaseDragArea()
    {
        if (this.#dragArea)
        {
            this.#dragArea.style.touchAction = this.#dragAreaValue;
            this.#dragArea = null;
        }
    }



    #releaseOriginParent()
    {
        if (this.#originParent)
        {
            this.#originParent.style.perspectiveOrigin = this.#originParentValue;
            this.#originParent = null;
        }
    }



    // Put the parent's perspective-origin at the centre of the nodes' boxes,
    // measured at rest. Percentages of the parent's box, so they still hold
    // if the parent itself is scaled or moved.
    #setOrigin(bounds, parent)
    {
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (const b of bounds)
        {
            left   = Math.min(left, b.left);
            right  = Math.max(right, b.right);
            top    = Math.min(top, b.top);
            bottom = Math.max(bottom, b.bottom);
        }
        const share = (at, start, size) => size>0 ? `${(at-start)/size*100}%` : "50%";

        this.#originParent.style.perspectiveOrigin =
            `${share((left+right)*0.5, parent.left, parent.width)} ${share((top+bottom)*0.5, parent.top, parent.height)}`;
    }



    // The nodes to measure after a page scroll: the fixed and sticky ones, plus
    // any node they sit inside, since its transform moves them. Layout styles
    // (width, font size...) can move any node, so with those everything is measured.
    #pinnedToMeasure()
    {
        const pinned = this.#nodeData.filter(data => data.scrollsWithPage===false);
        if (pinned.length===0)
        {
            return pinned;
        }
        if (this.#styleGroups.some(group => group.resizes))
        {
            return this.#nodeData;
        }

        const byNode = new Map(this.#nodeData.map(data => [data.node, data])),
              found  = new Set(pinned);
        for (const data of pinned)
        {
            for (let el = this.#parentOf(data.node); el; el = this.#parentOf(el))
            {
                const ancestor = byNode.get(el);
                if (ancestor)
                {
                    found.add(ancestor);
                }
            }
        }
        return [...found];
    }



    // the element's parent, or the host of the shadow root it's at the top of
    #parentOf(el)
    {
        return el.parentElement ?? el.getRootNode().host;
    }



    // whether an element, or anything it sits inside, is fixed or sticky, so
    // it doesn't simply move with the page when it scrolls. Shared ancestors
    // are only looked up once per measurement.
    #isPinned(el, cache)
    {
        if (!el)
        {
            return false;
        }
        if (!cache.has(el))
        {
            const position = getComputedStyle(el).position;
            cache.set(el, position==="fixed" || position==="sticky"
                || this.#isPinned(this.#parentOf(el), cache));
        }
        return cache.get(el);
    }



    // A page scroll moves every node that isn't fixed or sticky by exactly the
    // scroll distance, so their centres are shifted rather than remeasured.
    #followScroll()
    {
        const dx = window.scrollX - this.#scrollX,
              dy = window.scrollY - this.#scrollY;

        if (dx===0 && dy===0)
        {
            return;
        }
        this.#scrollX += dx;
        this.#scrollY += dy;
        for (const data of this.#nodeData)
        {
            if (data.scrollsWithPage && data.measured)
            {
                data.measured.x -= dx;
                data.measured.y -= dy;
                this.#applyOffset(data);
            }
        }
    }



    #scrolled(evt)
    {
        const target = evt.target;
        if (target===document)
        {
            // update() moves the nodes that scroll with the page; the rest need measuring
            if (this.#nodeData.some(data => data.scrollsWithPage===false))
            {
                this.#needsPinnedMeasure = true;
            }
            this.#start();
        }
        else if (!this.#needsMeasure && target instanceof Node
            && this.#nodes.some(node => this.#isInside(node, target)))
        {
            this.#requestMeasure();
        }
    }



    // like container.contains(el), but also looking out of shadow roots to their hosts
    #isInside(el, container)
    {
        for (let parent = el; parent; parent = parent.parentNode ?? parent.host)
        {
            if (parent===container)
            {
                return true;
            }
        }
        return false;
    }



    // a node's centre is where it was measured, moved by the global offset and
    // its jitter, both scaled by scaleEffect
    #applyOffset(data)
    {
        const { offsetX, offsetY, scaleEffect } = this.#globalParams;
        this.#resolveJitter(data);
        if (data.measured)
        {
            data.center ??= {};
            data.center.x = data.measured.x - offsetX*scaleEffect + data.jitter.x;
            data.center.y = data.measured.y - offsetY*scaleEffect + data.jitter.y;
        }
    }



    #applyOffsets()
    {
        for (const data of this.#nodeData)
        {
            this.#applyOffset(data);
        }
        this.#start();
    }



    // Group the stack by CSS property, so functions that share one (transform,
    // filter) are written together, with the first style's spelling. Plain
    // properties come first, in stack order. A custom property might be used
    // in layout, so it counts as resizing: the observer then ignores size
    // changes it makes, as it does for width.
    #groupStyles()
    {
        const plain = [],
              funcs = new Map();

        this.#stylesStack.forEach((style, index) =>
        {
            const item    = { index, func: style.func, unit: style.unit || "" },
                  key     = ruleKey(style.rule),
                  custom  = isCustomProperty(key),
                  resizes = !SIZE_NEUTRAL_RULES.has(key);
            if (!style.func)
            {
                plain.push({ rule: style.rule, key, custom, resizes, items: [item] });
            }
            else
            {
                if (!funcs.has(key))
                {
                    funcs.set(key, { rule: style.rule, key, custom, resizes, transform: TRANSFORM_RULES.has(key), items: [] });
                }
                funcs.get(key).items.push(item);
            }
        });

        this.#styleGroups = [...plain, ...funcs.values()];
        for (const group of this.#styleGroups)
        {
            this.#written.set(group.key, group.rule);
        }
        this.#claimZIndex();
    }



    // z-index is written while it's on and there's a style to draw
    #claimZIndex()
    {
        if (this.#globalParams.zIndex && this.#styleGroups.length>0)
        {
            this.#written.set("zIndex", "zIndex");
        }
    }



    #toElementArray(list)
    {
        let nodes;
        if (list instanceof Element)
        {
            nodes = [list];
        }
        else if (list instanceof NodeList || list instanceof HTMLCollection || Array.isArray(list))
        {
            nodes = [...new Set(list)];
        }
        else
        {
            throw new TypeError(`ProximityEffect: ${list} is not an Element, NodeList, HTMLCollection or array of Elements.`);
        }

        if (nodes.length<1)
        {
            throw new RangeError("ProximityEffect: no nodes were given.");
        }
        if (!nodes.every(node => node instanceof Element))
        {
            throw new TypeError("ProximityEffect: every node must be an Element.");
        }
        return nodes;
    }



    #createNodeData(node)
    {
        const data = {
            node:       node,
            style:      node.style.cssText,
            hadStyle:   node.hasAttribute("style"),
            lastDelta:  this.#globalParams.primeDistances ? 1 : undefined,
            jitterUnit: this.#rollJitter(),
            styles:     this.#stylesStack.map(style => this.#styleValues(style))
        };
        this.#resolveJitter(data);
        return data;
    }



    // A style entry for one node. Scatter is kept as a unit roll, so a new
    // scatter amount (updateStyle, scaleEffect) moves the node the same way
    // without rolling again. Every frame gets a roll, even with no scatter, so
    // one that gains scatter later has one ready. near and far are the
    // resolved values #writeStyles() reads.
    #styleValues(style)
    {
        const entry = { nearUnit: this.#rollScatter(style.near), farUnit: this.#rollScatter(style.far) };
        return this.#resolveStyleValues(style, entry);
    }



    #scatterMethod(frame)
    {
        const method = frame.scatterMethod ?? this.#DEFAULT_SCATTER_METHOD;
        return method==="gaussian" ? "normal" : method;
    }



    #rollScatter(frame)
    {
        return AdashaUtils.random(1, this.#scatterMethod(frame));
    }



    // A node's entry for a style whose keyframes have changed: keep each
    // frame's roll unless its method changed, then resolve the new values.
    #restyleValues(old, style, entry)
    {
        if (this.#scatterMethod(old.near)!==this.#scatterMethod(style.near))
        {
            entry.nearUnit = this.#rollScatter(style.near);
        }
        if (this.#scatterMethod(old.far)!==this.#scatterMethod(style.far))
        {
            entry.farUnit = this.#rollScatter(style.far);
        }
        return this.#resolveStyleValues(style, entry);
    }



    // min and max are in the style's own units at the size it was written for,
    // so px values are clamped first and then scaled
    #resolveStyleValues(style, entry)
    {
        const scale = style.unit?.toLowerCase()==="px" ? this.#globalParams.scaleEffect : 1,
              value = (frame, roll) => scale * (frame.scatter
                  ? AdashaUtils.constrain(frame.value + roll * frame.scatter, style.min, style.max)
                  : frame.value);

        entry.near = value(style.near, entry.nearUnit);
        entry.far  = value(style.far, entry.farUnit);
        return entry;
    }



    // random(v, m) scales linearly with v for both methods, so a roll of
    // random(1, m) times the jitter size has the same spread as random(size, m).
    // the constructor sets the jitter parameters before any node data is built
    #rollJitter()
    {
        const method = this.#globalParams.jitterMethod;
        return {
            x: AdashaUtils.random(1, method),
            y: AdashaUtils.random(1, method)
        };
    }



    // jitter in pixels, from the node's unit roll, the current jitter size and scaleEffect
    #resolveJitter(data)
    {
        const { jitter, jitterX, jitterY, scaleEffect } = this.#globalParams;
        data.jitter ??= {};
        data.jitter.x = data.jitterUnit.x * (jitter + jitterX) * scaleEffect;
        data.jitter.y = data.jitterUnit.y * (jitter + jitterY) * scaleEffect;
        return data.jitter;
    }



    // a new method needs a roll of its own shape
    #rollJitters()
    {
        for (const data of this.#nodeData)
        {
            data.jitterUnit = this.#rollJitter();
        }
        this.#applyOffsets();
    }



    #checkIndex(i)
    {
        Validate.finite(i, "node index");
        if (!Number.isInteger(i) || i<0 || i>=this.#nodeData.length)
        {
            throw new RangeError(`ProximityEffect: node index ${i} is out of range (0 to ${this.#nodeData.length-1}).`);
        }
        return i;
    }



    // The value the node's styles were drawn with. primeDistances seeds
    // lastDelta before anything is drawn, so wait for the first frame (which
    // sets distance) to report it. One place, so a per-style form (4.3's
    // channels) and stepped output can be added here.
    #easedValue(data)
    {
        return data.distance===undefined ? undefined : data.lastDelta;
    }



    // copies of the public fields only, so callers can't change the running
    // effect, and internal bookkeeping stays free to change
    #readNodeData(data, prop)
    {
        if (prop===undefined)
        {
            const snapshot = {};
            for (const key in NODE_DATA)
            {
                const value = NODE_DATA[key](data);
                if (value!==undefined)
                {
                    snapshot[key] = value;
                }
            }
            return snapshot;
        }
        // own properties only, so a name like "constructor" doesn't reach the prototype
        return Object.hasOwn(NODE_DATA, prop) ? NODE_DATA[prop](data) : undefined;
    }



    #styleMatches(style, name)
    {
        return style.name===name || style.func===name || (style.id!==undefined && style.id===name);
    }



    // a node's original inline value for one CSS property, parsed once and kept
    #originalValue(data, rule)
    {
        data.originals ??= new Map();
        if (!data.originals.has(rule))
        {
            this.#scratchStyle ??= document.createElement("div").style;
            this.#scratchStyle.cssText = data.style;
            data.originals.set(rule, readRule(this.#scratchStyle, rule));
        }
        return data.originals.get(rule);
    }



    // put back a node's original value for each property the instance has
    // written, leaving the rest of its inline style (including anything the
    // page has set since) alone, and no empty style attribute if it had none
    #restoreWritten(data)
    {
        for (const rule of this.#written.values())
        {
            this.#restoreProperty(data, rule);
        }
        if (!data.hadStyle && data.node.style.length===0)
        {
            data.node.removeAttribute("style");
        }
    }



    // put back a node's original inline value for one CSS property
    #restoreProperty(data, rule)
    {
        writeRule(data.node.style, rule, this.#originalValue(data, rule));
    }



    // a data-offsetx/data-offsety attribute as a number; anything unusable counts as 0
    #dataOffset(attr)
    {
        const n = Number(attr);
        return Number.isFinite(n) ? n : 0;
    }



    // the point being tracked: manual coords, then target, then pointer
    #targetPoint()
    {
        if (this.#reducedToRest())
        {
            return null;
        }
        if (this.#coords)
        {
            return this.#coords;
        }
        if (this.target)
        {
            const b = this.target.getBoundingClientRect();
            return {
                x: (b.left + b.right)*0.5,
                y: (b.top + b.bottom)*0.5
            };
        }
        return this.#pointer ?? this.#heldPoint();
    }



    // the held point in viewport coordinates, at the current page scroll
    #heldPoint()
    {
        return this.#held && {
            x: this.#held.x - window.scrollX,
            y: this.#held.y - window.scrollY
        };
    }





    ////////////////////
    //                //
    //     EVENTS     //
    //                //
    ////////////////////

    /*
     * Events are plain Event objects dispatched on the instance. They don't
     * bubble (an instance has no parent), can't be cancelled and carry no
     * detail; read what's needed from the instance itself.
     */

    /**
     * The instance has measured its nodes and started listening, once the
     * document has loaded. Always dispatched asynchronously, so a listener
     * added straight after construction hears it.
     * @event ProximityEffect#ready
     * @type {Event}
     */

    /**
     * A frame was drawn by the animation loop. Only frames that are drawn
     * dispatch it, so an idle effect dispatches nothing. Calling update()
     * directly doesn't dispatch it.
     * @event ProximityEffect#redraw
     * @type {Event}
     */

    /**
     * A remeasure found that at least one node's centre moved (after a resize,
     * a container scroll, a change of nodes...). Dispatched before that frame
     * is drawn.
     * @event ProximityEffect#reflow
     * @type {Event}
     */



    // any pointer (mouse, pen or touch); with several touches, only the first is followed
    #pointerMove(evt)
    {
        if (evt.isPrimary===false)
        {
            return;
        }
        this.#pointer ??= { x: 0, y: 0 };
        this.#pointer.x = evt.clientX;
        this.#pointer.y = evt.clientY;
        this.#held = null;
        this.#start();
    }





    // pointerout with no element to go to: the pointer left the page, or a
    // touch or pen lifted off (pointercancel, when a touch turns into a
    // scroll, is followed by one too). The nodes settle back to rest, unless
    // the point is held.
    #pointerOut(evt)
    {
        if (evt.relatedTarget===null && evt.isPrimary!==false)
        {
            if (this.#pointer!==null && this.#holds(evt))
            {
                // kept in page coordinates, so it stays on the same spot as the page scrolls
                this.#held = { x: this.#pointer.x + window.scrollX, y: this.#pointer.y + window.scrollY };
                this.#pointer = null;
            }
            else
            {
                this.#pointerLeft();
            }
        }
    }



    // Whether a pointer leaving should be held. Only a touch or pen lifting:
    // a mouse that leaves and comes back is a different thing from a tap.
    // Kept in one place so another pointerLeave mode (for a mouse) can be added.
    #holds(evt)
    {
        return this.pointerLeave==="hold" && (evt.pointerType==="touch" || evt.pointerType==="pen");
    }



    #pointerLeft()
    {
        if (this.#pointer!==null || this.#held!==null)
        {
            this.#pointer = null;
            this.#held = null;
            this.#start();
        }
    }





    // the window resized: remeasure the nodes on the next frame
    // (which dispatches "reflow" if any of them moved)
    #reflow()
    {
        if (this.#ready && !this.#destroyed)
        {
            this.#requestMeasure();
        }
    }





    /**
     * Draw one frame now: work out each node's distance from the target and
     * write its styles. The animation loop calls this by itself, so it's only
     * needed to draw while paused, or to draw straight away. It doesn't
     * dispatch 'redraw', and does nothing once the instance is destroyed.
     */
    update()
    {
        if (this.#destroyed)
        {
            return;
        }

        // the layout reads (page scroll, a target's position) happen before any
        // style is written; node centres are measured separately and cached
        this.#followScroll();
        const point   = this.#targetPoint(),
              groups  = this.#styleGroups,
              rewrite = this.#needsRewrite,
              instant = this.motionReduced,
              { invert, attack, decay, tolerance, direction, zIndex, perspective, scaleEffect } = this.#globalParams,
              threshold = this.#globalParams.threshold * scaleEffect,
              runoff    = this.#globalParams.runoff * scaleEffect;

        this.#needsRewrite = false;
        this.#lastTargetPoint = point && { x: point.x, y: point.y };
        let changed = rewrite;

        for (const data of this.#nodeData)
        {
            const center = data.center;

            if (!center)
            {
                continue;
            }

            // with nothing to track yet, nodes rest as though it were infinitely far away
            let td = 1;

            if (point)
            {
                const dx = point.x - center.x,
                      dy = point.y - center.y;

                // calculate distance
                const dd = direction==="both"
                    ? Math.hypot(dx, dy)
                    : Math.abs(direction==="horizontal" ? dx : dy);

                // normalise to boundaries; a runoff of 0 is a hard edge
                td = runoff===0
                    ? (dd>threshold ? 1 : 0)
                    : AdashaUtils.constrain((dd-threshold) / runoff, 0, 1);
            }

            if (invert)
            {
                td = 1 - td;
            }

            data.distance = td;

            // apply easing (the first frame starts where it is, unless primed;
            // with reduced motion there's no easing at all)
            const last = data.lastDelta,
                  rate = instant ? 1 : AdashaUtils.xor(td>last, invert) ? decay : attack;
            let d = last===undefined ? td : last+(td-last)*rate;

            // easing only approaches its target, so snap once close enough to come to rest
            if (rate>0 && Math.abs(td-d)<=tolerance)
            {
                d = td;
            }

            data.lastDelta = d;

            // a node that hasn't moved would get the same styles as last time
            if (d===last && !rewrite)
            {
                continue;
            }
            changed = true;

            if (groups.length>0)
            {
                this.#writeStyles(data, d, groups, zIndex, invert, perspective);
            }
        }

        this.#changed = changed;
    } // update end



    #writeStyles(data, d, groups, zIndex, invert, perspective)
    {
        const style = data.node.style;

        for (const group of groups)
        {
            // first, so it's applied after the other functions, about the
            // transform-origin of the untransformed box
            let value = perspective && group.transform ? `perspective(${perspective}px)` : "";
            for (const { index, func, unit } of group.items)
            {
                const vals = data.styles[index],
                      val  = AdashaUtils.lerp(d, vals.near, vals.far);

                value += func
                    ? `${value==="" ? "" : " "}${func}(${val}${unit})`
                    : `${val}${unit}`;
            }
            if (group.custom)
            {
                style.setProperty(group.rule, value);
            }
            else
            {
                style[group.rule] = value;
            }
            if (group.resizes)
            {
                this.#ownResizes.add(data.node);
            }
        }

        if (zIndex)
        {
            const ix = Math.floor(d*1000);
            style.zIndex = invert ? ix : 1000-ix;
        }
    }

}
