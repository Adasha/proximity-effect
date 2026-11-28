# ProximityEffect API reference

v4.1.0. For installation and a quick start, see the [README](../README.md).

## Contents

- [How it works](#how-it-works)
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Styles](#styles)
- [Node data](#node-data)
- [Events](#events)
- [HTML attributes](#html-attributes)
- [Errors](#errors)
- [TypeScript](#typescript)

## How it works

Each element you give the effect (a *node*) has a centre point. On every frame that something changes, the effect measures the distance from each node's centre to the point it's tracking, and turns it into a number from 0 to 1:

- **0** (near) when the distance is up to `threshold` pixels.
- **1** (far) when the distance is `threshold + runoff` (the `boundary`) or more.
- In between, it rises in a straight line across the `runoff`.

```text
value
1 (far)                               ______________
                                     /
                                   /
                                 /
                               /
0 (near) ____________________/
         |                   |        |
         0           threshold        boundary   distance →
                             |<runoff>|
```

`invert` swaps 0 and 1. The value is then eased towards its new position by `attack` (when getting nearer) or `decay` (when getting further away), and each style is set to a mix of its near and far keyframes in that proportion.

The tracked point is, in order of priority:

1. Coordinates set with `setCoords()`.
2. The centre of the `target` element.
3. The pointer (mouse, pen or touch).

With nothing to track (before the pointer first moves, or after it leaves the page), every node rests as though the point were infinitely far away: at its far value, or its near value with `invert`.

The animation loop only runs while something is changing. It wakes on pointer movement, scrolling, resizing and any property or method that changes the output, and stops again once every node has settled. It also stops while the tab is hidden.

## Constructor

```javascript
new ProximityEffect(nodes, [params]);
```

| Argument | Type | Description |
| --- | --- | --- |
| `nodes` | Element, NodeList, HTMLCollection or array of Elements | The elements to animate. Duplicates are ignored. |
| `params` | Object | (optional) Initial values for the properties below, all optional. `null` or a missing value means the default. |

The `params` object can contain any of the read-write [properties](#properties), plus one that's only available here:

| Parameter | Type | Description |
| --- | --- | --- |
| `primeDistances` | Boolean | If `true`, every node starts at its far value and eases into place on the first frames, so the effect appears to spring into its starting position. Default is `false`. |

The object is copied, and only its own properties are read, so changing it later has no effect on the instance.

The instance measures its nodes and starts listening for events once the document has loaded, and dispatches [`ready`](#events) when it has. If the document has already loaded, this happens straight after the constructor returns, so a listener added on the next line still hears it.

Throws an `Error` if there's no DOM (for example during server-side rendering; importing the module there is fine), and a `TypeError` or `RangeError` for a bad argument (see [Errors](#errors)).

## Properties

All read-write properties can also be set through the constructor's `params`. Setting one checks the value first, and throws without changing anything if it isn't allowed.

### Tracking

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `target` | Element or `null` | `null` | An element to track instead of the pointer. Its centre is checked every frame, so it can move freely. Set a falsy value, or call `clearTarget()`, to go back to the pointer. |
| `pointer` | `{x, y}` or `null` | | Read-only. The last pointer position, relative to the viewport, in pixels. `null` before the pointer first moves, and after it leaves the page, a touch lifts off or the window loses focus. With `pointerLeave: "hold"`, it's the held point after a touch or pen lifts, so it isn't `null` then. |
| `pointerLeave` | String | `"rest"` | What to do when a touch or pen lifts off: `"rest"` lets the nodes ease back to rest, and `"hold"` keeps the last point until the next pointer event. A held point is kept relative to the page, so it stays on the same spot as the page scrolls. A mouse leaving the page, or the window losing focus, always rests. Setting `"rest"` drops a held point. |
| `touchDrag` | Boolean or Element | `false` | Keeps a touch dragging over the effect for the effect, so the point follows the finger instead of the page scrolling (which would also cancel the pointer). It sets `touch-action: pinch-zoom`, so people can still zoom. `true` sets it on each node, so a drag that starts in a gap between nodes still scrolls. An element, such as the nodes' container, sets it on that element, so its gaps count too; keep it smaller than the screen, or the page can't be scrolled by touching it. `false` or `null` gives the original `touch-action` back, as does `destroy()`. |
| `direction` | String | `"both"` | Which distance to measure: `"both"` (straight-line distance), `"horizontal"` or `"vertical"`. |

### Distance

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `threshold` | Number | `0` | The distance from a node's centre within which its styles are at their near value, in pixels. Negative values become 0. |
| `runoff` | Number | `100` | The distance beyond the threshold over which styles change from near to far, in pixels. 0 gives a hard edge at the threshold. Negative values become 0. |
| `boundary` | Number | | Read-only. `threshold + runoff`: the distance beyond which styles are at their far value (before [`scaleEffect`](#scale)). |
| `invert` | Boolean | `false` | Swaps near and far, so styles are at their far value close to the pointer. |

### Easing

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `attack` | Number | `1` | The easing rate as the tracked point gets nearer, from 0 to 1. 1 follows straight away, smaller values ease in more slowly, and 0 doesn't move at all. Values outside 0 to 1 are clamped. |
| `decay` | Number | `1` | The same, as the tracked point moves away. A slow `decay` leaves a trail behind the pointer. |
| `tolerance` | Number | `0.0001` | How close (0 to 1) an eased value must get to its target before it snaps there, letting the animation come to rest. Larger values settle sooner, with a bigger final step. Values outside 0 to 1 are clamped. |

### Offsets and jitter

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `offsetX` and `offsetY` | Number | `0` | Shift every node's centre, in pixels. A positive `offsetX` moves the centres left, and a positive `offsetY` moves them up. Stacks with each node's [`data-offsetx` and `data-offsety`](#html-attributes). |
| `jitter` | Number | `0` | Moves each node's centre by a random amount on both axes, up to half this many pixels either way, so the effect's edge looks less regular. Negative values become 0. |
| `jitterX` and `jitterY` | Number | `0` | The same for one axis only. They add to `jitter`. |
| `jitterMethod` | String | `"uniform"` | How the jitter is distributed: `"uniform"` (any amount equally likely) or `"normal"` (mostly small amounts, clustered around the centre). `"gaussian"` is accepted as another name for `"normal"`. |

Each node picks its random amount once, when it's added. Changing `jitter`, `jitterX` or `jitterY` makes every node move further or less far in the same direction, so you can grow or shrink the jitter without the nodes jumping about. Changing `jitterMethod` picks new random amounts, since the new method has a different spread. Offsets and jitter don't need the nodes to be measured again.

### Scale

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `scaleEffect` | Number | `1` | Multiplies every pixel distance in the effect, so it can grow or shrink with its container. Negative values become 0. |

`scaleEffect` is applied when the effect is drawn, to `threshold`, `runoff`, `offsetX`, `offsetY`, jitter, and the values of styles in pixels: `translateX`, `translateY`, `translateZ`, `blur` and custom styles with a `px` unit, scatter included. Their getters, and `boundary`, still return the values you set. A style's `min` and `max` are applied before scaling, since they're in the style's units at the size it was written for. Styles in other units, `perspective` and the `data-offsetx` and `data-offsety` attributes aren't scaled. Changing it doesn't pick new random amounts or measure the nodes again.

To scale an effect with its container, set it from a `ResizeObserver`:

```javascript
new ResizeObserver(() => { myEffect.scaleEffect = container.clientWidth / 800; }).observe(container);
```

### Drawing

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `FPS` | Number or `null` | `null` | A frame rate limit. `null`, `undefined`, `false` or 0 follows the screen's refresh rate. Frames can't be drawn faster than the screen refreshes. |
| `zIndex` | Boolean | `false` | Sets each node's `z-index` from its distance, so the nearest nodes sit on top. Turning it off gives the nodes their original `z-index` back. |
| `perspectiveOrigin` | Boolean | `false` | Sets the nodes' parent's `perspective-origin` to the centre of the nodes at rest, so a `perspective` on the parent is viewed from the middle of the nodes rather than the middle of the parent. Useful when the parent is much bigger than the nodes, such as the page itself. It follows the nodes when they're measured again. The nodes must share a parent; if they don't, it logs a warning and sets nothing. Turning it off, or `destroy()`, gives the parent its original `perspective-origin` back. |
| `perspective` | Number or `null` | `null` | A perspective distance in pixels, put at the front of each node's transform as `perspective()`. A `perspective` on the parent is viewed from the parent's `perspective-origin`, so 3D transforms on nodes far from it are seen at an angle; this views every node from the centre of its own box at rest instead, wherever it sits on the page. Use it instead of a perspective on the parent, not as well, or the two stack. It does nothing without a transform style, and moves with `transform-origin` if you change that. `null`, `undefined`, `false` or 0 turns it off. |
| `reducedMotion` | String | `"rest"` | What to do when the user prefers reduced motion (the `prefers-reduced-motion` media query, which is followed as it changes): `"rest"` keeps the nodes at rest, `"snap"` follows the tracked point without easing, and `"ignore"` animates as normal. See the README's [Accessibility](../README.md#accessibility) section. |
| `motionReduced` | Boolean | | Read-only. Whether motion is being reduced right now: the user prefers reduced motion, and `reducedMotion` isn't `"ignore"`. |

### Nodes, styles and state

| Property | Type | Description |
| --- | --- | --- |
| `nodes` | Array of Elements | A copy of the nodes being animated. Set it to a new Element, NodeList, HTMLCollection or array to change them. Nodes that stay keep their random values; nodes that are dropped get their original values back for the properties the effect set, and keep their other inline styles. |
| `totalNodes` | Number | Read-only. The number of nodes. |
| `styles` | Array of [Style objects](#style-objects) | Read-only. A copy of the styles added with `addStyle()`, in the order they were added. |
| `paused` | Boolean | Read-only. `true` between `pause()` and `resume()`. |
| `resting` | Boolean | Read-only. `true` once the nodes have settled, between the `rest` and `wake` events. Pausing doesn't change it. Use it, or the events, instead of checking every node's `lastDelta` each frame. |
| `destroyed` | Boolean | Read-only. `true` once `destroy()` has been called. |

## Methods

### Style methods

#### `addStyle(property, keyframes, [params])`

Adds a style to animate. `property` is the name of a [preset style](#preset-styles) or a [custom style](#custom-styles) object, `keyframes` is an array of the near and far [keyframes](#keyframes), and `params` is an optional object of [style parameters](#style-parameters).

```javascript
myEffect.addStyle("scale", [1.5, 1]);
myEffect.addStyle({ rule: "letterSpacing", unit: "px" }, [4, 0], { id: "spacing" });
```

The same style can be added more than once. Styles with a CSS function that write to the same property (such as the `transform` and `filter` presets) are combined, in the order they were added. A style without a function writes the whole property, so don't give it a property that another style also writes. Everything is checked before anything changes, so a failed call leaves the instance as it was.

#### `hasStyle(name)`

Returns `true` if a matching style has been added. `name` can be a preset name (`"hueRotate"`), a custom style's `func` (or its `rule`, if it has no `func`), or the `id` given in its params. Throws a `TypeError` if `name` isn't a string.

#### `removeStyle(name)`

Removes every style matching `name` (as for `hasStyle()`), and returns `true` if anything was removed. Any CSS property no longer animated by another style gets the nodes' original inline value back.

#### `updateStyle(name, keyframes)`

Gives every style matching `name` (as for `hasStyle()`) new [keyframes](#keyframes), and returns `true` if anything was updated. Each style keeps its place in the stack and its params, so it's still drawn in the same order and found by the same `id`.

```javascript
myEffect.addStyle("translateY", [0, { value: 20, scatter: 10 }], { id: "drift" });
myEffect.updateStyle("drift", [0, { value: 40, scatter: 20 }]);
```

Each node keeps its random scatter, so with twice the `scatter` it moves twice as far in the same direction, and a keyframe that gains scatter uses the random amount the node already has. A keyframe whose `scatterMethod` changes picks new random amounts, since the new method has a different spread.

The keyframes are checked against each matching style's `min` and `max`, as `addStyle()` checks them, and all of them are checked before anything changes, so a failed call leaves every style as it was. To animate a different property, remove the style and add a new one.

### Tracking methods

#### `clearTarget()`

Clears `target`, going back to tracking the pointer.

#### `setCoords(x, y)`

Tracks a fixed point instead of the target or pointer, relative to the viewport, in pixels. Throws a `TypeError` for a non-number, and a `RangeError` for `NaN` or `Infinity`.

#### `getCoords()`

Returns a copy of the coordinates set with `setCoords()` as `{x, y}`, or `null` if none are set.

#### `clearCoords()`

Clears the coordinates, going back to the target or pointer.

### Lifecycle methods

#### `pause()`

Stops the animation. Nodes keep their current styles.

#### `resume()`

Restarts a paused animation. Throws an `Error` if the instance has been destroyed.

#### `destroy()`

Stops the effect for good: removes every event listener and observer, stops the animation loop, and gives each node back its original inline value for each property the effect set (the animated properties, plus `z-index` and `touch-action` if it set them). Other inline styles are left alone, including any your own code set since the instance was created. A property that both your code and the effect set, such as `transform`, goes back to the value it had when the instance was created. A node that had no `style` attribute is left with none, unless your own code has given it inline styles since. Safe to call more than once. Afterwards, anything that would touch the nodes again (`nodes`, `addStyle()`, `removeStyle()`, `updateStyle()`, `setCenterPoints()`, `resume()`) throws an `Error`.

#### `update()`

Draws one frame now. The animation loop calls this by itself, so it's only needed to draw while paused, or to draw straight away. It doesn't dispatch `redraw` or any other event, doesn't change `resting`, and does nothing once the instance is destroyed.

#### `setCenterPoints()`

Measures every node's centre now. The instance already measures again after scrolling and resizing, after the nodes or the page change size, after `nodes` changes, and when the tab becomes visible, so this is only needed when nodes move in a way it can't detect, such as a CSS animation of their position.

### Node data methods

#### `getNodeData(node, [prop])`

Returns a copy of one node's [node data](#node-data), or just the field named `prop`. Returns `undefined` for a `prop` that isn't a node data field. Throws a `RangeError` if the instance doesn't animate `node`.

#### `getNodeIndexData(index, [prop])`

The same, for the node at `index` in `nodes`. Throws a `TypeError` if `index` isn't a number, and a `RangeError` if it isn't a whole number within the node list.

#### `hasNodeIndexData(index, prop)`

Returns `true` if `prop` is a node data field with a value for the node at `index`. Throws as for `getNodeIndexData()`.

#### `valueFrom(node)` and `valueFromIndex(index)`

Return a node's eased value as of the last frame, from 0 (near) to 1 (far): the value its styles were drawn with, after `attack` and `decay`, with `invert` applied. `undefined` before the first frame, even with `primeDistances`. Nothing is copied, so they're cheap enough to call for every node in a `redraw` listener. They throw as for `getNodeData()` and `getNodeIndexData()`.

Use these to drive anything else from the effect (a Web Animations `currentTime`, a Lottie frame, a canvas, an SVG attribute) so it moves with the styles, easing and all.

#### `distanceFrom(node)` and `distanceFromIndex(index)`

Return a node's distance from the tracked point as of the last frame, from 0 (near) to 1 (far), with `invert` applied and before easing. `undefined` before the first frame. They throw as for `getNodeData()` and `getNodeIndexData()`.

Use these for where the tracked point is now, such as to tell which nodes are in range, whatever `attack` and `decay` are doing. To follow what the styles show, use `valueFrom()` instead. With `attack` and `decay` both 1 (or with reduced motion), the two are the same.

## Styles

### Preset styles

Each preset writes one function into the `transform` or `filter` property. Values outside a preset's range are clamped.

| Preset | CSS | Unit | Range | Default |
| --- | --- | --- | --- | --- |
| `translateX`, `translateY`, `translateZ` | `transform` | `px` | | 0 |
| `rotate`, `rotateX`, `rotateY`, `rotateZ` | `transform` | `deg` | | 0 |
| `scale`, `scaleX`, `scaleY`, `scaleZ` | `transform` | | | 1 |
| `skewX`, `skewY` | `transform` | `deg` | | 0 |
| `blur` | `filter` | `px` | 0 or more | 0 |
| `brightness`, `contrast`, `saturate` | `filter` | `%` | 0 or more | 100 |
| `grayscale`, `invert`, `sepia` | `filter` | `%` | 0 to 100 | 0 |
| `hueRotate` | `filter` | `deg` | | 0 |
| `opacity` | `filter` | `%` | 0 to 100 | 100 |

The `opacity` preset is the `filter: opacity()` function, from 0 to 100, not the CSS `opacity` property from 0 to 1. To animate the property itself, use a custom style: `{ rule: "opacity" }`.

Transforms and filters don't change the page's layout, so they're the cheapest properties to animate. For many nodes, `will-change: transform` (or `filter`) in your CSS can help the browser further. It isn't applied automatically, since it uses extra memory for every node.

### Custom styles

Instead of a preset name, pass an object describing the CSS to write:

| Property | Type | Description |
| --- | --- | --- |
| `rule` | String | Required. The CSS property to write to, in camelCase (`"letterSpacing"`) or kebab-case (`"letter-spacing"`), or a custom property (`"--proximity"`). Both spellings of a regular property name the same property, so styles using either are combined and restored together. Custom property names are case-sensitive, as in CSS. |
| `func` | String | (optional) A CSS function to wrap the value in, such as `"perspective"`. Styles with a `func` and the same `rule` are combined, as the presets are. |
| `unit` | String | (optional) A CSS unit to add to the value, such as `"px"`, `"em"`, `"%"` or `"deg"`. |
| `min` and `max` | Number | (optional) Keyframe and scattered values are clamped to this range. |
| `default` | Number | (optional) The style's resting value. Stored as the Style's `defaultValue`, but not used by the effect yet. |

```javascript
myEffect.addStyle({ rule: "left", unit: "em" }, [10, 5]);
myEffect.addStyle({ rule: "transform", func: "perspective", unit: "px" }, [100, 50]);
myEffect.addStyle({ rule: "--proximity" }, [1, 0]);
```

Each frame writes exactly one number, plus the unit, to one CSS property. To keep it that way, custom styles are checked when added:

- `rule` must be a CSS property name. `cssText`, `CSSStyleDeclaration` methods and other members that aren't properties are rejected. A custom property name is `--` followed by ASCII letters, digits, `-` and `_`.
- `func` must be a plain CSS function name. Functions that load resources or read values from elsewhere (`url()`, `image-set()`, `attr()`, `var()` and similar) are rejected.
- `unit` must be a known CSS unit.

Only one numeric value per property is supported, so `rgb()` and other functions taking several values can't be used yet (planned for 4.3). Animating properties that change the layout, such as `width` or `fontSize`, works, but costs much more than transforms, since the page has to be laid out again on every frame.

#### Custom properties

A style whose `rule` is a custom property writes a number (with its `unit` and `func`, if it has them) to that property on each node, and the page's CSS decides what it does. A unitless value from 0 to 1 is the most useful:

```javascript
myEffect.addStyle({ rule: "--proximity" }, [1, 0]);
```

```css
.node {
    /* colours, which a style can't animate by itself yet */
    background: color-mix(in oklch, orange calc(var(--proximity, 0) * 100%), navy);
    /* any calculation */
    scale: calc(1 + var(--proximity, 0) * 0.5);
    /* a paused animation, scrubbed by the value */
    animation: spin 1s linear paused both;
    animation-delay: calc(var(--proximity, 0) * -0.999s);
}
```

Since the effect writes only the one number, `attack` and `decay` ease everything that reads it together. The [Mix demo](../demos/mix.html) does all three.

The effect doesn't take custom properties off while it measures the nodes, since most pages use them for paint and taking them off would restyle everything that reads them. If your CSS uses one in layout (a `width` or `margin` worked out from it), the nodes are measured with it applied, so keep layout-changing uses off the animated nodes, or animate a regular property instead. `destroy()`, and dropping a node from `nodes`, give the property back the value it had when the instance was created, as for any other style.

### Keyframes

`keyframes` is an array of exactly two keyframes: the value nearest the tracked point, then the value furthest from it. Each is either a number, or an object:

| Property | Type | Description |
| --- | --- | --- |
| `value` | Number | Required. The style's value. |
| `scatter` | Number | (optional) Adds a random amount to each node's value, up to half this much either way, so the nodes don't all match. Must not be negative. |
| `scatterMethod` | String | (optional) How the scatter is distributed: `"uniform"` (the default) or `"normal"` (`"gaussian"` is accepted too), as for `jitterMethod`. |

```javascript
myEffect.addStyle("translateX", [0, { value: 50, scatter: 15 }]);
myEffect.addStyle("rotateZ", [{ value: 0, scatter: 30 }, { value: 0, scatter: 90, scatterMethod: "normal" }]);
```

Each node's random scatter is picked once, when the style is added or the node is, and is kept when the keyframes change with [`updateStyle()`](#updatestylename-keyframes). It's kept as a share of the `scatter` amount rather than as a fixed value, so a node keeps its place in the spread if the amount changes later.

More than two keyframes, or a keyframe `distance`, throws a `RangeError` for now. Keyframes in between are planned for 4.3, and rejecting them until then means adding them won't change what existing code does.

### Style parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | String | A name for the style, which `hasStyle()`, `removeStyle()` and `updateStyle()` accept. |

Per-style `threshold`, `runoff`, `invert`, `attack` and `decay` are planned for 4.2, and throw a `RangeError` for now, for the same reason. Any other parameter is ignored.

### Style objects

The `styles` property returns the styles that have been added, as read-only objects:

| Property | Description |
| --- | --- |
| `name` | The preset name, or a custom style's `func` (or `rule` if it has no `func`). |
| `rule`, `func`, `unit`, `min`, `max` | As described above. `undefined` if not set. |
| `defaultValue` | The style's `default`. |
| `near` and `far` | Copies of the keyframes, as `{value, distance, scatter, scatterMethod}`. `distance` is 0 for near and 1 for far. |
| `id` | The `id` from the style's params, if any. |
| `params` | A copy of the style's params. |

## Node data

`getNodeData()` and `getNodeIndexData()` return a snapshot of a node's data. It's a copy, so changing it has no effect. Fields without a value yet (before the node is measured, or before the first frame) are left out.

| Field | Type | Description |
| --- | --- | --- |
| `node` | Element | The node. |
| `measured` | `{x, y}` | The node's measured centre, relative to the viewport, with any `data-offsetx` and `data-offsety` applied. |
| `center` | `{x, y}` | The centre used for distances: `measured` with the global offsets and jitter applied, scaled by `scaleEffect`. |
| `jitter` | `{x, y}` | The node's random jitter, in pixels, scaled by `scaleEffect`. |
| `distance` | Number | The distance as of the last frame, from 0 to 1, before easing (as `distanceFrom()` returns). |
| `lastDelta` | Number | The eased distance as of the last frame, which the styles were drawn with. `valueFrom()` reads it without copying the node data. |
| `styles` | Array of `{near, far}` | The node's near and far values for each style, after scatter and `scaleEffect`, in the same order as `styles`. |

## Events

The instance is an `EventTarget`, so listen with `addEventListener()`:

```javascript
myEffect.addEventListener("ready", () => console.log("Ready"));
```

| Event | Dispatched when |
| --- | --- |
| `ready` | The instance has measured its nodes and started listening, once the document has loaded. Always dispatched asynchronously, so a listener added straight after the constructor hears it. |
| `beforeupdate` | The animation loop is about to draw a frame, before it works out the nodes' distances. Changes made in a listener, such as `updateStyle()` or `setCoords()`, show in that frame, so code with its own animation (wind, say) can keep in step with the effect. It comes with every `redraw`, so an idle effect dispatches neither. A listener can't keep a resting effect running by itself: to draw again, change something or call `update()`. |
| `redraw` | The animation loop has drawn a frame. Since the loop stops when nothing is changing, an idle effect dispatches nothing. Calling `update()` yourself doesn't dispatch it. |
| `reflow` | Measuring the nodes again found that at least one had moved (after a resize, a container scroll, a change of nodes, and so on). Dispatched before that frame is drawn. |
| `rest` | The nodes have settled: the loop drew a frame that changed nothing, and nothing is waiting to be drawn. Dispatched after that frame's `redraw`. A followed `target` is still checked every frame, but the effect rests while the target stays still. |
| `wake` | The loop is drawing again after `rest`, because something changed (the pointer, a setter, a resize). Dispatched before that frame's `beforeupdate`. If the change turns out to move nothing, `rest` follows in the same frame. `pause()` and `resume()` dispatch neither `wake` nor `rest`: see `paused`. |

Events are plain `Event` objects. They don't bubble (an instance has no parent), can't be cancelled and carry no details. Read what you need from the instance itself, as in this `redraw` listener:

```javascript
myEffect.addEventListener("redraw", () => {
    myEffect.nodes.forEach((node, i) => {
        node.dataset.near = myEffect.valueFromIndex(i) < 0.5;
    });
});
```

## HTML attributes

| Attribute | Description |
| --- | --- |
| `data-offsetx` and `data-offsety` | Shift one node's centre, in pixels. As with `offsetX` and `offsetY`, a positive value moves it left or up. Read when the node is measured. Values that aren't finite numbers count as 0. |

## Errors

Every argument and value is checked before anything changes, so a call that throws leaves the instance as it was.

| Error | Thrown when |
| --- | --- |
| `TypeError` | A value is the wrong type: `nodes` isn't an Element or list of Elements, `params` isn't an object, a number or boolean property is set to something else, `target` isn't an Element, or a style or keyframe is malformed. |
| `RangeError` | A value isn't allowed: `NaN` or `Infinity`, an empty node list, an unknown name for `direction`, `jitterMethod`, `reducedMotion`, `pointerLeave` or a preset, an unsafe custom style, a negative `FPS` or `perspective`, a node or index the instance doesn't have, or a feature that isn't supported yet (more than two keyframes, per-style parameters). |
| `Error` | Constructing without a DOM, or, after `destroy()`, calling `resume()`, `addStyle()`, `removeStyle()`, `updateStyle()` or `setCenterPoints()`, or setting `nodes`. |

Numbers in range are clamped rather than rejected: a negative `threshold` becomes 0, and an `attack` above 1 becomes 1.

## TypeScript

The package includes type declarations. Along with the default export, `proximity-effect` exports these types:

| Type | Description |
| --- | --- |
| `ProximityEffectParams` | The constructor's `params`. |
| `ProximityEffectNodes` | What `nodes` accepts. |
| `PresetStyle` | The preset style names. |
| `CustomStyle` | A custom style object. |
| `Keyframe` and `Keyframes` | A keyframe, and the pair `addStyle()` takes. |
| `StyleParams` | The style parameters. |
| `Style` and `StyleKeyframe` | The objects in `styles`, and their keyframes. |
| `NodeData` and `NodeStyleValues` | Node data, and its `styles` entries. |
| `ProximityEffectEventMap` | The events, so `addEventListener()` is typed. |
| `Point`, `Direction`, `RandomMethod`, `ReducedMotion` | Smaller types used by the others. |

```typescript
import ProximityEffect, { type ProximityEffectParams } from "proximity-effect";
```

If you load the classic script and use the global `ProximityEffect` instead of importing it, add a reference to its declaration:

```typescript
/// <reference types="proximity-effect/global" />
```

This needs `"moduleResolution"` set to `"nodenext"` or `"bundler"` in your `tsconfig.json`.
