/*
 * Utility methods
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


export var roundTo = (num, dp=0) => {
	let mult = Math.pow(dp+1,10);
	return Math.round(num*mult)/mult;
};


export var delta = (num, a, b) => (b - a) * constrain(num, 0, 1) + a;


export var map = (num, inMin, inMax, outMin, outMax) =>
	(num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;


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


export var XOR = (a, b) => (a || b) && !(a && b);


export var pythagoras = (a, b) => Math.sqrt(a*a+b*b);


export var isVisibleInViewport = (el) => {
	let bounds = el.getBoundingClientRect(),
		view   = document.documentElement;
	return bounds.right >=0 && bounds.left<=view.clientWidth &&
            bounds.bottom>=0 && bounds.top <=view.clientHeight;
};


//export var startTimer = (delay) =>


export var valToObj = (val, key="value") => {
	let obj = {};
	obj[key] = val;
	return obj;
};


export var isObject = obj => obj==Object(obj);


