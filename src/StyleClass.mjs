import * as AdashaUtils from './AdashaUtils.mjs';
import { DEFINED_STYLES } from './definedStyles.mjs';


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
 * @param {Boolean} [params.invert] - Whether to invert the effect for this style, overriding the global value.
 * @param {number} [params.attack] - The easing rate towards the near value (0-1) for this style, overriding the global value.
 * @param {number} [params.decay] - The easing rate towards the far value (0-1) for this style, overriding the global value.
 */
export default class Style
{

	#name;
	#rule;
	#func;
	#unit;
	#min;
	#max;
	#defaultValue;
	#near;
	#far;
	#params;



	constructor(property, keyframes, params)
	{
		let cssParams;

		// if specifying a preset style
		if(typeof property==="string")
		{
			if (Object.hasOwn(DEFINED_STYLES, property))
			{
				cssParams = DEFINED_STYLES[property];
			}
			else
			{
				throw new RangeError(`ProximityEffect: Couldn't find preset '${property}'`);
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
				throw new TypeError("ProximityEffect: style object does not define a style rule.");
			}
		}
		else
		{
			throw new TypeError(`ProximityEffect: '${String(property)}' is not a valid style rule.`);
		}

		if(!Array.isArray(keyframes) || keyframes.length<2)
		{
			throw new TypeError("ProximityEffect: a style needs an array of at least two keyframes (near and far).");
		}

		// the caller's array is never touched: build a normalised copy
		const frames = keyframes.map((val, v) =>
		{
			let frame;
			if (typeof val==="number")
			{
				frame = { value: val };
				if (v===0)
				{
					frame.distance = 0;
				}
				else if (v===keyframes.length-1)
				{
					frame.distance = 1;
				}
			}
			else if (AdashaUtils.isObject(val) && typeof val.value==="number")
			{
				frame = { ...val };
			}
			else
			{
				throw new TypeError(`ProximityEffect: keyframe ${v} must be a number or an object with a numeric 'value'.`);
			}
			frame.value = AdashaUtils.constrain(frame.value, cssParams.min, cssParams.max);
			return frame;
		});

		// presets are known by their preset name, custom styles by func or rule
		this.#name         = typeof property==="string" ? property : (cssParams.func ?? cssParams.rule);
		this.#rule         = cssParams.rule;
		this.#func         = cssParams.func;
		this.#unit         = cssParams.unit;
		this.#min          = cssParams.min;
		this.#max          = cssParams.max;
		this.#defaultValue = cssParams.default;
		this.#near         = frames[0];
		this.#far          = frames[frames.length-1];
		this.#params       = params ? { ...params } : {};
	}



	/** The name used to find this style: the preset name, or a custom style's func (or rule if it has none). */
	get name() { return this.#name; }

	/** The CSS property this style writes to (e.g. "transform"). */
	get rule() { return this.#rule; }

	/** The CSS function wrapping the value (e.g. "translateX"), or undefined for a plain property. */
	get func() { return this.#func; }

	/** The CSS unit appended to the value, if any. */
	get unit() { return this.#unit; }

	/** The minimum allowed value, if any. */
	get min() { return this.#min; }

	/** The maximum allowed value, if any. */
	get max() { return this.#max; }

	/** The resting value of the style. */
	get defaultValue() { return this.#defaultValue; }

	/** The normalised keyframe at the closest distance. */
	get near() { return this.#near; }

	/** The normalised keyframe at the furthest distance. */
	get far() { return this.#far; }

	/** Per-style parameter overrides (a copy). */
	get params() { return { ...this.#params }; }

}
