import * as AdashaUtils from './AdashaUtils.mjs';
import Style from './StyleClass.mjs';
import * as Validate from './validate.mjs';

/*
 * ProximityEffect class by Adasha
 * Mass animate CSS properties based on mouse or arbitrary target's position.
 *
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/proximity-effect
 */


// properties that don't move or resize an element's box, so nodes can be
// measured without taking them off first
const PAINT_ONLY_RULES = new Set(["filter", "backdropFilter", "backdrop-filter", "opacity", "zIndex", "z-index"]);



/**
 * Class representing a ProximityEffect.
 * @version 4.0.0-alpha1
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
    #DEFAULT_DIRECTION      = "both";
    #DEFAULT_ACCURACY       =   5;
    #MAX_ACCURACY           =  20;
    #DEFAULT_RUNOFF         = 100;
    #DEFAULT_SCATTER_METHOD = "uniform";
    #DEFAULT_JITTER_METHOD  = "uniform";


    #globalParams = {};
    #pointer = null;
    #coords = null;
    #stylesStack = [];
    #styleGroups = [];
    #properties;
    #nodes = [];
    #nodeData = [];

    // lifecycle
    #ready = false;
    #paused = false;
    #destroyed = false;
    #abort = new AbortController();
    #resizeObserver = null;
    #frameId = null;
    #lastFrameTime;
    #needsMeasure = false;
    #needsPinnedMeasure = false;
    #scrollX = 0;
    #scrollY = 0;
    #needsRewrite = true;
    #changed = false;
    #scratchStyle;

    // stable listener references, so they can all be removed
    #onPointerMove  = (evt) => this.updatePointer(evt);
    #onReflow       = () => this.reflowEvent();
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
     * @param {number}  [params.attack=1] - The global effect attack.
     * @param {number}  [params.decay=1] - The global effect decay.
     * @param {number}  [params.offsetX=0] - The global horizontal offset, in pixels.
     * @param {number}  [params.offsetY=0] - The global vertical offset, in pixels.
     * @param {number}  [params.jitter=0] - The effect jitter, in pixels. Affects X and Y.
     * @param {number}  [params.jitterX=0] - The effect jitter for the X axis only, in pixels.
     * @param {number}  [params.jitterY=0] - The effect jitter for the Y axis only, in pixels.
     * @param {string}  [params.jitterMethod="uniform"] - The random method for generating jitter values, "uniform" or "normal" ("gaussian" is an alias).
     * @param {number}  [params.accuracy=5] - The effect accuracy, in decimal places.
     * @param {number|Falsy} [params.FPS] - The frame rate of the effect, either the number specified or with the screen refresh.
     * @param {Element} [params.target] - The effect tracker target.
     * @param {boolean} [params.primeDistances=false] - Prime the initial distances to create a transition on load. Only available through params argument in constructor.
     * @param {boolean} [params.zIndex=false] - Set each node's z-index from its distance, so the nearest nodes sit on top.
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
        this.threshold    = param("threshold", 0);
        this.runoff       = param("runoff", this.#DEFAULT_RUNOFF);
        this.attack       = param("attack", 1);
        this.decay        = param("decay", 1);
        this.accuracy     = param("accuracy", this.#DEFAULT_ACCURACY);
        this.invert       = param("invert", false);
        this.zIndex       = param("zIndex", false);
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
     * @return {Array<Element>} The node array.
     */
    get nodes()
    {
        return this.#nodes;
    }

    /**
     * Set the nodes to animate. Nodes that are no longer in the list get their original inline style back.
     * @param {NodeList|HTMLCollection|Array<Element>|Element} list - The nodes.
     */
    set nodes(list)
    {
        const nodes   = this.#toElementArray(list),
              keeping = new Set(nodes),
              kept    = new Map(this.#nodeData.map(data => [data.node, data]));

        for (const data of this.#nodeData)
        {
            if (!keeping.has(data.node))
            {
                data.node.style.cssText = data.style;
                this.#resizeObserver?.unobserve(data.node);
            }
        }

        this.#nodes    = nodes;
        this.#nodeData = nodes.map(node => kept.get(node) ?? this.#createNodeData(node));

        if (this.#ready)
        {
            this.#observe(nodes);
            this.#requestMeasure();
        }
    }



    /**
     *
     */
    get totalNodes()
    {
        return this.nodes.length;
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
     * Get the effect boundary.
     * @return {number} The boundary radius, in pixels.
     */
    get boundary()
    {
    	return this.threshold + this.runoff;
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
        if (was && !flag)
        {
            for (const data of this.#nodeData)
            {
                this.#restoreProperty(data, "zIndex");
            }
        }
        this.#invalidate();
    }





    /**
     * Get the effect attack.
     * @return {number} The attack value.
     */
    get attack()
    {
    	return this.#globalParams.attack;
    }

    /**
     * Set the effect attack.
     * @param {number} value - The new attack value.
     */
    set attack(value)
    {
    	this.#globalParams.attack = AdashaUtils.constrain(Validate.finite(value, "attack"), 0, 1);
    	this.#start();
    }




    /**
     * Get the effect decay.
     * @return {number} The decay value.
     */
    get decay()
    {
    	return this.#globalParams.decay;
    }

    /**
     * Set the effect decay.
     * @param {number} value - The new decay value.
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
     * Set the global vertical offset, in pixels.
     * @param {number} value - The new offset value.
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
        this.#calculateJitters();
  	}

    /**
     * Set the jitterX value.
     * @param {number} num - The new jitterX value, in pixels.
     */
    set jitterX(num)
    {
        this.#globalParams.jitterX = Math.max(Validate.finite(num, "jitterX"), 0);
        this.#calculateJitters();
  	}

    /**
     * Set the jitterY value.
     * @param {number} num - The new jitterY value, in pixels.
     */
    set jitterY(num)
    {
        this.#globalParams.jitterY = Math.max(Validate.finite(num, "jitterY"), 0);
        this.#calculateJitters();
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
     * Set the jitter method, and recalculate the jitter.
     * @param {string} method - "uniform" or "normal" ("gaussian" is an alias).
     */
    set jitterMethod(method)
    {
        this.#globalParams.jitterMethod = Validate.randomMethod(method, "jitter method");
        this.#calculateJitters();
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
     * @param {number|Falsy} num - A positive frame rate, or falsy (null, undefined, false or 0) to follow the screen refresh.
     * @throws {TypeError} If the value is truthy but not a number.
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
     * Get the effect accuracy.
     * @return {number} The accuracy value.
     */
    get accuracy()
    {
        return this.#globalParams.accuracy;
    }

    /**
     * Set the effect accuracy.
     * @param {number} num - The new accuracy value.
     */
    set accuracy(num)
    {
        this.#globalParams.accuracy = Math.floor(AdashaUtils.constrain(Validate.finite(num, "accuracy"), 0, this.#MAX_ACCURACY));
        this.#start();
    }





    /**
     * Get the last known mouse pointer coordinates, relative to the viewport, in pixels.
     * @return {Object|null} An object containing x and y properties, or null before the pointer has moved.
     */
    get pointer()
    {
        return this.#pointer ? { x: this.#pointer.x, y: this.#pointer.y } : null;
    }



    /**
     * Whether the effect is paused.
     * @return {boolean}
     */
    get paused()
    {
        return this.#paused;
    }



    /**
     * Whether the instance has been destroyed.
     * @return {boolean}
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
     * @param {string} [property.rule] - The custom CSS style rule to use.
     * @param {string} [property.func] - The CSS function of the given style rule.
     * @param {number} [property.min] - The minimum style value.
     * @param {number} [property.max] - The maximum style value.
     * @param {number} [property.default] - The default style value.
     * @param {string} [property.unit] - The style rule's CSS unit.
     * @param {Array<number|Object>} keyframes - The style values, from the closest distance to the furthest. Each is a number, or an object with a numeric value and optional scatter and scatterMethod.
     * @param {Object} [params] - An object containing additional effect parameters.
     * @param {string} [params.id] - A unique string to identify the style rule.
     * @param {number} [params.threshold] - The animation distance threshold for this style, overriding the global value.
     * @param {number} [params.runoff] - The animation runoff distance for this style, overriding the global value.
     * @param {Boolean} [params.invert] - Whether to invert the effect for this style, overriding the global value.
     * @param {number} [params.attack] - The easing rate towards the near value (0-1) for this style, overriding the global value.
     * @param {number} [params.decay] - The easing rate towards the far value (0-1) for this style, overriding the global value.
     */
    addStyle(property, keyframes, params)
    {
        // work everything out before changing anything, so a failure leaves the stack as it was
        const style  = new Style(property, keyframes, params),
              values = this.#nodeData.map(() => this.#scatterValues(style));

        this.#stylesStack.push(style);
        this.#nodeData.forEach((data, i) => data.styles.push(values[i]));
        this.#groupStyles();
        this.#invalidate();
    }



    /**
     * Check if a named style is on the stack.
     * @param {string} name - The preset name, or a custom style's func (or rule if it has none).
     * @return {boolean} True if the style exists at least once.
     */
    hasStyleProp(name)
    {
        return this.#stylesStack.some(style => this.#styleMatches(style, name));
    }



    /**
     * Remove all instances of a style from the stack. CSS properties no longer
     * animated by any style get the nodes' original inline values back.
     * @param {string} name - The preset name, or a custom style's func (or rule if it has none).
     * @return {boolean} True if anything was removed.
     */
    removeStyleProp(name)
    {
        const rules = new Set();

        // backwards, so splicing doesn't skip entries
        for (let i=this.#stylesStack.length-1; i>=0; i--)
        {
            const style = this.#stylesStack[i];
            if (this.#styleMatches(style, name))
            {
                rules.add(style.rule);
                this.#stylesStack.splice(i, 1);
                for (const data of this.#nodeData)
                {
                    data.styles.splice(i, 1);
                }
            }
        }

        if (this.zIndex && this.#stylesStack.length===0 && rules.size>0)
        {
            rules.add("zIndex");
        }
        for (const rule of rules)
        {
            if (!this.#stylesStack.some(style => style.rule===rule))
            {
                for (const data of this.#nodeData)
                {
                    this.#restoreProperty(data, rule);
                }
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
     *
     * @param {String} prop - The property name - should return a number.
     * @param {Object} params -
     * @param {number} params.min -
     * @param {number} params.max -
     * @param {Function} params.callback -
     * @returns
     */
    addProperty(name, params)
    {
        this.#properties = this.#properties || [];

        let propertyObj = {
            name: name,
            params: params
        };
        this.#properties.push(propertyObj);
    }

    /**
     *
     * @param {*} n
     * @returns
     */
    hasProperty()
    {

    }



    /**
     *
     * @param {*} n
     * @returns
     */
    removeProperty()
    {

    }





    /**
     * Get the normalised distance (0 to 1) to the current target from the given node, as of the last frame.
     * @param {Element} n - The node to check.
     */
    distanceFrom(n)
    {
        return this.getNodeData(n, "distance");
    }



    /**
     * Get the normalised distance (0 to 1) to the current target from the given node index, as of the last frame.
     * @param {number} i - The node index to check.
     */
    distanceFromIndex(i)
    {
        return this.getNodeIndexData(i, "distance");
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
     */
    setCenterPoints()
    {
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
        if (this.#destroyed)
        {
            throw new Error("ProximityEffect: cannot resume a destroyed instance.");
        }
        this.#paused = false;
        this.#start();
    }



    /**
     * Stop the effect for good: remove every listener, stop the animation loop
     * and restore each node's original inline style. Safe to call more than once.
     */
    destroy()
    {
        if (this.#destroyed)
        {
            return;
        }
        this.#destroyed = true;
        this.#abort.abort();
        this.#resizeObserver?.disconnect();
        this.#stop();

        for (const data of this.#nodeData)
        {
            data.node.style.cssText = data.style;
        }
    }





    /**
     * @typedef {Object} NodeData
     * @property {Element} node - A reference to the node.
     * @property {string} style - The node's original inline style.
     * @property {Object} measured - The node's measured centre point (relative to the viewport, with any data-offsetx/data-offsety applied).
     * @property {Object} center - The node's centre point, including global offset and jitter.
     * @property {boolean} scrollsWithPage - False if the node is, or is inside, a fixed or sticky element.
     * @property {Object} jitter - The node's random x and y jitter.
     * @property {number} distance - The normalised distance to the target as of the last frame.
     * @property {number} lastDelta - The eased distance as of the last frame.
     * @property {Array<Object>} styles - The node's near and far values for each style on the stack.
     */
    /**
     * Return an object containing the given node's effect data or a specific property of that data.
     * @param {Element} n - The node to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {mixed|NodeData} The chosen property value, or an object containing the node's data.
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
     * Return the given node index's effect data, or a specific property of that data.
     * @param {number} i - The node index to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {mixed|NodeData} The chosen property value, or an object containing the node's data.
     * @throws {TypeError} If the index is not a number.
     * @throws {RangeError} If the index is not a whole number within the node list.
     */
    getNodeIndexData(i, prop)
    {
        return this.#readNodeData(this.#nodeData[this.#checkIndex(i)], prop);
    }




    /**
     * Return a boolean determining if the given node has the given data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {boolean} True if the property exists, false otherwise.
     * @throws {TypeError} If the index is not a number.
     * @throws {RangeError} If the index is not a whole number within the node list.
     */
    hasNodeIndexData(i, prop)
    {
        return Object.hasOwn(this.#nodeData[this.#checkIndex(i)], prop);
    }





	///////////////////////////////
    //                           //
	//      PRIVATE METHODS      //
    //                           //
	///////////////////////////////



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
        window.addEventListener("resize", this.#onReflow, options);
        document.addEventListener("mousemove", this.#onPointerMove, options);
        document.addEventListener("visibilitychange", this.#onVisibility, options);

        if (typeof ResizeObserver!=="undefined")
        {
            // nodes, or the page around them, changing size moves the centres
            this.#resizeObserver = new ResizeObserver(this.#onReflow);
            this.#resizeObserver.observe(document.documentElement);
            this.#observe(this.#nodes);
        }

        this.dispatchEvent(new Event("ready"));
        this.#start();
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
            this.#start();
            return;
        }

        this.#lastFrameTime = timestamp;
        if (this.#needsMeasure)
        {
            this.#measure(this.#nodeData);
            this.dispatchEvent(new Event("reflow"));
        }
        else if (this.#needsPinnedMeasure)
        {
            this.#measure(this.#nodeData.filter(data => data.scrollsWithPage===false));
            this.dispatchEvent(new Event("reflow"));
        }
        this.update();
        this.dispatchEvent(new Event("redraw"));

        // keep going while nodes are still easing. A target element is followed
        // every frame, since it can move without any event to say so.
        if (this.#changed || this.target)
        {
            this.#start();
        }
    }



    // Measure nodes' centres without the effect's styles applied. Done in
    // three passes (write, read, write) so the page is laid out once, not
    // once per node. Only the properties that can move a node's box are put
    // back to their original values, one by one: replacing the whole cssText
    // would make the browser redo layout for every node.
    #measure(all)
    {
        if (all===this.#nodeData)
        {
            this.#needsMeasure = false;
        }
        this.#needsPinnedMeasure = false;

        const rules = [...new Set(this.#styleGroups.map(group => group.rule))]
                  .filter(rule => !PAINT_ONLY_RULES.has(rule)),
              saved = all.map(data => rules.map(rule => data.node.style[rule]));

        for (const data of all)
        {
            for (const rule of rules)
            {
                data.node.style[rule] = this.#originalValue(data, rule);
            }
        }

        // read pass: positions, and whether each node scrolls with the page
        const bounds = all.map(data => data.node.getBoundingClientRect()),
              cache  = new Map(),
              pinned = all.map(data => this.#isPinned(data.node, cache));

        // the page scroll these measurements belong to (see #followScroll)
        if (all===this.#nodeData)
        {
            this.#scrollX = window.scrollX;
            this.#scrollY = window.scrollY;
        }

        all.forEach((data, i) =>
        {
            const b    = bounds[i],
                  node = data.node;
            rules.forEach((rule, r) =>
            {
                node.style[rule] = saved[i][r];
            });
            data.measured = {
                x: (b.left+b.right )*0.5 - this.#dataOffset(node.dataset.offsetx),
                y: (b.top +b.bottom)*0.5 - this.#dataOffset(node.dataset.offsety)
            };
            data.scrollsWithPage = !pinned[i];
            this.#applyOffset(data);
        });
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
                || this.#isPinned(el.parentElement ?? el.getRootNode().host, cache));
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
        else if (target instanceof Node && this.#nodes.some(node => target.contains(node)))
        {
            this.#requestMeasure();
        }
    }



    // a node's centre is where it was measured, moved by the global offset and its jitter
    #applyOffset(data)
    {
        if (data.measured)
        {
            data.center ??= {};
            data.center.x = data.measured.x - this.offsetX + data.jitter.x;
            data.center.y = data.measured.y - this.offsetY + data.jitter.y;
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
    // filter) are written together. Plain properties come first, in stack order.
    #groupStyles()
    {
        const plain = [],
              funcs = new Map();

        this.#stylesStack.forEach((style, index) =>
        {
            const item = { index, func: style.func, unit: style.unit || "" };
            if (!style.func)
            {
                plain.push({ rule: style.rule, items: [item] });
            }
            else
            {
                if (!funcs.has(style.rule))
                {
                    funcs.set(style.rule, { rule: style.rule, items: [] });
                }
                funcs.get(style.rule).items.push(item);
            }
        });

        this.#styleGroups = [...plain, ...funcs.values()];
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
        return {
            node:      node,
            style:     node.style.cssText,
            lastDelta: this.#globalParams.primeDistances ? 1 : undefined,
            jitter:    this.#randomJitter(),
            styles:    this.#stylesStack.map(style => this.#scatterValues(style))
        };
    }



    #scatterValues(style)
    {
        const value = (frame) => frame.scatter
            ? AdashaUtils.constrain(frame.value + AdashaUtils.random(frame.scatter, frame.scatterMethod ?? this.#DEFAULT_SCATTER_METHOD), style.min, style.max)
            : frame.value;

        return {
            near: value(style.near),
            far:  value(style.far)
        };
    }



    #randomJitter()
    {
        const method = this.jitterMethod ?? this.#DEFAULT_JITTER_METHOD;
        return {
            x: AdashaUtils.random((this.jitter ?? 0) + (this.jitterX ?? 0), method),
            y: AdashaUtils.random((this.jitter ?? 0) + (this.jitterY ?? 0), method)
        };
    }



    #calculateJitters()
    {
        for (const data of this.#nodeData)
        {
            data.jitter = this.#randomJitter();
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



    // own properties only, so a name like "constructor" doesn't reach the prototype
    #readNodeData(data, prop)
    {
        if (prop===undefined)
        {
            return data;
        }
        return Object.hasOwn(data, prop) ? data[prop] : undefined;
    }



    #styleMatches(style, name)
    {
        return style.name===name || style.func===name;
    }



    // a node's original inline value for one CSS property, parsed once and kept
    #originalValue(data, rule)
    {
        data.originals ??= new Map();
        if (!data.originals.has(rule))
        {
            this.#scratchStyle ??= document.createElement("div").style;
            this.#scratchStyle.cssText = data.style;
            data.originals.set(rule, this.#scratchStyle[rule]);
        }
        return data.originals.get(rule);
    }



    // put back a node's original inline value for one CSS property
    #restoreProperty(data, rule)
    {
        data.node.style[rule] = this.#originalValue(data, rule);
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
        return this.#pointer;
    }





    ////////////////////
    //                //
    //     EVENTS     //
    //                //
    ////////////////////



    updatePointer(evt)
    {
        this.#pointer ??= { x: 0, y: 0 };
        this.#pointer.x = evt.clientX;
        this.#pointer.y = evt.clientY;
        this.#start();
    }





    // the page scrolled or resized: remeasure the nodes on the next frame
    // (which dispatches "reflow")
    reflowEvent()
    {
        if (this.#ready && !this.#destroyed)
        {
            this.#requestMeasure();
        }
    }





    /**
     * Draw one frame: work out each node's distance from the target and write its styles.
     * Called by the animation loop; calling it directly draws an extra frame.
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
              { threshold, runoff, invert, attack, decay, accuracy, direction, zIndex } = this.#globalParams;

        this.#needsRewrite = false;
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

            // apply easing (the first frame starts where it is, unless primed),
            // rounded to reduce jitter
            const last = data.lastDelta,
                  rate = AdashaUtils.xor(td>last, invert) ? decay : attack;
            let d = AdashaUtils.roundTo(last===undefined ? td : last+(td-last)*rate, accuracy);

            // a step too small to survive rounding would stall short of the target
            if (d===last && rate>0)
            {
                d = AdashaUtils.roundTo(td, accuracy);
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
                this.#writeStyles(data, d, groups, zIndex, invert);
            }
        }

        this.#changed = changed;
    } // update end



    #writeStyles(data, d, groups, zIndex, invert)
    {
        const style = data.node.style;

        for (const group of groups)
        {
            let value = "";
            for (const { index, func, unit } of group.items)
            {
                const vals = data.styles[index],
                      val  = AdashaUtils.lerp(d, vals.near, vals.far);

                value += func
                    ? `${value==="" ? "" : " "}${func}(${val}${unit})`
                    : `${val}${unit}`;
            }
            style[group.rule] = value;
        }

        if (zIndex)
        {
            const ix = Math.floor(d*1000);
            style.zIndex = invert ? ix : 1000-ix;
        }
    }

}
