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
- Every numeric setter and parameter (`threshold`, `runoff`, `attack`, `decay`, `accuracy`, `offsetX`, `offsetY`, `jitter`, `jitterX`, `jitterY`) throws a `TypeError` for a non-number and a `RangeError` for `NaN` or `Infinity`, leaving the old value in place. Out-of-range numbers are still clamped (for example, a negative `threshold` becomes 0). `accuracy` is capped at 20.
- `invert`, `zIndex` and `primeDistances` must be booleans; anything else throws a `TypeError`.
- `FPS` accepts a positive number, or `null`, `undefined`, `false` or 0 to follow the screen refresh. A negative, `NaN` or infinite value throws a `RangeError`, and a non-number throws a `TypeError`, instead of quietly turning the limit off.
- `setCoords()` throws a `RangeError` (was `TypeError`) for `NaN` or infinite coordinates.
- `addStyle()` rejects `NaN` and infinite keyframe values, negative `scatter`, an unknown `scatterMethod`, a keyframe `distance` outside 0 to 1, `min` greater than `max`, and per-style params of the wrong type. Unknown per-style params are dropped.
- `getNodeIndexData()`, `hasNodeIndexData()` and `distanceFromIndex()` throw a `RangeError` for an index outside the node list. `getNodeData()` and `getNodeIndexData()` return `undefined` for inherited property names such as `constructor`.
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
- `data-offsetx` and `data-offsety` are read as numbers; values that aren't finite numbers count as 0.
- A failed `addStyle()` call leaves the style stack and per-node values unchanged.
- `Style.near` and `Style.far` return copies, so changing them can't alter the running effect.
- With `FPS` set, the loop could be driven by both a timer and animation frames.
- Scattered style values are clamped to the style's range.
- The preset style table existed twice; it is now a single frozen module.
- Removed the unused helpers `map`, `valToObj` and `isVisibleInViewport`, and `Style extends Object`.

### Added

- Automated test suite, linting and continuous integration.
- `destroy()`: removes every listener, stops the animation loop and restores each node's original inline style. `destroyed` reports whether it has been called.
- `pause()`, `resume()` and `paused`.
- `nodes` accepts a `NodeList`, an `HTMLCollection`, an array of Elements or a single Element.
- `zIndex` parameter and property, to opt in to distance-based stacking. Turning it off restores the nodes' original `z-index`.
- Custom style `rule` can be written in kebab-case (`"letter-spacing"`) as well as camelCase.
- `SECURITY.md`, and an updated CodeQL workflow that also scans the `4.0` branch and pull requests.
- The module can be imported without a DOM (for example during server-side rendering); constructing an instance there throws a clear error.
