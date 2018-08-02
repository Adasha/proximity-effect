# ProximityEffect.js


Bulk modify CSS properties on elements based on mouse pointer or other arbitrary element proximity. Does not override existing style sheets.

<del>Fairly widely compatible but</del> effects are dependent on browser support. ***NOTE: current version requires capability to extend built-in objects - this knocks out Edge and Firefox before v59 until backwards compatibility is given more thought***

[View live demos](http://lab.adasha.com/proximity-effect)

## Installation

### npm

```
npm install --save proximity-effect
```

<<<<<<< HEAD
### CDN
```html
<script src="https://unpkg.com/proximity-effect"></script>
```

=======
>>>>>>> 3d7976683a852dcc5556d51f72745247a39f327f

### Native
Latest ES6 version is in `src`, ES5/minified versions are in `dist`. Download your version of choice and embed in your HTML:
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
let elements = document.querySelectorAll("*.foo"); // requires NodeList at present
```

Then define parameters in an object:
```javascript
let params = {
   attack:           1, // [0<=n>=1] rate of change when approaching, 1=full speed 0=no movement
   decay:            1, // [0<=n>=1] rate of change when receding, 1=full speed 0=no movement
   invert        false, // [Boolean] swap near and far distances
   threshold:        0, // [n>=0] minimum distance (from element's mathematical centre) before effect starts
   runoff:         100, // [n>=0] distance over which styles are interpolated
   direction:   'both', // 'both' | 'horizontal' | 'vertical'
   offsetX:          0, // [n>=0] global horizontal centrepoint offset
   offsetY:          0, // [n>=0] global vertical centrepoint offset
   mode:      'redraw', // 'redraw' <del>| 'mousemove' | 'enterframe'</del>
   FPS:             30, // [n>0] 'enterframe' mode only, up to refresh rate
   accuracy;         5; // [n>0] rounds internal calculations to reduce CPU load
}
```
These parameters can also be accessed as individual properties on the ProximityEffect instance.

Finally add effects as you see fit:

```javascript
let myEffect = new ProximityEffect(elements, params);

myEffect.addEffect('opacity', 1,  0.5);
myEffect.addEffect('scale',   1,  2);
myEffect.addEffect('blur',    0, 10);

myEffect.addEffect(null,    100, 50, null,        'left',        'em');
myEffect.addEffect(null,    100, 50, 'transform', 'perspective', 'px');
...
```
ProximityEffect directly supports [most permitted functions](https://github.com/Adasha/proximity-effect/wiki/API-reference#supported-effects) of the `transform` and `filter` style rules, or additional arguments can be provided to add any single-value CSS rule.

Full details on the API are forthcoming, for now there is only an unfinished [page on the wiki](https://github.com/Adasha/proximity-effect/wiki/API-reference).


## License:

This software is provided under the Mozilla Public License 2.0. You can freely use the code in your own projects, using any license, without limitation, but if you modify the code base those changes must be pushed back under the same MPL2 license. Any copyright/credits must be left intact.
