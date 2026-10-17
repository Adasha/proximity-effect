# ProximityEffect.js

v4.0.0-alpha1

## Contents

- [About](#about)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Use](#use)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Browser support](#browser-support)
- [Known issues](#known-issues)
- [Development](#development)
- [Roadmap](#roadmap)
- [Version history](#version-history)
- [Licence](#licence)
- [AI usage disclosure](#ai-usage-disclosure)

## About

Bulk modify CSS properties on elements based on mouse pointer or other arbitrary element proximity. Very customisable, definitely overdeveloped. A fun pet project originally from the Flash days, remade in JS for practice.

Give it a set of elements and some styles, and each element moves between a "near" and a "far" value of each style as the pointer (or a touch, a pen, or another element) gets closer. Transforms and filters come built in, and you can animate any other CSS property that takes a single number. No dependencies, and around 7KB gzipped.

Version 4 is a big tidy-up: lots of fixes, checks on everything you pass in, an animation loop that sleeps when nothing is moving, touch and pen support, reduced motion support, TypeScript declarations, and proper documentation. It has some breaking changes from 2.x - see the [changelog](CHANGELOG.md#upgrading-from-2x).

[View live demos](http://lab.adasha.com/components/proximity-effect), or open the ones in [`demos/`](demos/).

## Installation

### npm/bundlers

Install from npm:

```sh
npm install proximity-effect
```

Then import it as an ES module:

```javascript
import ProximityEffect from "proximity-effect";
```

### Browser module

You can import the module straight from UNPKG without installing anything:

```html
<script type="module">
    import ProximityEffect from "https://unpkg.com/proximity-effect@4/dist/proximity-effect.mjs";
</script>
```

### Vanilla

Embed the classic script build from UNPKG, which adds a global `ProximityEffect` class:

```html
<script src="https://unpkg.com/proximity-effect@4"></script>
```

`https://cdn.jsdelivr.net/npm/proximity-effect@4` works too. Or download [`proximity-effect.min.js`](https://unpkg.com/proximity-effect@4/dist/proximity-effect.min.js) and host it yourself.

The build files were renamed in 4.0. If you link to `dist/ProximityEffect.min.js` on GitHub, see the [changelog](CHANGELOG.md#breaking-changes) for how to keep it working.

### TypeScript

Type declarations are included, so importing the module is typed straight away. If you use the global from the classic script instead, add a reference to its declaration:

```typescript
/// <reference types="proximity-effect/global" />
```

This needs `"moduleResolution"` set to `"nodenext"` or `"bundler"` in your `tsconfig.json`.

## Quick start

Save this as an HTML file and open it in a browser:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ProximityEffect quick start</title>
<style>
    #dots { display: flex; flex-wrap: wrap; gap: 10px; max-width: 600px; margin: 50px auto; }
    #dots div { width: 50px; height: 50px; border-radius: 50%; background: #333; }
</style>
</head>
<body>
<div id="dots"></div>

<script type="module">
    import ProximityEffect from "https://unpkg.com/proximity-effect@4/dist/proximity-effect.mjs";

    const dots = document.getElementById("dots");
    for (let i = 0; i < 60; i++) {
        dots.append(document.createElement("div"));
    }

    const effect = new ProximityEffect(dots.children, { threshold: 20, runoff: 150, decay: 0.1 });
    effect.addStyle("scale", [1.5, 1]);
    effect.addStyle("brightness", [300, 100]);
</script>
</body>
</html>
```

Move the pointer over the dots, and the nearest ones grow and light up, then fade slowly as it moves away.

## Use

```javascript
const myEffect = new ProximityEffect(elements, [params]);
myEffect.addStyle(property, keyframes, [params]);
```

This section covers the essentials. The [API reference](docs/API.md) has every property, method and event in full.

### Elements

First, choose the elements to animate. This can be a single element, a NodeList, an HTMLCollection or an array of elements, e.g.:

```javascript
const elements = document.querySelectorAll(".foo");
```

You can set up the effect at any time, even before the page has finished loading. It measures the elements once the page has loaded.

### Params

Next, define the effect parameters in an object. All parameters are optional. Every parameter except `primeDistances` can also be read and set as a property after creating the instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `threshold` | Number | The distance from an element's centre within which its styles are at their near value, in pixels. Default is 0. |
| `runoff` | Number | The distance beyond the threshold over which styles change from near to far, in pixels. 0 gives a hard edge. Default is 100. |
| `invert` | Boolean | Swaps near and far. Default is `false`. |
| `direction` | String | Which distance to measure: `"both"` (straight-line distance), `"horizontal"` or `"vertical"`. Default is `"both"`. |
| `attack` and `decay` | Number | How quickly styles change as the pointer approaches (`attack`) or moves away (`decay`), giving an effect of inertia. 1 is full speed, smaller values are slower, and 0 is no movement at all. Default is 1. |
| `tolerance` | Number | How close (0 to 1) an eased value must get to its target before it snaps there and the animation comes to rest. Larger values settle sooner, with a bigger final step. Default is 0.0001. |
| `offsetX` and `offsetY` | Number | Shift every element's centre, in pixels. A positive `offsetX` moves it left, and a positive `offsetY` moves it up. Stacks with each element's `data-offsetx` and `data-offsety` attributes. Default is 0. |
| `jitter`, `jitterX` and `jitterY` | Number | Moves each element's centre by a random amount, up to half this many pixels either way, so the effect's edge looks less regular. `jitter` affects both axes, while `jitterX` and `jitterY` affect only their own. All three stack. Default is 0. |
| `jitterMethod` | String | How the jitter is distributed: `"uniform"` or `"normal"` (`"gaussian"` also works). Default is `"uniform"`. |
| `target` | Element | An element to track instead of the pointer. Default is `null` (the pointer). |
| `FPS` | Number | A frame rate limit. `null`, `false` or 0 follows the screen's refresh rate. Default is `null`. |
| `zIndex` | Boolean | Sets each element's `z-index` from its distance, so the nearest sit on top. Default is `false`. |
| `reducedMotion` | String | What to do when the user prefers reduced motion: `"rest"` keeps the elements at rest, `"snap"` follows the pointer without easing, and `"ignore"` animates as normal. Default is `"rest"`. See [Accessibility](#accessibility). |
| `primeDistances` | Boolean | If `true`, every element starts at its far value and eases into place, so the effect appears to spring into its starting position. Only available here, not as a property. Default is `false`. |

For example:

```javascript
const params = {
    threshold: 40,
    runoff:   100,
    attack:     0.8,
    decay:      0.7,
    jitter:    35
};
```

### Create the instance

Then create the instance, giving it the elements and the parameters:

```javascript
const myEffect = new ProximityEffect(elements, params);
```

Properties can also be set afterwards:

```javascript
myEffect.runoff = 250;
myEffect.invert = true;
```

### Add styles

Finally, add the styles to animate with `addStyle()`:

```javascript
myEffect.addStyle("scale", [1.5, 1]);
myEffect.addStyle("blur",  [0,  10]);
```

| Argument | Type | Description |
| --- | --- | --- |
| `property` | String or Object | The name of a preset style (see below), or an object describing a [custom style](#custom-styles). |
| `keyframes` | Array | The style's value nearest the pointer, then furthest from it. Each is a number, or an [object with scatter](#scatter). |
| `params` | Object | (optional) `id` gives the style a name, which `hasStyle()` and `removeStyle()` accept. |

Preset styles:

| Kind | Presets |
| --- | --- |
| Transforms | `translateX`, `translateY`, `translateZ`, `rotate`, `rotateX`, `rotateY`, `rotateZ`, `scale`, `scaleX`, `scaleY`, `scaleZ`, `skewX`, `skewY` |
| Filters | `blur`, `brightness`, `contrast`, `grayscale`, `hueRotate`, `invert`, `opacity`, `saturate`, `sepia` |

Translations and blur are in pixels, rotations and skews in degrees, scales have no unit, and the other filters are percentages. The `opacity` preset is the `filter: opacity()` function, from 0 to 100. The [API reference](docs/API.md#preset-styles) lists each one's range.

#### Custom styles

To animate any other CSS property that takes one number, describe it with an object:

```javascript
myEffect.addStyle({ rule: "letterSpacing", unit: "px" }, [4, 0]);
myEffect.addStyle({ rule: "transform", func: "perspective", unit: "px" }, [100, 50]);
```

`rule` is the CSS property, `func` an optional CSS function to wrap the value in, and `unit` an optional CSS unit. These are checked, so a style can only ever write one number to one property. See the [API reference](docs/API.md#custom-styles) for the details, and for `min` and `max`.

#### Scatter

A keyframe can be an object with a `value` and a `scatter`, which gives each element a different random amount, up to half the scatter either way:

```javascript
myEffect.addStyle("translateX", [0, { value: 50, scatter: 15 }]);
myEffect.addStyle("rotateZ", [{ value: 0, scatter: 30 }, { value: 0, scatter: 90, scatterMethod: "normal" }]);
```

### Controlling the effect

| Method | Description |
| --- | --- |
| `pause()` and `resume()` | Stop and restart the animation. |
| `destroy()` | Stops the effect for good, and gives the elements back their original inline styles. |
| `setCoords(x, y)` and `clearCoords()` | Track a fixed point (relative to the viewport) instead of the pointer or target. |
| `clearTarget()` | Go back to tracking the pointer after setting `target`. |
| `hasStyle(name)` and `removeStyle(name)` | Find or remove styles by preset name, `func` or `id`. |
| `setCenterPoints()` | Measure the elements again. Only needed if they move in a way the effect can't see, such as a CSS animation. |

The effect also dispatches three events: `ready` once it has set up, `redraw` after each frame it draws, and `reflow` when it finds an element has moved:

```javascript
myEffect.addEventListener("ready", () => console.log("Ready"));
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

`demos/a11y.html` puts all of this together, and `npm run a11y` checks it and the other demos in headless Chrome.

## Performance

The animation loop only runs while something is changing, and stops while the tab is hidden, so an idle effect costs nothing. A few things help keep it smooth with lots of elements:

- Transforms and filters are much cheaper to animate than properties that change the layout, such as a custom `width`, `fontSize` or `letterSpacing`, which make the browser lay the page out again on every frame.
- For many elements, `will-change: transform` (or `filter`) in your CSS can help the browser further, and `contain: layout` can stop changes inside an element affecting the rest of the page. Neither is applied automatically, since they cost memory for every element.
- The effect measures the elements again after scrolling, resizing, or anything changing their size. `setCenterPoints()` is only needed for movement it can't see, such as a CSS animation of the elements' positions.

## Browser support

Any browser that supports ES2022: Chrome and Edge 93+, Firefox 92+, Safari 15.4+.

## Known issues

- Only CSS properties that take a single number can be animated, so colours and other multi-value properties can't be used yet (planned for 4.1). CSS custom properties (`--foo`) aren't supported either.
- `destroy()` gives the elements back the inline styles they had when the instance was created, so inline styles your own code set on them since then are lost.
- If an element containing a `position: fixed` element is given an animated `filter`, the fixed element can be measured slightly out of place, since the browser positions it relative to the filtered one.
- When a style changes the elements' size (such as a custom `width`), a size change made by something else in the very same frame isn't noticed until the next scroll, resize or `setCenterPoints()`.

## Development

You'll need Node 24 (there's an `.nvmrc`, so `nvm use` will sort you out).

```sh
npm install
npm test            # run the test suite once
npm run test:watch  # re-run tests as you edit
npm run lint        # check code style
npm run typecheck   # check the TypeScript declarations
npm run build       # build dist/proximity-effect.mjs and dist/proximity-effect.min.js
npm run a11y        # check the demos for accessibility in headless Chrome
npm run bench       # time the animation with thousands of elements in headless Chrome
```

The `demos` folder contains a page for each effect, plus an index. These import the source as a module, so need serving over HTTP rather than opening directly, e.g. with `npx serve` from the project folder.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report a bug or make a change.

## Roadmap

- (for 4.1) Multiple-value CSS properties, such as colours.
- (for 4.2) Per-property parameters.
- (for 4.3) Multi-point animations.

## Version history

- v4.0   - Fixed, hardened, made faster and accessible, and documented. Breaking changes, see the [changelog](CHANGELOG.md).
- v3.0   - Alpha versions only, never published to npm. Keyframe arrays, per-axis jitter and manual coordinates.
- v2.1   - First published on npm, in 2018.

## Licence

Released under the [Mozilla Public License 2.0](LICENSE). You can use it in any project, under any licence. If you change ProximityEffect's own files and share the result, those files must stay under the MPL 2.0 and their source must be available. Copyright and credit notices must be left intact.

## AI usage disclosure

This project has used AI since v4.0 to assist with fixes, hardening, performance, accessibility and documentation. All AI contributions are reviewed by a human.
