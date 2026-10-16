import * as AdashaUtils from './AdashaUtils.mjs';
import { DEFINED_STYLES } from './definedStyles.mjs';
import * as Validate from './validate.mjs';



/*
 * CUSTOM STYLE CHECKS
 *
 * A custom style's rule, func and unit end up in a node's inline style, so
 * they are checked before use. This stops a configuration object from
 * writing anything other than one numeric value to one CSS property: no
 * cssText, no CSSStyleDeclaration methods, no url() or other functions that
 * fetch resources, and no extra declarations smuggled in through the unit.
 */

// camelCase ("letterSpacing", "webkitFilter") or kebab-case ("letter-spacing", "-webkit-filter")
const CSS_PROPERTY = /^(?:[a-z][a-zA-Z0-9]*|-?[a-z][a-z0-9]*(?:-[a-z0-9]+)+)$/;

// members of CSSStyleDeclaration and Object.prototype that aren't CSS properties
const RESERVED_RULES = new Set([
	"cssText", "length", "parentRule", "item", "getPropertyValue", "getPropertyPriority",
	"setProperty", "removeProperty", "constructor", "hasOwnProperty", "isPrototypeOf",
	"propertyIsEnumerable", "toLocaleString", "toString", "valueOf",
]);

const CSS_FUNCTION = /^[a-zA-Z][a-zA-Z0-9-]*$/;

// functions that load resources or read values from elsewhere
const BLOCKED_FUNCTIONS = new Set([
	"url", "src", "image", "image-set", "cross-fade", "element", "attr", "var", "env", "expression",
]);

const CSS_UNITS = new Set([
	"%",
	// length
	"px", "em", "rem", "ex", "rex", "ch", "rch", "cap", "rcap", "ic", "ric", "lh", "rlh",
	"vw", "vh", "vi", "vb", "vmin", "vmax",
	"svw", "svh", "svi", "svb", "svmin", "svmax",
	"lvw", "lvh", "lvi", "lvb", "lvmin", "lvmax",
	"dvw", "dvh", "dvi", "dvb", "dvmin", "dvmax",
	"cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax",
	"cm", "mm", "q", "in", "pt", "pc",
	// angle, time, resolution, flex
	"deg", "grad", "rad", "turn", "s", "ms", "dpi", "dpcm", "dppx", "x", "fr",
]);

const STYLE_PARAMS = {
	id:        (v, name) => { if (typeof v!=="string") { throw new TypeError(`ProximityEffect: ${name} must be a string.`); } return v; },
	threshold: (v, name) => Math.max(Validate.finite(v, name), 0),
	runoff:    (v, name) => Math.max(Validate.finite(v, name), 0),
	invert:    (v, name) => Validate.boolean(v, name),
	attack:    (v, name) => AdashaUtils.constrain(Validate.finite(v, name), 0, 1),
	decay:     (v, name) => AdashaUtils.constrain(Validate.finite(v, name), 0, 1),
};


// read an own property only, so values can't come from a (polluted) prototype
const own = (obj, key) => Object.hasOwn(obj, key) ? obj[key] : undefined;

const optionalFinite = (value, name) => value===undefined ? undefined : Validate.finite(value, name);


function checkCustomStyle(property)
{
	const rule = own(property, "rule"),
		  func = own(property, "func"),
		  unit = own(property, "unit");

	if (typeof rule!=="string")
	{
		throw new TypeError("ProximityEffect: style object does not define a style rule.");
	}
	if (!CSS_PROPERTY.test(rule) || RESERVED_RULES.has(rule))
	{
		throw new RangeError(`ProximityEffect: '${rule}' is not a valid CSS property name.`);
	}

	if (func!==undefined)
	{
		if (typeof func!=="string")
		{
			throw new TypeError("ProximityEffect: a style's func must be a string.");
		}
		if (!CSS_FUNCTION.test(func) || BLOCKED_FUNCTIONS.has(func.toLowerCase()))
		{
			throw new RangeError(`ProximityEffect: '${func}' is not an allowed CSS function.`);
		}
	}

	if (unit!==undefined && unit!=="")
	{
		if (typeof unit!=="string")
		{
			throw new TypeError("ProximityEffect: a style's unit must be a string.");
		}
		if (!CSS_UNITS.has(unit.toLowerCase()))
		{
			throw new RangeError(`ProximityEffect: '${unit}' is not a recognised CSS unit.`);
		}
	}

	const min = optionalFinite(own(property, "min"), "style min"),
		  max = optionalFinite(own(property, "max"), "style max");

	if (min!==undefined && max!==undefined && min>max)
	{
		throw new RangeError(`ProximityEffect: style min (${min}) is greater than max (${max}).`);
	}

	return {
		rule,
		func,
		unit:    unit || undefined,
		min,
		max,
		default: optionalFinite(own(property, "default"), "style default"),
	};
}


