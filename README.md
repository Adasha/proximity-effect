# ProximityEffect.js

v3.0.0-alpha1

Bulk modify CSS properties on elements based on mouse pointer or other arbitrary element proximity. Does not override existing style sheets.

[View live demos](http://lab.adasha.com/proximity-effect)


Version 3 has had an API makeover and is a little more flexible. Property value changes are now described as an array, replacing near and far. It's still near and far under the hood, but eventually this will allow for effects with complex animation tweening.

For custom effects, data provided to the old `params` argument should now be placed first inlieu of a preset name. The old `params` argument still exists but is unused at present.

Roadmap before full release:
- More API stuff
- Stackable ProximityEffects
- Multiple-value CSS properties
- Improved documentation

**NOTE: current version requires capability to extend EventTarget - this knocks out Edge and Firefox before v59 until backwards compatibility is given more thought. To work around import a ponyfill such as `event-target` or `event-target-shim`. This lets you be disappointed with how slow Edge is.**

## Installation

### npm

```
npm install --save proximity-effect
```

### CDN
```html
<script src="https://unpkg.com/proximity-effect"></script>
```

### Vanilla
Latest ES6+ version is in `src`, ES5/minified versions are in `dist`. Download your version of choice and embed in your HTML:
```html
<script src="ProximityEffect.min.js"></script>
```

## To use


### Add some content to affect
In your `<body>` content add some elements you want to affect:
```html
<div>
   <div class="foo">...</div>
   <div class="foo">...</div>
   <div class="foo">...</div>
   ...
</div>
```

### Set-up
Remaining set-up should be done after content has loaded. Store a reference to the chosen target:
```javascript
let elements = document.querySelectorAll("*.foo"); // requires NodeList
```

Then define parameters in an object:
```javascript
let params = {
   attack:               1, // [0<=n>=1] rate of change when approaching, 1=full speed 0=no movement
   decay:                1, // [0<=n>=1] rate of change when receding, 1=full speed 0=no movement
   invert:           false, // [Boolean] swap near and far distances
   threshold:            0, // [n>=0] minimum distance (from element's mathematical centre) before effect starts
   runoff:             100, // [n>=0] distance over which styles are interpolated
   direction:       'both', // 'both' | 'horizontal' | 'vertical'
   offsetX:              0, // [n>=0] global horizontal centrepoint offset
   offsetY:              0, // [n>=0] global vertical centrepoint offset
   jitter:               0, // random offset per element
   jitterX:              0, // random X offset per element, stacks with jitter
   jitterY:              0, // random Y offset per element, stacks with jitter
   jitterMethod: 'uniform', // random generation method for jitter values
   mode:          'redraw', // 'redraw' <del>| 'mousemove' | 'enterframe'</del>
   FPS:                 30, // [n>0] 'enterframe' mode only, up to refresh rate
   accuracy:             5  // [n>0] rounds internal calculations to reduce CPU load
}
```

Then create instance:
```javascript
let myEffect = new ProximityEffect(elements, params);
```

Parameters can also be accessed as individual properties on the ProximityEffect instance:
```javascript
myEffect.invert = true;
```

Finally add effects as you see fit. You can either specify a predefined CSS property:

```javascript
myEffect.addEffect('opacity', 1,  0.5);
myEffect.addEffect('scale',   1,  2);
myEffect.addEffect('blur',    0, 10);
```

Or you can define your own - any single-numerical-value property can be defined, with multiple-value property support coming:

```javascript
myEffect.addEffect({rule: 'left', unit: 'em'}, 100, 50);
myEffect.addEffect({rule: 'transform', func: 'perspective', unit: 'px'},  100, 50);
...
```

ProximityEffect comes predefined with [most permitted functions](https://github.com/Adasha/proximity-effect/wiki/API-reference#supported-effects) of the `transform` and `filter` style rules, or additional arguments can be provided to add any single-number CSS rule.

`near` and `far` can also be fed an object with a `value` key and other optional properties, including a `scatter` value:

```javascript
myEffect.addEffect('translateX', 0, {value: 50, scatter: 15});
myEffect.addEffect({rule: 'padding', unit: 'px'}, {value: 20, scatter: 30}, {value: 100, scatter: 50});
```

## API
Full details on the API are forthcoming, for now there is only an unfinished [page on the wiki](https://github.com/Adasha/proximity-effect/wiki/API-reference).

This is a hobby project and the API has evolved, much less been planned out. v3 is the target for everything to be locked down, after which semver all the way.


## License:

This software is provided under the Mozilla Public License 2.0. You can freely use the code in your own projects, using any license, without limitation, but if you modify the code base those changes must be pushed back under the same MPL2 license. Any copyright/credits must be left intact.
