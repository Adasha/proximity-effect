/*
 * UTILITY METHODS
 */





// MATH HELPERS



/**
 * Constrain a number between an upper and lower boundary.
 * @param {Number} num The value to constrain.
 * @param {Number} min The minimum boundary.
 * @param {Number} max The maximum boundary.
 * @returns {Number} The constrained value.
 */
export const constrain = (num, min, max) => {
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



/**
 * Rounds a value to a specified number of decimal places.
 * @param {Number} num The base number to round.
 * @param {Number} dp Number of decimal places.
 * @returns {Number} The rounded value.
 */
export const roundTo = (num, dp=0) => {
	dp = Math.max(dp, 0);
	let mult = Math.pow(10, dp);
	return Math.round(num*mult)/mult;
};



/**
 * Finds the specified linear interpolation between two values.
 * @param {Number} num The distance between the numbers to calculate, (0<=num<=1).
 * @param {Number} a The first number.
 * @param {Number} b The second number.
 * @returns {Number} The interpolated value.
 */
export const lerp = (num, a, b) => (b - a) * constrain(num, 0, 1) + a;



/**
 * Map an input value on one scale to an output value of a different scale.
 * @param {Number} num The input value.
 * @param {Number} inMin The lower input scale threshold.
 * @param {Number} inMax The upper input scale threshold.
 * @param {Number} outMin The lower output scale threshold.
 * @param {Number} outMax The upper output scale threshold.
 * @returns {Number} A value mapped to the output scale.
 */
export const map = (num, inMin, inMax, outMin, outMax) =>
	inMin !== inMax ? (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin : NaN;



/**
 * Generate a random number +/- v/2
 * @param {Number} v Scaling value of the random number (default=2).
 * @param {String} m Type of randomness, either "normal/gaussian" or "uniform" (default).
 * @returns {Number} A random number centered around 0.
 */
export const random = (v=2, m="uniform") => {
	switch (m) {

	// intentional fall-throughs
	case "gaussian" :
	case "normal" : {
		let t = 0,
			c = 6;
		for (let i=0; i<c; i++) {
			t += (Math.random()-0.5)*v;
		}
		return t/c;
	}
    
	case "linear" :
	case "uniform" :
	default :
		return (Math.random()-0.5)*v;
	}
};



/**
 * Return exclusive OR of two inputs.
 * @param {*} a Input A.
 * @param {*} b Input B.
 * @returns {Boolean} The XOR of the two inputs.
 */
export const xor = (a, b) => (a || b) && !(a && b);





// DOM HELPERS


/**
 * Determine if a DOM element is visible in the browser's viewport.
 * @param {*} el The DOM element to check.
 * @returns {Boolean} Whether the element is visible.
 */
export const isVisibleInViewport = (el) => {
	if(!document) {
		console.log("DOM not found.");
		return;
	}
	if(!el) return undefined;
	let bounds = el.getBoundingClientRect(),
		view   = document.documentElement;
	return bounds.right >=0 && bounds.left<=view.clientWidth &&
            bounds.bottom>=0 && bounds.top <=view.clientHeight;
};





// GENERIC OBJECT HELPERS 


/**
 * Encapsulates a simple value into a key/value Object.
 * @param {*} val The value to encapsulate.
 * @param {String} key The key name to use (defaults to 'value').
 * @returns {Object} The constructed object.
 */
export const valToObj = (val, key="value") => ({ [key]: val });



/**
 * Determines if an input is a true Object, rather than object-like.
 * @param {*} obj The input to analyse.
 * @returns {Boolean} If the input is a true Object.
 */
export const isObject = (obj) => Object.prototype.toString.call(obj) === "[object Object]";