function checkParams(params)
{
	if (params==null)
	{
		return {};
	}
	if (!AdashaUtils.isObject(params))
	{
		throw new TypeError("ProximityEffect: style params must be an object.");
	}

	const checked = {};
	for (const key in STYLE_PARAMS)
	{
		const value = own(params, key);
		if (value!==undefined)
		{
			checked[key] = STYLE_PARAMS[key](value, `style ${key}`);
		}
	}
	return checked;
}



/**
 * Add a new style rule to the styles animation stack.
 * @param {string|Object} property - The predefined style rule as a string, or an object containing a CSS style configuration.
 * @param {string} [property.rule] - The CSS property to write, in camelCase or kebab-case. cssText and other non-property members are rejected.
 * @param {string} [property.func] - The CSS function wrapping the value. Functions that load resources (url() and similar) are rejected.
 * @param {number} [property.min] - The minimum style value.
 * @param {number} [property.max] - The maximum style value.
 * @param {number} [property.default] - The default style value.
 * @param {string} [property.unit] - The style rule's CSS unit, from a fixed list of CSS units.
 * @param {Array<number|Object>} keyframes - The style values, from the closest distance to the furthest. Each is a number, or an object with a numeric value and optional scatter and scatterMethod.
 * @param {Object} [params] - An object containing additional effect parameters.
 * @param {string} [params.id] - A unique string to identify the style rule.
 * @param {number} [params.threshold] - The animation distance threshold for this style, overriding the global value.
 * @param {number} [params.runoff] - The animation runoff distance for this style, overriding the global value.
 * @param {Boolean} [params.invert] - Whether to invert the effect for this style, overriding the global value.
 * @param {number} [params.attack] - The easing rate towards the near value (0-1) for this style, overriding the global value.
 * @param {number} [params.decay] - The easing rate towards the far value (0-1) for this style, overriding the global value.
 * @throws {TypeError} If an argument is the wrong type.
 * @throws {RangeError} If a value is not allowed (unknown preset, unsafe rule, func or unit, non-finite number).
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
			cssParams = checkCustomStyle(property);
		}
		else
		{
			throw new TypeError(`ProximityEffect: '${String(property)}' is not a valid style rule.`);
		}

		if(!Array.isArray(keyframes) || keyframes.length<2)
		{
			throw new TypeError("ProximityEffect: a style needs an array of at least two keyframes (near and far).");
		}

		// the caller's array is never touched: build a normalised copy from own properties only.
		// Every key is set, even when undefined, so lookups never reach the prototype.
		const last   = keyframes.length-1;
		const frames = keyframes.map((val, v) =>
		{
			const name = `keyframe ${v}`;
			let frame;

			if (typeof val==="number")
			{
				frame = { value: val, distance: v===0 ? 0 : v===last ? 1 : undefined, scatter: undefined, scatterMethod: undefined };
			}
			else if (AdashaUtils.isObject(val) && typeof own(val, "value")==="number")
			{
				const distance      = optionalFinite(own(val, "distance"), `${name} distance`),
					  scatter       = optionalFinite(own(val, "scatter"), `${name} scatter`),
					  scatterMethod = own(val, "scatterMethod");

				if (distance!==undefined && (distance<0 || distance>1))
				{
					throw new RangeError(`ProximityEffect: ${name} distance must be between 0 and 1.`);
				}
				if (scatter!==undefined && scatter<0)
				{
					throw new RangeError(`ProximityEffect: ${name} scatter must not be negative.`);
				}
				if (scatterMethod!==undefined)
				{
					Validate.randomMethod(scatterMethod, `${name} scatterMethod`);
				}
				frame = { value: own(val, "value"), distance, scatter, scatterMethod };
			}
			else
			{
				throw new TypeError(`ProximityEffect: keyframe ${v} must be a number or an object with a numeric 'value'.`);
			}

			Validate.finite(frame.value, `${name} value`);
			frame.value = AdashaUtils.constrain(frame.value, cssParams.min, cssParams.max);
			return frame;
		});

		const checkedParams = checkParams(params);

		// presets are known by their preset name, custom styles by func or rule
		this.#name         = typeof property==="string" ? property : (cssParams.func ?? cssParams.rule);
		this.#rule         = cssParams.rule;
		this.#func         = cssParams.func;
		this.#unit         = cssParams.unit;
		this.#min          = cssParams.min;
		this.#max          = cssParams.max;
		this.#defaultValue = cssParams.default;
		this.#near         = frames[0];
		this.#far          = frames[last];
		this.#params       = checkedParams;
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

	/** The normalised keyframe at the closest distance (a copy). */
	get near() { return { ...this.#near }; }

	/** The normalised keyframe at the furthest distance (a copy). */
	get far() { return { ...this.#far }; }

	/** Per-style parameter overrides (a copy). */
	get params() { return { ...this.#params }; }

}
