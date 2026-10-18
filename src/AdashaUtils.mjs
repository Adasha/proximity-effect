/*
 * UTILITY METHODS
 */





// MATH HELPERS



/**
 * Constrain a number between an upper and lower boundary.
 * @param {Number} num The value to constrain.
 * @param {Number} min The minimum boundary.
 * @param {Number} max The maximum boundary.
 * @returns {Number} The constrained value (NaN stays NaN).
 * @throws {TypeError} If `num` is not a number.
 */
export const constrain = (num, min, max) => {
	if (typeof num!=="number") {
		throw new TypeError(`constrain: expected a number but received ${typeof num}.`);
	}
	if (typeof min==="number") {
		num = Math.max(num, min);
	}
	if (typeof max==="number") {
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
 * Generate a random number +/- v/2
 * @param {Number} v Scaling value of the random number (default=2).
 * @param {String} m Type of randomness, either "uniform" (default) or "normal" ("gaussian" is an alias).
 * @returns {Number} A random number centered around 0.
 * @throws {RangeError} If the method is not recognised.
 */
export const random = (v=2, m="uniform") => {
	switch (m) {

	case "gaussian" :
	case "normal" : {
		let t = 0,
			c = 6;
		for (let i=0; i<c; i++) {
			t += (Math.random()-0.5)*v;
		}
		return t/c;
	}

	case "uniform" :
		return (Math.random()-0.5)*v;

	default :
		throw new RangeError(`random: unknown method '${m}'. Use "uniform" or "normal".`);
	}
};



/**
 * Return exclusive OR of two inputs.
 * @param {*} a Input A.
 * @param {*} b Input B.
 * @returns {Boolean} The XOR of the two inputs.
 */
export const xor = (a, b) => Boolean(a) !== Boolean(b);





// GENERIC OBJECT HELPERS


/**
 * Determines if an input is a true Object, rather than object-like.
 * @param {*} obj The input to analyse.
 * @returns {Boolean} If the input is a true Object.
 */
export const isObject = (obj) => Object.prototype.toString.call(obj) === "[object Object]";


