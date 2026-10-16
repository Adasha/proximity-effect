import * as AdashaUtils from './AdashaUtils.mjs';
import Style from './StyleClass.mjs';

/*
 * ProximityEffect class by Adasha
 * Mass animate CSS properties based on mouse or arbitrary target's position.
 *
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/proximity-effect
 */



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
    #VALID_RANDOM_METHODS   = new Set(["uniform", "normal", "gaussian"]);
    #DEFAULT_DIRECTION      = "both";
    #DEFAULT_ACCURACY       =   5;
    #DEFAULT_RUNOFF         = 100;
    #DEFAULT_SCATTER_METHOD = "uniform";
    #DEFAULT_JITTER_METHOD  = "uniform";


    #globalParams = {};
    #pointer = null;
    #coords = null;
    #stylesStack = [];
    #properties;
    #nodes = [];
    #nodeData = [];

    // lifecycle
    #ready = false;
    #paused = false;
    #destroyed = false;
    #abort = new AbortController();
    #frameId = null;
    #lastFrameTime;
    #reflowTimerRef = null;
    #scratchStyle;

    // stable listener references, so they can all be removed
    #onPointerMove = (evt) => this.updatePointer(evt);
    #onReflow      = (evt) => this.reflowEvent(evt);
    #onFrame       = (timestamp) => this.#frame(timestamp);





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

        this.#globalParams.primeDistances = !!param("primeDistances", false);

        // set global parameter values (nodes come last, so their data is built once)
        this.threshold    = param("threshold", 0);
        this.runoff       = param("runoff", this.#DEFAULT_RUNOFF);
        this.attack       = param("attack", 1);
        this.decay        = param("decay", 1);
        this.accuracy     = param("accuracy", this.#DEFAULT_ACCURACY);
        this.invert       = param("invert", false);
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
        const nodes = this.#toElementArray(list);
        const kept  = new Map(this.#nodeData.map(data => [data.node, data]));

        for (const data of this.#nodeData)
        {
            if (!nodes.includes(data.node))
            {
                data.node.style.cssText = data.style;
            }
        }

        this.#nodes    = nodes;
        this.#nodeData = nodes.map(node => kept.get(node) ?? this.#createNodeData(node));

        if (this.#ready)
        {
            this.setCenterPoints();
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
    	this.#globalParams.threshold = AdashaUtils.constrain(value, 0);
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
    	this.#globalParams.runoff = AdashaUtils.constrain(value, 0);
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
        this.#globalParams.invert = !!flag;
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
    	this.#globalParams.attack = AdashaUtils.constrain(value, 0, 1);
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
    	this.#globalParams.decay = AdashaUtils.constrain(value, 0, 1);
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
        this.#globalParams.offsetX = value;
        if (this.#ready)
        {
            this.setCenterPoints();
        }
  	}

    /**
     * Set the global vertical offset, in pixels.
     * @param {number} value - The new offset value.
     */
    set offsetY(value)
    {
        this.#globalParams.offsetY = value;
        if (this.#ready)
        {
            this.setCenterPoints();
        }
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
        this.#globalParams.jitter = AdashaUtils.constrain(num, 0);
        this.#calculateJitters();
  	}

    /**
     * Set the jitterX value.
     * @param {number} num - The new jitterX value, in pixels.
     */
    set jitterX(num)
    {
        this.#globalParams.jitterX = AdashaUtils.constrain(num, 0);
        this.#calculateJitters();
  	}

    /**
     * Set the jitterY value.
     * @param {number} num - The new jitterY value, in pixels.
     */
    set jitterY(num)
    {
        this.#globalParams.jitterY = AdashaUtils.constrain(num, 0);
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
        if (!this.#VALID_RANDOM_METHODS.has(method))
        {
            throw new RangeError(`ProximityEffect: '${method}' is not a valid jitter method. Use "uniform" or "normal".`);
        }
        this.#globalParams.jitterMethod = method;
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
        }
        else
        {
            throw new RangeError(`ProximityEffect: '${str}' is not a valid direction.`);
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
     * @param {number|Falsy} num - A positive frame rate, or falsy to follow the screen refresh.
     */
    set FPS(num)
    {
        this.#globalParams.FPS = typeof num==="number" && Number.isFinite(num) && num>0 ? num : null;
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
        this.#globalParams.accuracy = Math.floor(AdashaUtils.constrain(num, 0));
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
        const style = new Style(property, keyframes, params);

        this.#stylesStack.push(style);
        for (const data of this.#nodeData)
        {
            data.styles.push(this.#scatterValues(style));
        }
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

        if (this.#stylesStack.length===0 && rules.size>0)
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
        if (!Number.isFinite(x) || !Number.isFinite(y))
        {
            throw new TypeError(`ProximityEffect: coordinates must be finite numbers (received ${x}, ${y}).`);
        }
        this.#coords = { x, y };
    }


    /**
     * Clear manual coordinates if specified, returning to target-based coordinates.
     */
    clearCoords()
    {
        this.#coords = null;
    }





    /**
     * Recalculate each node's centre point, including global offset and jitter.
     */
    setCenterPoints()
    {
        for (const data of this.#nodeData)
        {
    		const node   = data.node,
                  cssTxt = node.style.cssText;

            // measure the node without the effect's styles applied
            node.style.cssText = data.style;

    		const bounds = node.getBoundingClientRect();

            node.style.cssText = cssTxt;
            data.center = {
                x: (bounds.left+bounds.right )*0.5 - this.offsetX + data.jitter.x,
                y: (bounds.top +bounds.bottom)*0.5 - this.offsetY + data.jitter.y
            };
        }
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
        this.#stop();
        clearTimeout(this.#reflowTimerRef);
        this.#reflowTimerRef = null;

        for (const data of this.#nodeData)
        {
            data.node.style.cssText = data.style;
        }
    }





    /**
     * @typedef {Object} NodeData
     * @property {Element} node - A reference to the node.
     * @property {string} style - The node's original inline style.
     * @property {Object} center - The node's centre point, including offset and jitter.
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
        const data = this.#nodeData[index];
        return prop ? data[prop] : data;
    }



    /**
     * Return the given property of the given node index's effect data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {mixed} The property value.
     */
    getNodeIndexData(i, prop)
    {
        return this.#nodeData[i][prop];
    }




    /**
     * Return a boolean determining if the given node has the given data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {boolean} True if the property exists, false otherwise.
     */
    hasNodeIndexData(i, prop)
    {
        return Object.hasOwn(this.#nodeData[i], prop);
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
        this.setCenterPoints();

        const options = { signal: this.#abort.signal, passive: true };
        window.addEventListener("scroll", this.#onReflow, options);
        window.addEventListener("resize", this.#onReflow, options);
        document.addEventListener("mousemove", this.#onPointerMove, options);

        this.dispatchEvent(new Event("ready"));
        this.#start();
    }



    #start()
    {
        if (this.#ready && !this.#paused && !this.#destroyed && this.#frameId===null)
        {
            this.#frameId = requestAnimationFrame(this.#onFrame);
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

        if (due)
        {
            this.#lastFrameTime = timestamp;
            this.update();
            this.dispatchEvent(new Event("redraw"));
        }
        this.#start();
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
        if (this.#ready)
        {
            this.setCenterPoints();
        }
    }



    #styleMatches(style, name)
    {
        return style.name===name || style.func===name;
    }



    // put back a node's original inline value for one CSS property
    #restoreProperty(data, rule)
    {
        this.#scratchStyle ??= document.createElement("div").style;
        this.#scratchStyle.cssText = data.style;
        data.node.style[rule] = this.#scratchStyle[rule];
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
        this.#pointer = { x: evt.clientX, y: evt.clientY };
    }





    reflowEvent()
    {
        this.dispatchEvent(new Event("reflow"));

        // TODO: is this a hack? or the best way to do it? (replaced in Session 5)
        if (this.#ready && !this.#destroyed)
        {
            clearTimeout(this.#reflowTimerRef);
            this.#reflowTimerRef = setTimeout(() =>
            {
                this.#reflowTimerRef = null;
                this.setCenterPoints();
            }, 1);
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

        // read everything needed from layout before writing any styles
        const point  = this.#targetPoint(),
              styles = this.#stylesStack;

        for (const data of this.#nodeData)
        {
            const node   = data.node,
                  center = data.center;

            if (!center)
            {
                continue;
            }

            // with nothing to track yet, nodes rest as though it were infinitely far away
            let td = 1;

            if (point)
            {
                const dx = point.x - (center.x - (Number(node.dataset.offsetx) || 0)),
                      dy = point.y - (center.y - (Number(node.dataset.offsety) || 0));

                // calculate distance
                const dd = this.direction==="both"
                    ? Math.hypot(dx, dy)
                    : Math.abs(this.direction==="horizontal" ? dx : dy);

                // normalise to boundaries; a runoff of 0 is a hard edge
                td = this.runoff===0
                    ? (dd>this.threshold ? 1 : 0)
                    : AdashaUtils.constrain((dd-this.threshold) / this.runoff, 0, 1);
            }

            if (this.invert)
            {
                td = 1 - td;
            }

            data.distance = td;

            // apply easing (the first frame starts where it is, unless primed)
            const last = data.lastDelta;
            let d = last===undefined
                ? td
                : last+(td-last)*(AdashaUtils.xor(td>last, this.invert) ? this.decay : this.attack);

            // round value to reduce jitter
            d = AdashaUtils.roundTo(d, this.accuracy);

            data.lastDelta = d;


            if (styles.length>0)
            {
                const funcs = {};

                for (let f=0; f<styles.length; f++)
                {
      				const style    = styles[f],
                          nodeVals = data.styles[f],
                          rule     = style.rule,
                          func     = style.func,
                          unit     = style.unit || "",
                          val      = AdashaUtils.lerp(d, nodeVals.near, nodeVals.far);

                    if (!func)
                    {
                        node.style[rule] = `${val}${unit}`;
                    }
                    else
                    {
                        (funcs[rule] ??= []).push(`${func}(${val}${unit})`);
                    }
                }

                for (const rule in funcs)
                {
                    node.style[rule] = funcs[rule].join(" ");
                }

                const ix = Math.floor(d*1000);
                node.style.zIndex = this.invert ? ix : 1000-ix;
            }
        }
    } // update end

}
