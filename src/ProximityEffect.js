/*
 * ProximityEffect class by Adasha
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/proximity-effect
 */



/**
 * Class representing a ProximityEffect.
 * @version 3.0.0-alpha1
 * @author Adam Shailer <adasha76@outlook.com>
 * @class
 * @extends EventTarget
 * @fires ProximityEffect#ready
 * @fires ProximityEffect#redraw
 * @fires ProximityEffect#reflow
 */
class ProximityEffect extends EventTarget
{

    #VALID_DIRECTIONS       = new Set(["both", "horizontal", "vertical"]);
    #DEFAULT_DIRECTION      = "both";
    #DEFAULT_ACCURACY       =   5;
    #DEFAULT_FPS            =  15;
    #DEFAULT_RUNOFF         = 100;
    #VALID_RANDOM_METHODS   = new Set(["normal", "uniform"]);
    #DEFAULT_SCATTER_METHOD = "uniform";
    #DEFAULT_JITTER_METHOD  = "uniform";
    #DEFAULT_MODE           = "redraw";


    #VALID_EFFECTS          = {
        translateX:      {                  default:       0, rule: "transform",       func: "translateX",  unit: "px"},
        translateY:      {                  default:       0, rule: "transform",       func: "translateY",  unit: "px"},
        translateZ:      {                  default:       0, rule: "transform",       func: "translateZ",  unit: "px"},
        rotate:          {                  default:       0, rule: "transform",       func: "rotate",      unit: "deg"},
        rotateX:         {                  default:       0, rule: "transform",       func: "rotateX",     unit: "deg"},
        rotateY:         {                  default:       0, rule: "transform",       func: "rotateY",     unit: "deg"},
        rotateZ:         {                  default:       0, rule: "transform",       func: "rotateZ",     unit: "deg"},
        scale:           {                  default:       1, rule: "transform",       func: "scale"},
        scaleX:          {                  default:       1, rule: "transform",       func: "scaleX"},
        scaleY:          {                  default:       1, rule: "transform",       func: "scaleY"},
        scaleZ:          {                  default:       1, rule: "transform",       func: "scaleZ"},
        skewX:           {                  default:       0, rule: "transform",       func: "skewX",       unit: "deg"},
        skewY:           {                  default:       0, rule: "transform",       func: "skewY",       unit: "deg"},
        
        blur:            {min: 0,           default:       0, rule: "filter",          func: "blur",        unit: "px"},
        brightness:      {min: 0,           default:     100, rule: "filter",          func: "brightness",  unit: "%"},
        contrast:        {min: 0,           default:     100, rule: "filter",          func: "contrast",    unit: "%"},
        grayscale:       {min: 0, max: 100, default:       0, rule: "filter",          func: "grayscale",   unit: "%"},
        hueRotate:       {                  default:       0, rule: "filter",          func: "hue-rotate",  unit: "deg"},
        invert:          {min: 0, max: 100, default:       0, rule: "filter",          func: "invert",      unit: "%"},
        opacity:         {min: 0, max: 100, default:     100, rule: "filter",          func: "opacity",     unit: "%"},
        saturate:        {min: 0, max: 100, default:     100, rule: "filter",          func: "saturate",    unit: "%"},
        sepia:           {min: 0, max: 100, default:       0, rule: "filter",          func: "sepia",       unit: "%"},

