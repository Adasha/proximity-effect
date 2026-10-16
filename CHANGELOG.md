# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
- The undocumented public `preventCenterCalculations` property is removed.

### Fixed

- `addStyle()` was unusable: `Style` never exposed its `near`/`far` values or rules. It now does.
- `Style` no longer mutates the caller's keyframes array or objects, and clamps object keyframe values to the preset's range (previously only plain numbers were clamped).
- `xor()` returns a real boolean.
- Instances created after the page had loaded never initialised (`readyState` was compared with `"completed"`).
- `distanceFrom()` and `getNodeData()` always threw (an undefined variable). They now throw a `RangeError` only for a node the instance doesn't control.
- `removeStyleProp()` removed nothing (it checked a property that doesn't exist), skipped entries when it did, and left per-node values misaligned. It now removes every match, keeps the rest aligned, restores CSS properties that nothing animates any more, and returns whether anything was removed. `hasStyleProp()` and `removeStyleProp()` accept preset names such as `hueRotate`.
- `setCoords()` stored any value because its type check could never pass. Manual coordinates no longer stop the animation loop.
- A `runoff` of 0 produced `NaN`; it now gives a hard edge at the threshold.
- The first frame eased from `null` unless `primeDistances` was set; it now starts at the current distance.
- The constructor stored the caller's `params` object and setters changed it; it is now copied, and only its own properties are read.
- Jitter was lost for nodes set after construction, and `jitterMethod` from the params was never validated.
- Setting `nodes` after `addStyle()` crashed the update loop. Nodes dropped from the list get their original inline style back.
- `update()` crashed if no styles had been added, read layout for every node and discarded it, and read the target's position once per node rather than once per frame.
- `data-offsetx` and `data-offsety` are read as numbers.
- With `FPS` set, the loop could be driven by both a timer and animation frames.
- Scattered style values are clamped to the style's range.
- The preset style table existed twice; it is now a single frozen module.
- Removed the unused helpers `map`, `valToObj` and `isVisibleInViewport`, and `Style extends Object`.

### Added

- Automated test suite, linting and continuous integration.
- `destroy()`: removes every listener, stops the animation loop and restores each node's original inline style. `destroyed` reports whether it has been called.
- `pause()`, `resume()` and `paused`.
- `nodes` accepts a `NodeList`, an `HTMLCollection`, an array of Elements or a single Element.
- The module can be imported without a DOM (for example during server-side rendering); constructing an instance there throws a clear error.
