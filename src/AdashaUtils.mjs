/*
 * Utility methods
 */



/**
 * Constrain a number between an upper and lower boundary.
 * @param {Number} num The value to constrain
 * @param {Number} min The minimum threshold.
 * @param {Number} max The maximum threshold.
 * @returns {Number} The constrained value.
 */
export var constrain = (num, min, max) => {
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
 * 
 * @param {*} num 
 * @param {*} dp 
 * @returns 
 */
export var roundTo = (num, dp=0) => {
	let mult = Math.pow(dp+1,10);
	return Math.round(num*mult)/mult;
};





/**
 * 
 * @param {*} num 
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
export var delta = (num, a, b) => (b - a) * constrain(num, 0, 1) + a;





/**
 * Map an input value on one scale to an output value of a different scale.
 * @param {Number} num The input value.
 * @param {*} inMin The lower input scale threshold.
 * @param {*} inMax The upper input scale threshold.
 * @param {*} outMin The lower output scale threshold.
 * @param {*} outMax The upper output scale threshold.
 * @returns {Number} A value mapped to the output scale.
 */
export var map = (num, inMin, inMax, outMin, outMax) =>
	(num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;





/**
 * Generate a random number +/- v/2
 * @param {Number} v Scaling value of the random number (default 2)
 * @param {String} m Type of randomness, either "normal/gaussian" or "uniform" (default)
 * @returns A random number centred around 0
 */
export var random = (v=2, m="uniform") => {
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
    
	case "uniform" :
	default :
		return (Math.random()-0.5)*v;
	}
};





/**
 * Return exclusive OR of two inputs
 * @param {*} a 
 * @param {*} b 
 * @returns {Boolean}
 */
export var XOR = (a, b) => (a || b) && !(a && b);





/**
 * 
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
export var pythagoras = (a, b) => Math.sqrt(a*a+b*b);





/**
 * 
 * @param {*} el 
 * @returns 
 */
export var isVisibleInViewport = (el) => {
	let bounds = el.getBoundingClientRect(),
		view   = document.documentElement;
	return bounds.right >=0 && bounds.left<=view.clientWidth &&
            bounds.bottom>=0 && bounds.top <=view.clientHeight;
};





//export var startTimer = (delay) =>





/**
 * 
 * @param {*} val 
 * @param {*} key 
 * @returns 
 */
export var valToObj = (val, key="value") => {
	let obj = {};
	obj[key] = val;
	return obj;
};





/**
 * Determines if an input is a true Object, rather than object-like.
 * @param {*} obj The input to analyse.
 * @returns {Boolean} If the input is a true Object.
 */
export var isObject = obj => obj==Object(obj);


