/*
 * PRESET STYLES
 *
 * The single table of named styles accepted by addStyle(). A style with a
 * `func` is combined with the others sharing its `rule` (e.g. several
 * transform functions); one without writes straight to the CSS property.
 */

const defined = {
	translateX: { rule: "transform", func: "translateX", unit: "px",  default:   0 },
	translateY: { rule: "transform", func: "translateY", unit: "px",  default:   0 },
	translateZ: { rule: "transform", func: "translateZ", unit: "px",  default:   0 },
	rotate:     { rule: "transform", func: "rotate",     unit: "deg", default:   0 },
	rotateX:    { rule: "transform", func: "rotateX",    unit: "deg", default:   0 },
	rotateY:    { rule: "transform", func: "rotateY",    unit: "deg", default:   0 },
	rotateZ:    { rule: "transform", func: "rotateZ",    unit: "deg", default:   0 },
	scale:      { rule: "transform", func: "scale",                   default:   1 },
	scaleX:     { rule: "transform", func: "scaleX",                  default:   1 },
	scaleY:     { rule: "transform", func: "scaleY",                  default:   1 },
	scaleZ:     { rule: "transform", func: "scaleZ",                  default:   1 },
	skewX:      { rule: "transform", func: "skewX",      unit: "deg", default:   0 },
	skewY:      { rule: "transform", func: "skewY",      unit: "deg", default:   0 },

	blur:       { rule: "filter", func: "blur",       unit: "px", min: 0,           default:   0 },
	brightness: { rule: "filter", func: "brightness", unit: "%",  min: 0,           default: 100 },
	contrast:   { rule: "filter", func: "contrast",   unit: "%",  min: 0,           default: 100 },
	grayscale:  { rule: "filter", func: "grayscale",  unit: "%",  min: 0, max: 100, default:   0 },
	hueRotate:  { rule: "filter", func: "hue-rotate", unit: "deg",                  default:   0 },
	invert:     { rule: "filter", func: "invert",     unit: "%",  min: 0, max: 100, default:   0 },
	opacity:    { rule: "filter", func: "opacity",    unit: "%",  min: 0, max: 100, default: 100 },
	saturate:   { rule: "filter", func: "saturate",   unit: "%",  min: 0, max: 100, default: 100 },
	sepia:      { rule: "filter", func: "sepia",      unit: "%",  min: 0, max: 100, default:   0 },
};

for (const def of Object.values(defined))
{
	Object.freeze(def);
}

export const DEFINED_STYLES = Object.freeze(defined);
