# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security

- Previous versions (including the published 2.1.x) wrote a custom style's `rule` and `unit` into inline styles unchecked. A style object such as `{ rule: "cssText", unit: "; background: url(https://example.com/)" }` could therefore set any inline CSS on the animated elements, including declarations that make network requests. Script execution was not possible. This only mattered if a page built style objects from untrusted input. Custom styles are now validated: `rule` must be a CSS property name, `func` a plain CSS function name (not `url()` or another function that loads resources), and `unit` a known CSS unit. See `SECURITY.md`.
- Configuration is read from own properties only, so a polluted `Object.prototype` can no longer supply style rules, units or keyframe scatter.

### Breaking changes

- The package is now an ES module, built with esbuild for ES2022. The ES5 build and the `@babel/polyfill` and `event-target` dependencies have been removed.
- Build files are renamed: `dist/proximity-effect.mjs` (ES module) and `dist/proximity-effect.min.js` (classic script, adds a global `ProximityEffect`). The bare `https://unpkg.com/proximity-effect` URL still points at the classic script.

- The multi-argument preset styles `color`, `backgroundColor` and `scale3D` are removed. They were defined but never worked, and the README listed them as unsupported. Multi-value properties are planned for 4.1.
- `random()` and the jitter and scatter methods are now `"uniform"` (default) or `"normal"`; `"gaussian"` is accepted as an alias. Any other method name throws a `RangeError` instead of silently falling back to uniform.
- `constrain()` throws a `TypeError` for non-numbers instead of returning `NaN`.
- `addStyle()` throws `RangeError` for an unknown preset and `TypeError` for a malformed style object or for fewer than two keyframes.
- Before the pointer first moves (and with no target or coordinates), nodes rest at their far value. Previously the instance dispatched a synthetic `mousemove` to the whole document, which acted as if the pointer were at the top-left corner. `pointer` is `null` until the pointer moves.
- `direction`, `jitterMethod`, `target`, `setCoords()` and `nodes` throw `TypeError` or `RangeError` for invalid values instead of logging or silently misbehaving.
- `ready` fires asynchronously (in a microtask) even when the page has already loaded, so listeners added straight after construction receive it.
- `FPS` throttles the animation frame loop instead of running a separate interval timer.
- `styles` returns a copy of the styles array.
- The effect no longer sets `z-index` on the nodes by default. Set `zIndex: true` to keep the old behaviour, where the nearest nodes sit on top.
- Every numeric setter and parameter (`threshold`, `runoff`, `attack`, `decay`, `tolerance`, `offsetX`, `offsetY`, `jitter`, `jitterX`, `jitterY`) throws a `TypeError` for a non-number and a `RangeError` for `NaN` or `Infinity`, leaving the old value in place. Out-of-range numbers are still clamped (for example, a negative `threshold` becomes 0).
- `accuracy` is removed. Eased distances are no longer rounded, which made low values step visibly (at `accuracy: 0` the effect was simply on or off). Easing now snaps to its target once within the new `tolerance` (0 to 1, default 0.0001), so the animation still comes to rest. A posterised effect may return later as an explicit option.
- `invert`, `zIndex` and `primeDistances` must be booleans; anything else throws a `TypeError`.
- `FPS` accepts a positive number, or `null`, `undefined`, `false` or 0 to follow the screen refresh. A negative, `NaN` or infinite value throws a `RangeError`, and a non-number throws a `TypeError`, instead of quietly turning the limit off.
- `setCoords()` throws a `RangeError` (was `TypeError`) for `NaN` or infinite coordinates.
- `addStyle()` rejects `NaN` and infinite keyframe values, negative `scatter`, an unknown `scatterMethod`, a keyframe `distance` outside 0 to 1, `min` greater than `max`, and per-style params of the wrong type. Unknown per-style params are dropped.
- `getNodeIndexData()`, `hasNodeIndexData()` and `distanceFromIndex()` throw a `RangeError` for an index outside the node list. `getNodeData()` and `getNodeIndexData()` return `undefined` for inherited property names such as `constructor`.
- The undocumented public `preventCenterCalculations` property is removed.
- The animation loop stops when nothing is moving, so `redraw` is only dispatched for frames that are drawn. It wakes on pointer movement, scrolling, resizing and any setting or method that changes the output. With a `target` element set, it runs every frame, since the target can move without an event.
- Styles are only written to a node when its eased distance changes (or the style stack or `zIndex` changes). Inline styles another script sets on a node in the meantime are no longer overwritten every frame.
- `reflow` is dispatched only when a remeasure finds that a node has moved, rather than on every scroll and resize event. A page scroll no longer triggers a remeasure (see Performance below).
- `data-offsetx` and `data-offsety` are read when nodes are measured, not every frame.
- `setCenterPoints()` measures straight away and is rarely needed: the instance remeasures after resizes (including a `ResizeObserver` on the nodes and the page), container scrolls, changes to `nodes`, and when the tab becomes visible. Setting `offsetX`, `offsetY` or the jitter values no longer remeasures.

