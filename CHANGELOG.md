# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

A big tidy-up: fixed, hardened, made faster and accessible, and documented. The 3.0 alphas were never published to npm, so their changes are included here, as changes since the last published version, 2.1.19. See [Upgrading from 2.x](#upgrading-from-2x) for a checklist.

### Security

- Previous versions (including the published 2.1.x) wrote a custom style's `rule` and `unit` into inline styles unchecked. A style object such as `{ rule: "cssText", unit: "; background: url(https://example.com/)" }` could therefore set any inline CSS on the animated elements, including declarations that make network requests. Script execution was not possible. This only mattered if a page built style objects from untrusted input. Custom styles are now validated: `rule` must be a CSS property name, `func` a plain CSS function name (not `url()` or another function that loads resources), and `unit` a known CSS unit. See `SECURITY.md`.
- Configuration is read from own properties only, so a polluted `Object.prototype` can no longer supply style rules, units or keyframe scatter.

### Breaking changes

- `addEffect(name, near, far, [params])` is replaced by `addStyle(property, keyframes, [params])`, which takes the near and far values as an array. A custom style is now described by an object passed in place of the name, rather than by a made-up name plus a params object, and the third argument holds per-style parameters such as `id`.
- `hasEffect()`, `removeEffect()` and `effects` are renamed `hasStyle()`, `removeStyle()` and `styles`, and the `effects` field of the node data is renamed `styles`.
- The `opacity` preset is now the `filter: opacity()` function, from 0 to 100 (it was the CSS `opacity` property, from 0 to 1). Use the custom style `{ rule: "opacity" }` for the property.
- The `doPresetDistances` parameter is renamed `primeDistances`.
- The `mode` property is removed. The effect always runs on animation frames, as the default `"redraw"` mode did; the `"mousemove"` and `"enterframe"` modes had already stopped working.
- The package is now an ES module, built with esbuild for ES2022. The ES5 build and the `@babel/polyfill` and `event-target` dependencies have been removed.
- Build files are renamed: `dist/proximity-effect.mjs` (ES module) and `dist/proximity-effect.min.js` (classic script, adds a global `ProximityEffect`). The bare `https://unpkg.com/proximity-effect` URL still points at the classic script.
- `dist/ProximityEffect.js` and `dist/ProximityEffect.min.js` no longer exist, and `dist/` is no longer committed to the repository (it is built when the package is packed). Pages that hot-link the old files from GitHub (raw or jsDelivr `gh` URLs on `master`) will break when 4.0 reaches `master`; pin a tag instead, such as `https://cdn.jsdelivr.net/gh/Adasha/proximity-effect@2.1.14/dist/ProximityEffect.min.js`. npm CDN URLs that name a 2.x version keep working. The bare `https://unpkg.com/proximity-effect` and `https://cdn.jsdelivr.net/npm/proximity-effect` URLs work again: the published 2.1.19 package contained no `dist` folder, so they returned 404.
- The multi-argument preset styles `color`, `backgroundColor` and `scale3D` are removed. They were defined but never worked, and the README listed them as unsupported. Multi-value properties are planned for 4.1.
- `random()` and the jitter and scatter methods are now `"uniform"` (default) or `"normal"`; `"gaussian"` is accepted as an alias. Any other method name throws a `RangeError` instead of silently falling back to uniform.
- `constrain()` throws a `TypeError` for non-numbers instead of returning `NaN`.
- `addStyle()` throws `RangeError` for an unknown preset and `TypeError` for a malformed style object or for fewer than two keyframes. `hasStyle()` and `removeStyle()` throw `TypeError` for a name that isn't a string.
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
- `addStyle()` rejects `NaN` and infinite keyframe values, negative `scatter`, an unknown `scatterMethod`, a keyframe `distance` outside 0 to 1, `min` greater than `max`, and an `id` that isn't a string. Unknown per-style params are dropped.
- Per-style `threshold`, `runoff`, `invert`, `attack` and `decay` throw a `RangeError`. They were documented as overriding the global values but were never used; support is planned for 4.2.
- `getNodeIndexData()`, `hasNodeIndexData()` and `distanceFromIndex()` throw a `RangeError` for an index outside the node list. `getNodeData()` and `getNodeIndexData()` return `undefined` for inherited property names such as `constructor`.
- The undocumented public `preventCenterCalculations` property is removed.
- The animation loop stops when nothing is moving, so `redraw` is only dispatched for frames that are drawn. It wakes on pointer movement, scrolling, resizing and any setting or method that changes the output. With a `target` element set, it checks the target's position every frame, since the target can move without an event, but only draws when it has moved. Coordinates set with `setCoords()` take over from the target, so it isn't checked at all.
- Styles are only written to a node when its eased distance changes (or the style stack or `zIndex` changes). Inline styles another script sets on a node in the meantime are no longer overwritten every frame.
- `reflow` is dispatched only when a remeasure finds that a node has moved, rather than on every scroll and resize event. A page scroll no longer triggers a remeasure (see Performance below).
- `data-offsetx` and `data-offsety` are read when nodes are measured, not every frame.
- `setCenterPoints()` measures straight away and is rarely needed: the instance remeasures after resizes (including a `ResizeObserver` on the nodes and the page), container scrolls, changes to `nodes`, and when the tab becomes visible. Setting `offsetX`, `offsetY` or the jitter values no longer remeasures.
- The pointer is followed with Pointer Events (`pointermove` and `pointerdown`) instead of `mousemove`, so touch and pen work as well as the mouse. With several touches, only the primary one is followed. Code that dispatched synthetic `mousemove` events to drive the effect must dispatch `pointermove` instead (with `isPrimary: true`).
- When the pointer leaves the page (or a touch or pen lifts off), or the window loses focus, `pointer` becomes `null` and the nodes ease back to rest. Previously they stayed as they were when the mouse left.
- When the user prefers reduced motion, the nodes stay at rest by default and don't follow the pointer, a target or coordinates. Set `reducedMotion: "ignore"` for the old behaviour (see Added).
- The unfinished `addProperty()`, `hasProperty()` and `removeProperty()` methods are removed. They stored their arguments and did nothing else.
- `updatePointer()` and `reflowEvent()` are no longer public. They were internal event handlers. To drive the effect from your own coordinates, use `setCoords()`; to remeasure, use `setCenterPoints()`.
- `getNodeData()` and `getNodeIndexData()` return a copy of the node's data, so changing it no longer changes the running effect. The copy has only the documented fields (`node`, `measured`, `center`, `jitter`, `distance`, `lastDelta` and `styles`); fields without a value yet are left out. The original inline style and other internal fields are no longer exposed, and `hasNodeIndexData()` is false for them.
- `nodes` returns a copy of the node list, as `styles` already did.
- `addStyle()` throws a `RangeError` for more than two keyframes, or for a keyframe `distance`. Only the first and last keyframes were ever used; keyframes in between are planned for 4.3, and rejecting them until then means that adding them won't change what existing calls do.

### Fixed

- The classic script only adds the global `ProximityEffect`. 2.1.19 also added a global `Utils` class, which could clash with a page's own.
- `addStyle()` was unusable: `Style` never exposed its `near`/`far` values or rules. It now does.
- `Style` no longer mutates the caller's keyframes array or objects, and clamps object keyframe values to the preset's range (previously only plain numbers were clamped).
- The `saturate` preset was clamped to 100%, but CSS `saturate()` accepts larger values to over-saturate. It now accepts any value of 0 or more, like `brightness` and `contrast`.
- `xor()` returns a real boolean.
- Instances created after the page had loaded never initialised (`readyState` was compared with `"completed"`).
- `distanceFrom()` and `getNodeData()` always threw (an undefined variable). They now throw a `RangeError` only for a node the instance doesn't control.
- `removeStyle()` removed nothing (it checked a property that doesn't exist), skipped entries when it did, and left per-node values misaligned. It now removes every match, keeps the rest aligned, restores CSS properties that nothing animates any more, and returns whether anything was removed. `hasStyle()` and `removeStyle()` accept preset names such as `hueRotate`.
- Scrolling a container inside a shadow root, or a page container holding a web component whose shadow root holds nodes, didn't remeasure the nodes. Scroll events are now also heard inside each shadow root that holds a node, and containment is checked across shadow boundaries.
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
- Page scrolls no longer remeasure: nodes that scroll with the page are moved by the scroll distance, and only fixed and sticky nodes are remeasured, along with any animated nodes they sit inside (whose transforms move them). When layout properties such as `width` are animated, which can move any node, every node is remeasured. Scrolling stays at the screen refresh rate with 5,000 nodes (it previously froze the page). Scrolling inside a container only remeasures if the container holds one of the nodes. Scroll and resize events are batched to at most one measurement per frame, replacing the `setTimeout` workaround.
- A frame's work fell from 4.5 ms to 1.8 ms (1,000 nodes) and from 15.6 ms to 2.3 ms (5,000 nodes): values are computed with no per-node layout or attribute reads, functions sharing a property are grouped once rather than every frame, and nodes whose value hasn't changed are skipped.
- An idle instance draws no frames (previously about 60 a second), and the loop stops while the tab is hidden.
- Nodes are measured once at start-up and once when added, rather than again when the `ResizeObserver` reports their starting sizes.
- Styles that change a node's size (a custom `width`, `fontSize` and so on) no longer cause a remeasure every frame. Size changes the effect makes itself are ignored, since they can't move the measured centres, and other size changes reported by the `ResizeObserver` wait until the nodes stop moving. Animating `width` on 5,000 nodes went from 10 to 20 frames a second, and from 181 `reflow` events in three seconds of pointer movement to none.

### Added

- `jitterX` and `jitterY`, for jitter on one axis, and `jitterMethod`.
- `setCoords()`, `getCoords()` and `clearCoords()`, to track a fixed point instead of the pointer or a target.
- `FPS` works: it limits the frame rate. (In 2.1.19 it only applied to the broken `"enterframe"` mode.)
- A complete API reference in [`docs/API.md`](docs/API.md), replacing the unfinished wiki page, and a rewritten README.
- Automated test suite, linting and continuous integration.
- `demos/a11y.html`, an accessible demo with a pause control, keyboard focus as the target and a reduced-motion setting, and `npm run a11y`, which checks every demo in headless Chrome with axe-core plus checks axe can't make (text contrast under `filter: opacity()`, reduced motion, focus following).
- The demos are rewritten and moved to `demos/`, with an index page. Each has a pause button, a real title and description, and respects reduced motion. Demos that depended on files outside the repository, or duplicated another, are removed.
- `destroy()`: removes every listener, stops the animation loop and restores each node's original inline style (removing the `style` attribute from nodes that had none). `destroyed` reports whether it has been called.
- `pause()`, `resume()` and `paused`.
- `nodes` accepts a `NodeList`, an `HTMLCollection`, an array of Elements or a single Element.
- `zIndex` parameter and property, to opt in to distance-based stacking. Turning it off restores the nodes' original `z-index`.
- Custom style `rule` can be written in kebab-case (`"letter-spacing"`) as well as camelCase.
- `SECURITY.md`, and an updated CodeQL workflow that also scans the `4.0` branch and pull requests.
- The module can be imported without a DOM (for example during server-side rendering); constructing an instance there throws a clear error.
- `reducedMotion` parameter and property: what to do when the user prefers reduced motion (the `prefers-reduced-motion` media query, followed live). `"rest"` (default) keeps the nodes at rest; `"snap"` follows without easing; `"ignore"` carries on as normal. The read-only `motionReduced` reports whether motion is being reduced right now.
- Touch and pen support (see Breaking changes).
- TypeScript declarations (`dist/proximity-effect.d.ts`, referenced from `package.json`), including typed event listeners for `ready`, `redraw` and `reflow`.
- A TypeScript declaration for the classic script's global `ProximityEffect`: add `/// <reference types="proximity-effect/global" />` to code that uses the global instead of importing the module.
- `hasStyle()` and `removeStyle()` also find a style by the `id` given in its params, and `Style` has an `id` getter.
- Documentation for `totalNodes`, `update()` and the events. Events are plain `Event` objects that don't bubble, can't be cancelled and carry no detail.

## Upgrading from 2.x

1. Update script URLs or import paths to the new build file names (see [Installation](README.md#installation)). If you load `https://unpkg.com/proximity-effect` without a version, pin it to `proximity-effect@4`. Remove any `event-target` polyfill.
2. Replace each `addEffect(name, near, far)` with `addStyle(name, [near, far])`. For a custom effect, pass its definition as the first argument instead of a name, and give the name as an `id` if you need it: `addEffect("positionleft", 100, 50, { rule: "left", unit: "em" })` becomes `addStyle({ rule: "left", unit: "em" }, [100, 50], { id: "positionleft" })`.
3. Rename `hasEffect()`, `removeEffect()` and `effects` to `hasStyle()`, `removeStyle()` and `styles`, and read node data's `styles` field instead of `effects`.
4. Multiply `opacity` preset values by 100 (`[1, 0.5]` becomes `[100, 50]`), or use `{ rule: "opacity" }` to keep animating the CSS property.
5. Rename `doPresetDistances` to `primeDistances`, and remove `mode` and `accuracy`.
6. If you relied on the nearest elements sitting on top, add `zIndex: true`.
7. Check your parameters are the right type, since bad values now throw instead of being ignored. For example, `invert: 1` must be `invert: true`, and an unknown `direction` is an error.
8. If you drove the effect by dispatching `mousemove` events, call `setCoords()` instead, or dispatch `pointermove` events with `isPrimary: true`. If you called `updatePointer()` or `reflowEvent()`, use `setCoords()` or `setCenterPoints()`.
9. Remove any workarounds for instances created after the page loaded (such as calling `setCenterPoints()` on `load`); they now start by themselves.
10. Call `destroy()` when you've finished with an instance, for example before removing its elements in a single-page app.
11. The effect now stays at rest for users who prefer reduced motion. If your effect doesn't move anything, consider `reducedMotion: "snap"`; see [Accessibility](README.md#accessibility).

## [2.1.19] - 2020-08-12

- Private class members.

## [2.1.16] - 2019-01-05

- Started on `scatterMethod` for keyframe scatter.

## [2.1.11] - 2018-08-12

- First release on npm without a pre-release tag. Earlier versions weren't recorded in a changelog.

[Unreleased]: https://github.com/Adasha/proximity-effect/tree/4.0
[2.1.19]: https://www.npmjs.com/package/proximity-effect/v/2.1.19
[2.1.16]: https://www.npmjs.com/package/proximity-effect/v/2.1.16
[2.1.11]: https://www.npmjs.com/package/proximity-effect/v/2.1.11
