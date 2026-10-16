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

### Fixed

- `addStyle()` was unusable: `Style` never exposed its `near`/`far` values or rules. It now does.
- `Style` no longer mutates the caller's keyframes array or objects, and clamps object keyframe values to the preset's range (previously only plain numbers were clamped).
- `xor()` returns a real boolean.
- The preset style table existed twice; it is now a single frozen module.
- Removed the unused helpers `map`, `valToObj` and `isVisibleInViewport`, and `Style extends Object`.

### Added

- Automated test suite, linting and continuous integration.
