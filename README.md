# ProximityEffect.js

v4.0.0-alpha1

Bulk modify CSS properties on elements based on mouse pointer or other arbitrary element proximity. Very customisable, definitely overdeveloped. A fun pet project originally from the Flash days, remade in JS for practice.

[View live demos](http://lab.adasha.com/components/proximity-effect)

## Roadmap

- (for 4.0) Fix up code. Stable API. Better documentation.
- (for 4.1) Multiple-value CSS properties.
- (for 4.2) Per-property parameters.
- (for 4.3) Multi-point animations.

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
| `tolerance` | Number | How close (0 to 1) an eased distance must get to its target before it snaps there and the animation comes to rest. Larger values settle sooner, with a bigger final step. Default is 0.0001. |
| `invert` | Boolean | Reverse the `keyframes` array, effectively swapping near and far distances. Default is `false`. |
| `threshold` | Number | The minimum distance (from element's mathematical centre) before effect starts, in pixels. Can be any positive number, default is 0. |
| `runoff` | Number | The distance over which styles are interpolated, in pixels. Default is 0. |
| `direction` | String | The coordinates axis/axes to use for distance calculations. Can be `"both"`, `"horizontal"` or `"vertical"`. Default is `"both"`. |
| `offsetX` and `offsetY` | Number | Global horizontal (`offsetX`) and vertical (`offsetY`) centre-point offset. Default is 0. Stacks with individual element offsets. |
| `jitter`, `jitterX` and `jitterY` | Number | Random offset per element, in pixels. `jitter` affects both X and Y values, while `jitterX` and `jitterY` affect only their respective axis. All three values stack. Default is 0. |
| `jitterMethod` | String | Random generation method for jitter values. Accepts `"uniform"` or `"gaussian"`. Default is `"uniform"`. |
| `FPS` | Number or Falsy | If set to a positive number, will attempt to refresh any effects at the specified frame rate. Effect updates cannot be displayed quicker than your screen's refresh rate, but internal calculations can take place more quickly. Specifying any value that is not a positive number, or no value at all, will clear the FPS property and attempt to refresh at the screen's refresh rate. |
| `reducedMotion` | String | What to do when the user prefers reduced motion: `"rest"` keeps the elements at rest, `"snap"` follows the pointer without easing, `"ignore"` animates as normal. Default is `"rest"`. See [Accessibility](#accessibility). |
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
| `keyframes` | Array | An array of two values: the property's value nearest to the target, then furthest from it. Values can be either a number specifying the value, or can be an object defining additional parameters. [details to come] More than two keyframes throws an error for now; they are planned for 4.3. |
| `params` | Object | Optional. `id` (String) labels the style. Per-style `threshold`, `runoff`, `invert`, `attack` and `decay` are planned for 4.2 and throw an error for now. |

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

## Accessibility

The effect only changes inline styles on the elements you give it. It never touches ARIA attributes, `hidden`, `tabindex`, text or the DOM structure, so assistive technology sees the page exactly as written. A few things are still up to you.

### Reduced motion

When the user's system asks for reduced motion (the [`prefers-reduced-motion`](https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion) media query), the elements stay at rest by default and don't follow the pointer, a target or coordinates. The setting is followed live, so changing it while the page is open takes effect straight away. This meets [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions).

If your effect doesn't move anything (say it only changes colour or brightness), you can let it follow without easing instead, or ignore the preference:

```javascript
new ProximityEffect(elements, { reducedMotion: "snap" });   // or "ignore"
```

`motionReduced` tells you whether motion is being reduced right now.

### Pointer, touch and pen

The pointer is followed with Pointer Events, so mouse, pen and touch all work. A touch is only followed while the finger is down, and with several touches only the first is followed. When the pointer leaves the page, a touch lifts off, or the window loses focus, the elements ease back to rest.

### Pausing

If the effect keeps moving without the user doing anything (for example, with a `target` that is itself animated), [WCAG 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide) asks for a way to pause it. `pause()` and `resume()` do that:

```html
<button type="button" id="pause" aria-pressed="false">Pause effect</button>
```

```javascript
const button = document.getElementById("pause");
button.addEventListener("click", () => {
    myEffect.paused ? myEffect.resume() : myEffect.pause();
    button.setAttribute("aria-pressed", String(myEffect.paused));
});
```

### Keyboard focus

Keyboard users don't have a pointer to bring near the elements. You can make the focused element the target instead. Checking `:focus-visible` means a mouse click doesn't take over from the pointer:

```javascript
container.addEventListener("focusin", (evt) => {
    if (evt.target.matches(":focus-visible")) {
        myEffect.target = evt.target;
    }
});
container.addEventListener("focusout", (evt) => {
    if (!container.contains(evt.relatedTarget)) {
        myEffect.clearTarget();
    }
});
```

Keep a visible focus outline as well ([WCAG 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)); growing an element is not a focus indicator on its own.

### Contrast and readability

Fading or blurring text reduces its contrast. Text must keep a contrast ratio of at least 4.5:1 (3:1 for large text) in every state it can rest in, which is usually the far keyframe ([WCAG 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)). For text on a white background, the lowest `opacity` that keeps it readable is:

| Text colour | Contrast at full opacity | Lowest opacity for 4.5:1 | Lowest opacity for 3:1 (large text) |
| :---: | :---: | :---: | :---: |
| `#000` | 21:1 | 54% | 42% |
| `#1a1a1a` | 17.4:1 | 60% | 46% |
| `#333` | 12.6:1 | 67% | 52% |
| `#555` | 7.5:1 | 80% | 63% |

Automated checkers such as axe-core account for the CSS `opacity` property but not for `filter: opacity()`, which is what the `opacity` preset uses, so check those states by hand. Keep `blur` off text that people need to read, or below about 1px, since no contrast ratio captures it. Text that looks faded or invisible is still read out by screen readers, so don't use the effect to hide content. And since scaling text down can make it hard to read, avoid shrinking text below its normal size at rest.

`tests/a11y.html` puts all of this together, and `npm run a11y` checks it (or another demo, with `--page`) in headless Chrome.

## API

Full details on the API are forthcoming, for now there is only an unfinished [page on the wiki](https://github.com/Adasha/proximity-effect/wiki/API-reference).



## License:

This software is provided under the Mozilla Public License 2.0. You can freely use the code in your own projects, using any license, without limitation, but if you modify the code base those changes must be pushed back under the same MPL2 license. Any copyright/credits must be left intact.
