import * as AdashaUtils from './AdashaUtils.mjs';


/**
 * Add a new style rule to the styles animation stack.
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
 * @param {string} [params.id] - A unique string to identify the style rule.
 * @param {number} [params.threshold] - The animation distance threshold for this style, overriding the global value.
 * @param {number} [params.runoff] - The animation runoff distance for this style, overriding the global value.
 * @param {Boolean} [params.invert] - XXXXX, overriding the global value.
 * @param {number} [params.attack] - , overriding the global value.
 * @param {number} [params.decay] - , overriding the global value.
 */
export default class Style extends Object
{

	#rule;
	#func;
	#unit;
	#args;
	#min;
	#max;
	#defaultValue;
	#params;



	#DEFINED_STYLES = {
		translateX:      { rule: "transform",       func: "translateX", unit: "px",                             default:       0 },
		translateY:      { rule: "transform",       func: "translateY", unit: "px",                             default:       0 },
		translateZ:      { rule: "transform",       func: "translateZ", unit: "px",                             default:       0 },
		rotate:          { rule: "transform",       func: "rotate",     unit: "deg",                            default:       0 },
		rotateX:         { rule: "transform",       func: "rotateX",    unit: "deg",                            default:       0 },
		rotateY:         { rule: "transform",       func: "rotateY",    unit: "deg",                            default:       0 },
		rotateZ:         { rule: "transform",       func: "rotateZ",    unit: "deg",                            default:       0 },
		scale:           { rule: "transform",       func: "scale",                                              default:       1 },
		scaleX:          { rule: "transform",       func: "scaleX",                                             default:       1 },
		scaleY:          { rule: "transform",       func: "scaleY",                                             default:       1 },
		scaleZ:          { rule: "transform",       func: "scaleZ",                                             default:       1 },
		skewX:           { rule: "transform",       func: "skewX",      unit: "deg",                            default:       0 },
		skewY:           { rule: "transform",       func: "skewY",      unit: "deg",                            default:       0 },
		
		blur:            { rule: "filter",          func: "blur",       unit: "px",           min: 0,           default:       0 },
		brightness:      { rule: "filter",          func: "brightness", unit: "%",            min: 0,           default:     100 },
		contrast:        { rule: "filter",          func: "contrast",   unit: "%",            min: 0,           default:     100 },
		grayscale:       { rule: "filter",          func: "grayscale",  unit: "%",            min: 0, max: 100, default:       0 },
		hueRotate:       { rule: "filter",          func: "hue-rotate", unit: "deg",                            default:       0 },
		invert:          { rule: "filter",          func: "invert",     unit: "%",            min: 0, max: 100, default:       0 },
		opacity:         { rule: "filter",          func: "opacity",    unit: "%",            min: 0, max: 100, default:     100 },
		saturate:        { rule: "filter",          func: "saturate",   unit: "%",            min: 0, max: 100, default:     100 },
		sepia:           { rule: "filter",          func: "sepia",      unit: "%",            min: 0, max: 100, default:       0 },

		color:           { rule: "color",           func: "rgb",                     args: 3, min: 0, max: 255, default: [0,0,0] },
		backgroundColor: { rule: "backgroundColor", func: "rgb",                     args: 3, min: 0, max: 255, default: [0,0,0] },
		scale3D:         { rule: "transform",       func: "scale3D",                 args: 3,                   default: [1,1,1] }
	};





	constructor(property, keyframes, params)
	{
		super();

		let cssParams;

		// if specifying a preset style
		if(typeof property==="string")
		{
			if (this.#DEFINED_STYLES.hasOwnProperty(property))
			{
				cssParams = this.#DEFINED_STYLES[property];
			}
			else
			{
				throw new Error(`ProximityEffect: Couldn't find preset '${property}'`);
			}
		}
		else if(AdashaUtils.isObject(property))
		{
			if(typeof property.rule==="string")
			{
				cssParams = property;
			}
			else
			{
				throw new Error(`ProximityEffect: '${property}' object does not define a style rule.`);
			}
		}
		else
		{
			throw new Error(`ProximityEffect: '${property}' is not a valid style rule.`);
		}


		
		// convenience function for adding basic near/far values like the old version
		for(let v=0; v<keyframes.length; v++)
		{
			let val = keyframes[v];
			if (typeof val==="number")
			{
				keyframes[v] = AdashaUtils.valToObj(AdashaUtils.constrain(val, cssParams.min, cssParams.max));
				switch(v)
				{
					case 0 :
						keyframes[v].distance = 0;
						break;
					case keyframes.length-1 :
						keyframes[v].distance = 1;
						break;
				}
			}
		}

		let near = keyframes[0];
		let far  = keyframes[keyframes.length-1];

		

		this.rule         = cssParams.rule;
		this.func         = cssParams.func;
		this.unit         = cssParams.unit;
		this.args         = cssParams.args;
		this.min          = cssParams.min;
		this.max          = cssParams.max;
		this.defaultValue = cssParams.default;
		
		
		let styleObj = {
			rules:  cssParams,
			near:   near,
			far:    far,
			params: params
		};

	}





	/**
	 * 
	 */
	get rule()
	{
		return this.#rule;
	}
	/**
	 * 
	 */
	set rule(rule)
	{
		this.#rule = rule;
	}



	/**
	 * 
	 */
	get func()
	{
		return this.#func;
	}
	/**
	 * 
	 */
	set func(func)
	{
		this.#func = func;
	}



	/**
	 * 
	 */
	get unit()
	{
		return this.#unit;
	}
	/**
	 * 
	 */
	set unit(unit)
	{
		this.#unit = unit;
	}



	/**
	 * 
	 */
	get args()
	{
		return this.#args;
	}
	/**
	 * 
	 */
	set args(args)
	{
		this.#args = args;
	}



	/**
	 * 
	 */
	get min()
	{
		return this.#min;
	}
	/**
	 * 
	 */
	set min(min)
	{
		this.#min = min;
	}



	/**
	 * 
	 */
	get max()
	{
		return this.#max;
	}
	/**
	 * 
	 */
	set max(max)
	{
		this.#max = max;
	}



	/**
	 * 
	 */
	get defaultValue()
	{
		return this.#defaultValue;
	}
	/**
	 * 
	 */
	set defaultValue(defaultValue)
	{
		this.#defaultValue = defaultValue;
	}



	/**
	 * 
	 */
	get params()
	{
		return this.#params;
	}
	/**
	 * 
	 */
	set params(params)
	{
		this.#params = params;
	}



 
}