        color:           {min: 0, max: 255, default: [0,0,0], rule: "color",           func: "rgb",                      args: 3},
        backgroundColor: {min: 0, max: 255, default: [0,0,0], rule: "backgroundColor", func: "rgb",                      args: 3},
        scale3D:         {                  default: [1,1,1], rule: "transform",       func: "scale3D",                  args: 3}
    };


    #globalParams;
    #pointer = {};
    #effects;
    #nodes;
    #nodeData;




    /**
     * Create a ProximityEffect instance.
     * @constructor
     * @param {NodeList} nodes - A list of nodes to control.
     * @param {Object}  [params={}] - An object containing effect parameters.
     * @param {number}  [params.threshold=0] - The global effect threshold, in pixels.
     * @param {number}  [params.runoff] - The global effect runoff, in pixels.
     * @param {boolean} [params.invert=false] - Invert distances globally.
     * @param {string}  [params.direction="both"] - The effect direction, one of "both", "horizontal" or "vertical".
     * @param {number}  [params.attack=1] - The global effect attack.
     * @param {number}  [params.decay=1] - The global effect decay.
     * @param {number}  [params.offsetX=0] - The global horizontal offset, in pixels.
     * @param {number}  [params.offsetY=0] - The global vertical offset, in pixels.
     * @param {number}  [params.jitter=0] - The effect jitter, in pixels. Affects X and Y.
     * @param {number}  [params.jitterX=0] - The effect jitter for the X axis only, in pixels.
     * @param {number}  [params.jitterY=0] - The effect jitter for the Y axis only, in pixels.
     * @param {string}  [params.jitterMethod] - The random method for generating jitter values. 
     * @param {number}  [params.accuracy] - The effect accuracy.
     * @param {Element} [params.target] - The effect tracker target.
     * @param {boolean} [params.doPresetDistances=false] - Prime the initial distances to create an initial transition. Only available through params argument in constructor.
     */
    constructor(nodes, params = {})
    {
        super();

        if (!nodes) {
            throw new Error("ProximityEffect: nodes argument is required");
        }

        // turn off centre calculations during setup to avoid calling repeatedly:
        this.preventCenterCalculations = true;


        this.#globalParams = params;
        this.nodes = nodes;


        // default global parameter values:
        this.threshold = this.#globalParams.hasOwnProperty("threshold") ? this.#globalParams.threshold : 0;
        this.runoff    = this.#globalParams.hasOwnProperty("runoff")    ? this.#globalParams.runoff    : this.#DEFAULT_RUNOFF;
        this.attack    = this.#globalParams.hasOwnProperty("attack")    ? this.#globalParams.attack    : 1;
        this.decay     = this.#globalParams.hasOwnProperty("decay")     ? this.#globalParams.decay     : 1;
        this.accuracy  = this.#globalParams.hasOwnProperty("accuracy")  ? this.#globalParams.accuracy  : this.#DEFAULT_ACCURACY;
        //this.reverse   = this.#globalParams.reverse   || false;
        this.invert    = this.#globalParams.invert    || false;
        this.offsetX   = this.#globalParams.offsetX   || 0;
        this.offsetY   = this.#globalParams.offsetY   || 0;
        this.jitter    = this.#globalParams.jitter    || 0;
        this.jitterX   = this.#globalParams.jitterX   || 0;
        this.jitterY   = this.#globalParams.jitterY   || 0;
        this.direction = this.#globalParams.direction || this.#DEFAULT_DIRECTION;
        this.FPS       = this.#globalParams.FPS       || this.#DEFAULT_FPS;
        this.mode      = this.#globalParams.mode      || this.#DEFAULT_MODE;
        this.target    = this.#globalParams.target;



        if (document.readyState==="completed")
        {
            this.#init();
        }
        else
        {
            window.addEventListener("load", () => this.#init());
        }
    }





    /////////////////////////////////
    //                             //
    //     GETTER/SETTER PROPS     //
    //                             //
    /////////////////////////////////



    /**
     * Get the current target
     * @return {Element|Falsy} The current target.
     */
    get target()
    {
        return this.#globalParams.target;
    }

    /**
     * Set the current target
     * @param {Element|Falsy} target - A reference to a DOM Element, or falsy to target mouse.
     */
    set target(target)
    {
        if (!target || target.getBoundingClientRect()) {
            this.#globalParams.target = target;
        }
        else {
            return void console.log(`${target} is not a valid target`);
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
     * Set the list of nodes.
     * @param {NodeList<Element>} list - The list of nodes.
     */
    set nodes(list)
    {
        if (!(list instanceof NodeList))
        {
            throw new Error(`${list} is not a node list`);
        }
        if (list.length<1)
        {
            throw new Error(`No nodes found in ${list}`);
        }


        this.#nodes = [].slice.call(list);  //convert to array
        this.#nodeData = this.#nodes.map(i => ({
            node:      i,
            style:     i.style.cssText,
            lastDelta: this.#globalParams.doPresetDistances ? 1 : null
        }));


        if (this.#globalParams && !this.preventCenterCalculations)
        {
            this.setCenterPoints();
        }
    }





    /**
     * Get the list of effects.
     * @return {Array<Object>} The effects array.
     */
    get effects()
    {
        return this.#effects;
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
    	this.#globalParams.threshold = Utils.constrain(value, 0);
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
     * Set the effect runoff.
     * @param {number} value - The new runoff radius, in pixels.
     */
    set runoff(value)
    {
    	this.#globalParams.runoff = Utils.constrain(value, 0);
        this.#globalParams.invRunoff = 1/this.#globalParams.runoff;
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
    	this.#globalParams.attack = Utils.constrain(value, 0, 1);
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
    	this.#globalParams.decay = Utils.constrain(value, 0, 1);
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
        if (!this.preventCenterCalculations) {
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
        if (!this.preventCenterCalculations)
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
        this.#globalParams.jitter = Utils.constrain(num, 0);
        this.#calculateJitters();
  	}

    /**
     * Set the jitterX value.
     * @param {number} num - The new jitterX value, in pixels.
     */
    set jitterX(num)
    {
        this.#globalParams.jitterX = Utils.constrain(num, 0);
        this.#calculateJitters();
  	}

    /**
     * Set the jitterY value.
     * @param {number} num - The new jitterY value, in pixels.
     */
    set jitterY(num)
    {
        this.#globalParams.jitterY = Utils.constrain(num, 0);
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
     * Set the jitter method.
     * @params {string} method - The random string method to use.
     */
    set jitterMethod(method)
    {
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
            return void console.log(`${str} not a valid direction.`);
        }
    }





    // FPS [Number>0]

    get FPS()
    {
    	return this.#globalParams.FPS;
    }

    set FPS(num)
    {
        if (num>0)
        {
            this.#globalParams.FPS = Utils.constrain(num, 0);
        }
        else
        {
            return void console.log("Invalid FPS requested.");
        }
    }





    // MODE [String]

    get mode()
    {
        return this.#globalParams.mode;
    }

    set mode(mode)
    {
        if (mode)
        {
            if (mode===this.#globalParams.mode)
            {
                return void console.log(`Already in ${mode} mode. Mode not changed.`);
            }

            let b = document.body;
        	// b.removeEventListener("mousemove",  this.update());
        	// b.removeEventListener("enterframe", this.update());
        	// window.clearInterval(this._frameLoop);

            switch (mode)
            {
        		case "mousemove" :
        			b.addEventListener("mousemove", this.update());
        			break;

        		case "enterframe" :
        			b.addEventListener("enterframe", this.update());
        			this._frameLoop = window.setInterval(() =>
        				b.dispatchEvent(new Event("enterframe"))
        			, 1000/this.FPS);
        			break;

        		case "redraw" :
        			break;

                default :
                    return void console.log(`${mode} is not a recognised mode.`);
        	}

            this.#globalParams.mode = mode;
        }
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
        this.#globalParams.accuracy = Math.floor(Utils.constrain(num, 0));
    }





    /**
     * Get the last known mouse pointer coordinates, relative to the viewport, in pixels.
     * @return {Object} An object containing x and y properties.
     */
    get pointer()
    {
        return {
            x: this.#pointer.x,
            y: this.#pointer.y
        }
    }







    ////////////////////////////
    //                        //
    //     PUBLIC METHODS     //
    //                        //
    ////////////////////////////



    /**
     * Add a new effect to the effect stack.
     * @param {string|Object} property - The predefined style rule as a string, or an object containing a CSS style configuration.
     * @param {string} [property.rule] - The custom CSS style rule to use.
     * @param {string} [property.func] - The CSS function of the given style rule.
     * @param {number} [property.min] - The minimum style value.
     * @param {number} [property.max] - The maximum style value.
     * @param {number} [property.default] - The default style value.
     * @param {string} [property.unit] - The style rule's CSS unit.
     * @param {number|Object} near - The style value at the closest distance, either a single number or an object containing more properties.
     * @param {number} near.value - The style value at closest distance, as an object property.
     * @param {number} [near.scatter] - The random distribution of the value at the closest distance.
     * @param {string} [near.scatterMethod] - The random scatter method.
     * @param {number|Object} far - The style value at the furthest distance, either a single number or an object containing more properties.
     * @param {number} far.value - The style value at furthest distance, as an object property.
     * @param {number} [far.scatter] - The random distribution of the value at the furthest distance.
     * @param {string} [far.scatterMethod] - The random scatter method.
     * @param {Object} [params] - An object containing additional effect parameters.
     * @param {string} [params.id] - A unique string to identify the effect.
     * @param {number} [params.threshold] - The effect threshold for this effect, overriding the global value.
     * @param {number} [params.runoff] - The effect runoff for this effect, overriding the global value.
     * @param {Boolean} [params.invert] - XXXXX, overriding the global value.
     * @param {number} [params.attack] - , overriding the global value.
     * @param {number} [params.decay] - , overriding the global value.
     */
    addEffect(property, near, far, effectParams)
    {
        let cssParams;

        // if specifying a preset effect
        if(typeof property==="string")
        {
            if (this.#VALID_EFFECTS.hasOwnProperty(property))
            {
                cssParams = this.#VALID_EFFECTS[property];
            }
            else
            {
                throw new Error(`ProximityEffect: Couldn't find preset '${property}'`);
            }
        }
        else if(Utils.isObject(property) && typeof property.rule==="string")
        {
            cssParams = property;
        }
        else return void console.log(`'${property}' is not a valid style rule.`);


        if (typeof near==="number")
        {
            near = Utils.valToObj(Utils.constrain(near, cssParams.min, cssParams.max));
        }
        if (typeof far==="number")
        {
            far = Utils.valToObj(Utils.constrain(far, cssParams.min, cssParams.max));
        }


        this.#effects = this.#effects || [];
        this.#effects.push({
            rules:  cssParams,
            near:   near,
            far:    far,
            params: effectParams
        });


        for (let i=0; i<this.#nodeData.length; i++)
        {
            let effects = this.getNodeIndexData(i, "effects") || this.#setNodeIndexData(i, "effects", [])["effects"];
            let nearMethod = near.scatterMethod ? near.scatterMethod : this.#DEFAULT_SCATTER_METHOD,
                 farMethod =  far.scatterMethod ?  far.scatterMethod : this.#DEFAULT_SCATTER_METHOD;

            effects.push({
                near: near.scatter ? near.value+Utils.random(near.scatter, nearMethod) : near.value,
                far:   far.scatter ?  far.value+Utils.random( far.scatter,  farMethod) :  far.value
            });
        }
    }



    /**
     * Check if a named effect is already on the stack.
     * @param {string} name - The name of the effect to check for.
     * @return {boolean} True if the effect exists at least once.
     */
    hasEffect(name)
    {
        return this.effects.find(eff => eff["type"]===name)!==undefined;
    }



    /**
     * Remove all instances of an effect from the stack.
     * @param {string} name - The name of the effect to remove.
     */
    removeEffect(name)
    {
        if (this.hasEffect(name))
        {
            for (let i=0; i<this.#effects.length; i++)
            {
                let eff = this.#effects[i];
                if (eff["type"]===name)
                {
                    this.#effects.splice(i, 1);
                }
            }
        }
    }





    /**
     * Get the distance to the current target from the given node, in pixels.
     * @param {Element} n - The node to check.
     */
    distanceFrom(n)
    {
        return this.getNodeData(n, "distance");
    }



    /**
     * Get the distance to the current target from the given node index, in pixels.
     * @param {number} i - The node index to check.
     */
    distanceFromIndex(i)
    {
        return this.getNodeIndexData(i, "distance");
    }





    /**
     * Clear the target
     */
    clearTarget()
    {
        this.#globalParams.target = null;
    }





    /**
     * Recalculate each node"s centre point, including global offset and jitter.
     */
    setCenterPoints()
    {
        for (let n=0; n<this.nodes.length; n++)
        {
    		let node   = this.nodes[n],
                cssTxt = node.style.cssText;

            node.style.cssText = this.getNodeIndexData(n, "style");

    		let bounds = node.getBoundingClientRect(),
                x      = (bounds.left+bounds.right )*0.5 - this.offsetX,
                y      = (bounds.top +bounds.bottom)*0.5 - this.offsetY,
                jitter = this.getNodeIndexData(n, "jitter");

            if (jitter)
            {
                x += jitter.x;
                y += jitter.y;
            }

            node.style.cssText = cssTxt;
    		this.#setNodeIndexData(n, "center", {x: x, y: y});
        }
    }





    /**
     * @typedef {Object} NodeData
     * @property {Element} node - A reference to the node.
     * @property {Array<Object>} effects - An array of applied effects containing near and far values for each.
     * @property {number} effects[].near - Did this work?.
     */
    /**
     * Return an object containing the given node"s effect data or a specific property of that data.
     * @param {Element} n - The node to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {mixed|NodeData} The chosen property value, or an object containing the node"s data.
     */
    getNodeData(n, prop)
    {
        let data = this.#nodeData[this.nodes.findIndex(n => n===node)];
        return prop ? data[prop] : data;
    }



    /**
     * Return an object containing the given node index"s effect data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {Object} True if the property exists, false otherwise.
     */
    getNodeIndexData(i, prop)
    {
        return this.#nodeData[i][prop];
    }




    /**
     * Return a boolean determining if the given node has thegiven data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {boolean} An object containing the node"s data.
     */
    hasNodeIndexData(i, prop)
    {
        return this.#nodeData[i].hasOwnProperty(prop);
    }





	///////////////////////////////
    //                           //
	//      PRIVATE METHODS      //
    //                           //
	///////////////////////////////



    #init()
    {
        this.preventCenterCalculations = false;
        this.setCenterPoints();

        this.update = this.update.bind(this);

        window.addEventListener("scroll", this.reflowEvent.bind(this));
        window.addEventListener("resize", this.reflowEvent.bind(this));

        document.addEventListener("mousemove", this.updatePointer.bind(this));

        // TODO: add alternative trigger modes

        document.dispatchEvent(new MouseEvent("mousemove"));
        this.dispatchEvent(new Event("ready"));
        window.requestAnimationFrame(this.update);
    }





    #setNodeIndexData(n, prop, val)
    {
        if (!this.#nodeData[n])
        {
            this.#nodeData[n] = {};
        }
        this.#nodeData[n][prop] = val;
        return this.#nodeData[n];
    }





    #calculateJitters()
    {
        let method = this.jitterMethod ? this.jitterMethod : this.#DEFAULT_JITTER_METHOD;
        for (let i=0; i<this.nodes.length; i++) {
            this.#setNodeIndexData(i, "jitter", {
                x: Utils.random(this.jitter + this.jitterX, method),
                y: Utils.random(this.jitter + this.jitterY, method)
            });
        }
        if (!this.preventCenterCalculations) {
            this.setCenterPoints();
        }
    }










    ////////////////////
    //                //
    //     EVENTS     //
    //                //
    ////////////////////



    updatePointer(evt)
    {
        this.#pointer.x = evt.clientX;
        this.#pointer.y = evt.clientY;
    }





    reflowEvent(evt)
    {
        if (evt.currentTarget!==this)
        {
            this.dispatchEvent(new Event("reflow"));
        }

        // TODO: is this a hack? or the best way to do it?
        if (!this.preventCenterCalculations)
        {
            window.setTimeout(() => this.setCenterPoints(), 1);
        }
    }





    update(timestamp)
    {
        let view = document.documentElement;

        for (let n=0; n<this.nodes.length; n++)
        {
            let node    = this.nodes[n],
                bounds  = node.getBoundingClientRect(),
                center  = this.getNodeIndexData(n, "center");

            let centerX = center.x - (node.dataset["offsetx"]||0),
                centerY = center.y - (node.dataset["offsety"]||0);

            let tx, ty,
                   last = this.getNodeIndexData(n, "lastDelta");


            if (this.target)
            {
                let b = this.target.getBoundingClientRect();
                tx = (b.left + b.right)*0.5;
                ty = (b.top + b.bottom)*0.5;
            }
            else
            {
                tx = this.pointer.x;
                ty = this.pointer.y;
            }

            let dx = tx - centerX,
                dy = ty - centerY,
                dd, td, d;

            // calculate distance
            if (this.direction==="both")
            {
                dd = Utils.pythagoras(dx, dy);
            }
            else
            {
                dd = Math.abs(this.direction==="horizontal" ? dx : dy);
            }

            // normalise to boundaries
    		td = Utils.constrain((dd-this.threshold) * this.#globalParams.invRunoff, 0, 1);
            if (this.invert)
            {
                td = 1 - td;
            }

            this.#setNodeIndexData(n, "distance", td);

            // apply easing
            d = last+(td-last)*(Utils.XOR(td>last, this.invert) ? this.decay : this.attack);

            // round value to reduce jitter
            d = Utils.roundTo(d, this.accuracy);

            this.#setNodeIndexData(n, "lastDelta", d);


            if (this.effects.length>0)
            {
                let styles = {};

                for (let f=0; f<this.effects.length; f++)
                {
      				let effect   = this.effects[f],
                        nodeVals = this.getNodeIndexData(n, "effects")[f];

                    let near     = nodeVals.near,
                        far      = nodeVals.far,
                        rule     = effect.rules.rule,
                        func     = effect.rules.func,
                        unit     = effect.rules.unit || "",
                        val      = Utils.delta(d, near, far);


                    if (!func)
                    {
                        node.style[rule] = `${val}${unit}`;
                    }
                    else
                    {
                        if (!styles[rule])
                        {
                            styles[rule] = [];
                        }
                        styles[rule].push(func+"("+val+unit+")");
                    }
                }
                

                for (let rule in styles)
                {
                    node.style[rule] = styles[rule].join(" ");
                }

                let ix = Math.floor(d*1000);
                node.style.zIndex = this.invert ? ix : 1000-ix;
            }
        }

        if (this.mode==="redraw")
        {
            window.requestAnimationFrame(this.update);
        }

        this.dispatchEvent(new Event("redraw"));

    } // update end

}









/**
 * EffectInstance Class
 */
class EffectInstance
{

    #VALID_EFFECTS = {
        translateX:      {                  default:       0, rule: "transform",       func: "translateX",  unit: "px"},
        translateY:      {                  default:       0, rule: "transform",       func: "translateY",  unit: "px"},
        translateZ:      {                  default:       0, rule: "transform",       func: "translateZ",  unit: "px"},
        rotate:          {                  default:       0, rule: "transform",       func: "rotate",      unit: "deg"},
        rotateX:         {                  default:       0, rule: "transform",       func: "rotateX",     unit: "deg"},
        rotateY:         {                  default:       0, rule: "transform",       func: "rotateY",     unit: "deg"},
        rotateZ:         {                  default:       0, rule: "transform",       func: "rotateZ",     unit: "deg"},
        scale:           {                  default:       1, rule: "transform",       func: "scale"},
        scaleX:          {                  default:       1, rule: "transform",       func: "scaleX"},
        scaleY:          {                  default:       1, rule: "transform",       func: "scaleY"},
        scaleZ:          {                  default:       1, rule: "transform",       func: "scaleZ"},
        skewX:           {                  default:       0, rule: "transform",       func: "skewX",       unit: "deg"},
        skewY:           {                  default:       0, rule: "transform",       func: "skewY",       unit: "deg"},
        
        blur:            {min: 0,           default:       0, rule: "filter",          func: "blur",        unit: "px"},
        brightness:      {min: 0,           default:     100, rule: "filter",          func: "brightness",  unit: "%"},
        contrast:        {min: 0,           default:     100, rule: "filter",          func: "contrast",    unit: "%"},
        grayscale:       {min: 0, max: 100, default:       0, rule: "filter",          func: "grayscale",   unit: "%"},
        hueRotate:       {                  default:       0, rule: "filter",          func: "hue-rotate",  unit: "deg"},
        invert:          {min: 0, max: 100, default:       0, rule: "filter",          func: "invert",      unit: "%"},
        opacity:         {min: 0, max: 100, default:     100, rule: "filter",          func: "opacity",     unit: "%"},
        saturate:        {min: 0, max: 100, default:     100, rule: "filter",          func: "saturate",    unit: "%"},
        sepia:           {min: 0, max: 100, default:       0, rule: "filter",          func: "sepia",       unit: "%"},

        color:           {min: 0, max: 255, default: [0,0,0], rule: "color",           func: "rgb",                      args: 3},
        backgroundColor: {min: 0, max: 255, default: [0,0,0], rule: "backgroundColor", func: "rgb",                      args: 3},
        scale3D:         {                  default: [1,1,1], rule: "transform",       func: "scale3D",                  args: 3}
    };


    #VALID_RANDOM_METHODS   = new Set(["normal", "uniform"]);
    #DEFAULT_SCATTER_METHOD = "uniform";
    #name;



    /**
     * 
     * @constructor
     * @param {string|Object} property - The predefined style rule as a string, or an object containing a CSS style configuration.
     * @param {string} [property.rule] - The custom CSS style rule to use.
     * @param {string} [property.func] - The CSS function of the given style rule.
     * @param {number} [property.min] - The minimum style value.
     * @param {number} [property.max] - The maximum style value.
     * @param {number} [property.default] - The default style value.
     * @param {string} [property.unit] - The style rule's CSS unit.
     * @param {number|Object} near - The style value at the closest distance, either a single number or an object containing more properties.
     * @param {number} near.value - The style value at closest distance, as an object property.
     * @param {number} [near.scatter] - The random distribution of the value at the closest distance.
     * @param {string} [near.scatterMethod] - The random scatter method.
     * @param {number|Object} far - The style value at the furthest distance, either a single number or an object containing more properties.
     * @param {number} far.value - The style value at furthest distance, as an object property.
     * @param {number} [far.scatter] - The random distribution of the value at the furthest distance.
     * @param {string} [far.scatterMethod] - The random scatter method.
     * @param {Object} [params] - An object containing additional effect parameters.
     * @param {string} [params.id] - A unique string to identify the effect.
     * @param {number} [params.threshold] - The effect threshold for this effect, overriding the global value.
     * @param {number} [params.runoff] - The effect runoff for this effect, overriding the global value.
     * @param {Boolean} [params.invert] - XXXXX, overriding the global value.
     * @param {number} [params.attack] - , overriding the global value.
     * @param {number} [params.decay] - , overriding the global value.
     */
    constructor(property, values, params={})
    {
        let cssParams;

        // if specifying a preset effect
        if(typeof property==="string")
        {
            if (this.#VALID_EFFECTS.hasOwnProperty(property))
            {
                cssParams = this.#VALID_EFFECTS[property];
            }
            else
            {
                throw new Error(`ProximityEffect: Couldn't find preset '${property}'`);
            }
        }
        else if(Utils.isObject(property) && typeof property.rule==="string")
        {
            cssParams = property;
        }
        else return void console.log(`'${property}' is not a valid style rule.`);
    }


}










/*
 * Utilities Class
 */

class Utils
{



    static constrain = (num, min, max) => {
        if (typeof num!=="number") {
            return NaN;
        }
        if (min!==undefined && min!==null && typeof min==="number") {
            num = Math.max(num, min);
        }
        if (max!==undefined && max!==null && typeof max==="number") {
            num = Math.min(num, max);
        }
        return num;
    };
    

    static roundTo = (num, dp=0) => {
        let mult = Math.pow(dp+1,10);
        return Math.round(num*mult)/mult;
    };
    

    static delta = (num, a, b) => (b - a) * Utils.constrain(num, 0, 1) + a;
    

    static map = (num, inMin, inMax, outMin, outMax) =>
            (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    

    static random = (v=2, m="uniform") => {
        switch (m) {
    
            // intentional fall-throughs
            case "gaussian" :
            case "normal" :
                let t = 0,
                    c = 6;
                for (let i=0; i<c; i++) {
                    t += (Math.random()-0.5)*v;
                }
                return t/c;
                break;
    
            case "uniform" :
            default :
                return (Math.random()-0.5)*v;
        }
    }
    

    static XOR = (a, b) => (a || b) && !(a && b);
    

    static pythagoras = (a, b) => Math.sqrt(a*a+b*b);


    static isVisibleInViewport = (el) => {
        let bounds = el.getBoundingClientRect(),
            view   = document.documentElement;
        return bounds.right >=0 && bounds.left<=view.clientWidth &&
               bounds.bottom>=0 && bounds.top <=view.clientHeight;
    };
    

    //static startTimer = (delay) =>
    

    static valToObj = (val, key="value") => {
        let obj = {};
        obj[key] = val;
        return obj;
    };
    

    static isObject = obj => obj==Object(obj);
    
    

}






