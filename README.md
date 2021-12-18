# ProximityEffect.js

v3.0.0-a4

Bulk modify CSS properties on elements based on mouse pointer or other arbitrary element proximity. Very customisable, definitely overdeveloped. A fun pet project originally from the Flash days, remade in JS as a practice project. Version 3 has had an API makeover and is a little more flexible. More importantly, it can be a LOT more flexible in the future, and shouldn't see any more drastic changes to the syntax (he says naively). 

[View live demos](http://lab.adasha.com/components/proximity-effect)

## Roadmap

- (for 3.0) Fix up code. Stable API. Better documentation.
- (for 3.1) Multiple-value CSS properties.
- (for 3.2) Per-property parameters.
- (for 3.3) Multi-point animations.

## Installation

### Vanilla

Latest ES6+ version is in `src`, ES5/minified versions are in `dist`. Download your version of choice and embed in your HTML:
```html
<script src="ProximityEffect.min.js"></script>
```

### CDN

```html
<script src="https://unpkg.com/proximity-effect"></script>
```

## Use

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

You could also generate some elements programmatically.

### Set-up

Remaining set-up should be done after content has loaded. Start by defining your list of `elements` to animate, and `params` object to control the animation.

#### Elements

ProximityEffect needs a NodeList containing all the elements to include. You can use any suitable DOM method for this, e.g.:

```javascript
let elements = document.querySelectorAll("*.foo");
```

#### Params

Next, define the effect parameters in an object. All parameters are optional, but without setting at least a value for `threshold` or `runoff` you won't see anything. Nearly all parameters can also be accessed as properties after instantiation.

| Parameter | Type | Details |
| :---: | :---: | :--- |
| `attack` and `decay` | Number | Sets the rate of change when approaching (`attack`) or receding (`decay`), giving an effect of inertia. 1 is full speed,  0 is no movement (effectively disabling the animation). Default is 1. |
| `invert` | Boolean | Reverse the `keyframes` array, effectively swapping near and far distances. Default is `false`. |
| `threshold` | Number | The minimum distance (from element's mathematical centre) before effect starts, in pixels. Can be any positive number, default is 0. |
| `runoff` | Number | The distance over which styles are interpolated, in pixels. Default is 0. |
| `direction` | String | The coordinates axis/axes to use for distance calculations. Can be `"both"`, `"horizontal"` or `"vertical"`. Default is `"both"`. |
| `offsetX` and `offsetY` | Number | Global horizontal (`offsetX`) and vertical (`offsetY`) centre-point offset. Default is 0. Stacks with individual element offsets. |
| `jitter`, `jitterX` and `jitterY` | Number | Random offset per element, in pixels. `jitter` affects both X and Y values, while `jitterX` and `jitterY` affect only their respective axis. All three values stack. Default is 0. |
| `jitterMethod` | String | Random generation method for jitter values. Accepts `"uniform"` or `"gaussian"`. Default is `"uniform"`. |
| `FPS` | Number or Falsy | If set to a positive number, will attempt to refresh any effects at the specified frame rate. Effect updates cannot be displayed quicker than your screen's refresh rate, but internal calculations can take place more quickly. Specifying any value that is not a positive number, or no value at all, will clear the FPS property and attempt to refresh at the screen's refresh rate. |
| `primeDistances` | Boolean | If `true`, will initialise all distances to 0, so the effect will appear to spring into its starting position. Can only be set as part of the `params` object during instantiation - it cannot be accessed as a property. |

For example:

```javascript
let params = {
   attack:     0.8,
   decay:      0.7,
   threshold: 40,
   runoff:   100,
   jitter:    35
}
```

### Create a new ProximityEffect instance

Next, create a ProximityEffect instance, feeding in the list of elements and the effect parameters:

```javascript
let myEffect = new ProximityEffect(elements, params);
```

The `params` object is optional - individual properties on the ProximityEffect instance can also be set after-the-fact, e.g.:

```javascript
myEffect.runoff = 250;
myEffect.invert = true;
```

### Add style rules

Finally, add style rules to the ProximityEffect instance as you see fit. The `addStyle()` method is used for this:

```javascript
ProximityEffect.addStyle (property, keyframes, [params]);
```

Here's how the arguments break down:

| Argument | Type | Description |
| :---: | :---: | :--- |
| `property` | String or Object | Defines the CSS property that will be modified. This can be a string that is the name of a [pre-defined CSS property](https://github.com/Adasha/proximity-effect/wiki/API-reference#supported-effects), or can be an object defining a property of your own. [details to come] |
| `keyframes` | Array | An array defining the start and end values of this property when animated. Only the first and last values of the array are read currently; eventually more fine-grained animations will be possible. Values can be either a number specifying the value, or can be an object defining additional parameters. [details to come] |
| `params` | Object | Currently unused. |

ProximityEffect comes pre-defined with [most permitted functions](https://github.com/Adasha/proximity-effect/wiki/API-reference#supported-effects) of the `transform` and `filter` style rules. It currently only supports custom properties with single numerical values in them, so rgb() and the like can't be used yet.

For example:

```javascript
myEffect.addStyle('opacity', [100, 50]);
myEffect.addStyle('scale',   [  1,  2]);
myEffect.addStyle('blur',    [  0, 10]);
```

Here are some example of defining custom properties:

```javascript
myEffect.addStyle({rule: 'left', unit: 'em'}, [100, 50]);
myEffect.addStyle({rule: 'transform', func: 'perspective', unit: 'px'},  [100, 50]);
```

The `values` array can also contain objects with a `value` key and other optional properties, including a `scatter` value:

```javascript
myEffect.addStyle('translateX', [0, {value: 50, scatter: 15}]);
myEffect.addStyle({rule: 'padding', unit: 'px'}, [{value: 20, scatter: 30}, {value: 100, scatter: 50}]);
```

## API

Full details on the API are forthcoming, for now there is only an unfinished [page on the wiki](https://github.com/Adasha/proximity-effect/wiki/API-reference).



## License:

This software is provided under the Mozilla Public License 2.0. You can freely use the code in your own projects, using any license, without limitation, but if you modify the code base those changes must be pushed back under the same MPL2 license. Any copyright/credits must be left intact.