### Fixed

- `addStyle()` was unusable: `Style` never exposed its `near`/`far` values or rules. It now does.
- `Style` no longer mutates the caller's keyframes array or objects, and clamps object keyframe values to the preset's range (previously only plain numbers were clamped).
- `xor()` returns a real boolean.
- Instances created after the page had loaded never initialised (`readyState` was compared with `"completed"`).
- `distanceFrom()` and `getNodeData()` always threw (an undefined variable). They now throw a `RangeError` only for a node the instance doesn't control.
- `removeStyleProp()` removed nothing (it checked a property that doesn't exist), skipped entries when it did, and left per-node values misaligned. It now removes every match, keeps the rest aligned, restores CSS properties that nothing animates any more, and returns whether anything was removed. `hasStyleProp()` and `removeStyleProp()` accept preset names such as `hueRotate`.
- `setCoords()` stored any value because its type check could never pass. Manual coordinates no longer stop the animation loop.
- A `runoff` of 0 produced `NaN`; it now gives a hard edge at the threshold.
- Easing with a low `accuracy` could stall one rounding step short of its target (for example 0.1px from the near value) and never arrive. Easing is no longer rounded (see `tolerance`), so it always finishes on the target.
- The first frame eased from `null` unless `primeDistances` was set; it now starts at the current distance.
- The constructor stored the caller's `params` object and setters changed it; it is now copied, and only its own properties are read.
- Jitter was lost for nodes set after construction, and `jitterMethod` from the params was never validated.
- Setting `nodes` after `addStyle()` crashed the update loop. Nodes dropped from the list get their original inline style back.
- `update()` crashed if no styles had been added, read layout for every node and discarded it, and read the target's position once per node rather than once per frame.
- `data-offsetx` and `data-offsety` are read as numbers; values that aren't finite numbers count as 0.
- A failed `addStyle()` call leaves the style stack and per-node values unchanged.
- `Style.near` and `Style.far` return copies, so changing them can't alter the running effect.
- With `FPS` set, the loop could be driven by both a timer and animation frames.
- Scattered style values are clamped to the style's range.
- The preset style table existed twice; it is now a single frozen module.
- Removed the unused helpers `map`, `valToObj` and `isVisibleInViewport`, and `Style extends Object`.

### Performance

Measured with `npm run bench` (headless Chrome, 1,000 and 5,000 nodes, four styles):

- Measuring node positions took 0.83 s for 1,000 nodes and 25 s for 5,000, because each node was measured in turn with its inline style swapped out, forcing a fresh layout for every node. Nodes are now measured in one batch, and only properties that can move a box (such as `transform`, but not `filter` or `opacity`) are taken off. It now takes about 17 ms and 67 ms.
- Page scrolls no longer remeasure: nodes that scroll with the page are moved by the scroll distance, and only fixed and sticky nodes are remeasured. Scrolling stays at the screen refresh rate with 5,000 nodes (it previously froze the page). Scrolling inside a container only remeasures if the container holds one of the nodes. Scroll and resize events are batched to at most one measurement per frame, replacing the `setTimeout` workaround.
- A frame's work fell from 4.5 ms to 1.8 ms (1,000 nodes) and from 15.6 ms to 2.3 ms (5,000 nodes): values are computed with no per-node layout or attribute reads, functions sharing a property are grouped once rather than every frame, and nodes whose value hasn't changed are skipped.
- An idle instance draws no frames (previously about 60 a second), and the loop stops while the tab is hidden.
- Styles that change a node's size (a custom `width`, `fontSize` and so on) no longer cause a remeasure every frame. Size changes the effect makes itself are ignored, since they can't move the measured centres, and other size changes reported by the `ResizeObserver` wait until the nodes stop moving. Animating `width` on 5,000 nodes went from 10 to 20 frames a second, and from 181 `reflow` events in three seconds of pointer movement to none.

### Added

- Automated test suite, linting and continuous integration.
- `destroy()`: removes every listener, stops the animation loop and restores each node's original inline style. `destroyed` reports whether it has been called.
- `pause()`, `resume()` and `paused`.
- `nodes` accepts a `NodeList`, an `HTMLCollection`, an array of Elements or a single Element.
- `zIndex` parameter and property, to opt in to distance-based stacking. Turning it off restores the nodes' original `z-index`.
- Custom style `rule` can be written in kebab-case (`"letter-spacing"`) as well as camelCase.
- `SECURITY.md`, and an updated CodeQL workflow that also scans the `4.0` branch and pull requests.
- The module can be imported without a DOM (for example during server-side rendering); constructing an instance there throws a clear error.
