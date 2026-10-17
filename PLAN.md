# ProximityEffect modernisation plan

Goal: bring ProximityEffect (4.0 branch, currently `4.0.0-alpha1`) up to current practice, and make it hardened, efficient, accessible and well documented, without stranding the installs already in the wild. It follows the same approach as the wrap-chars 3.0 overhaul.

Each session below is meant to run as its own conversation. To start one, say "Read PLAN.md and do Session N". When a session finishes, tick it off and fill in its **Handoff** note, so the next conversation can pick up without re-reading everything.

## Progress

- [ ] 0. Decisions and baseline
- [x] 1. Tooling foundation
- [x] 2. Utilities and Style class
- [x] 3. Core correctness and lifecycle
- [x] 4. Hardening
- [x] 5. Performance
- [x] 6. Accessibility
- [x] 7. Public API, events and types
- [x] 8. Build and packaging
- [x] 9. Documentation and demos
- [ ] 10. Release

Sessions 2 to 7 are ordered by dependency: tests first, then fix, then harden, then optimise. Don't optimise before the tests exist.

## What the audit found

Read from `src/` as of commit `939d1ee`. Concrete bugs, so they're not rediscovered later:

**Correctness**
- `document.readyState === "completed"` is never true (the value is `"complete"`), so an instance created after load waits for a `load` event that has already fired and never initialises. This is probably the most visible bug for late-created instances.
- `getNodeData(n)` references an undefined `node` (its `findIndex` callback shadows `n`), so `distanceFrom()` always throws.
- `removeStyle()` checks `eff["type"]`, which doesn't exist (`hasStyle` uses `func`). It also splices an array while iterating forwards, and doesn't remove the per-node `styles` entries, so indexes drift.
- `setCoords()` tests `typeof x === 'Number'` (never true), so the guard is inverted and inert.
- `runoff = 0` gives `invRunoff = Infinity`, which produces NaN. The README says the default is 0, but the code defaults to 100.
- `lastDelta` is `null` unless `primeDistances` is set, so the first easing step is `null + ...`.
- The constructor stores the caller's `params` object as internal state (`#globalParams = params`), so setters mutate the caller's object.
- `jitterMethod` is documented as `"gaussian"`, but the README's `"uniform"`/`"gaussian"` and the code's `"normal"`/`"uniform"` disagree. The `VALID_RANDOM_METHODS` constant is unused.
- `jitter`, `jitterX` and `jitterY` are only calculated when a setter runs. `jitterMethod` is never validated.
- `Style` mutates the caller's `keyframes` array, and `constrain` returns NaN for non-numbers without complaint.
- `update()` reads `getBoundingClientRect()` and discards the result, interleaves layout reads with style writes (layout thrash), and allocates objects each frame.
- A user-set `z-index` is overwritten whenever any style exists. This is an undocumented side effect.
- `FPS` runs an interval *and* each frame schedules another `requestAnimationFrame`, so with FPS set it can double-drive the loop. Also, `update` is only bound in `#init`, so `FPS` set before init can pass an unbound method.
- `node.dataset.offsetx` is undocumented, and the value is a string being subtracted.
- `target` setter calls `target.getBoundingClientRect()` on non-elements, which throws a confusing TypeError.

**Lifecycle and hardening**
- There is no `destroy()`. Listeners (scroll, resize, mousemove) are added with fresh `.bind()` copies, so they can never be removed. The rAF loop never stops, even when the tab is hidden or the instance is gone. Multiple instances stack global listeners.
- `reflowEvent` uses a `setTimeout(…, 1)` "hack" (flagged in a TODO) and recalculates every node's centre on every scroll event, unthrottled.
- `hasOwnProperty` is called directly on caller-supplied objects.
- Style `rule`, `func` and `unit` strings are written to `node.style` without checks.
- The `nodes` setter only accepts a `NodeList`, not arrays or single elements.

**Accessibility**
- No `prefers-reduced-motion` handling.
- Mouse only: no touch or pen (Pointer Events), and no keyboard or focus equivalent.
- Animating `opacity`, `blur` or `scale` can reduce legibility, and there's no guidance or opt-out. There's no way to pause the effect.

**Tooling and packaging**
- `@babel/polyfill` (deprecated) and `event-target` are dependencies, but the code extends the native `EventTarget`. Neither is needed, and both bloat consumers.
- ES5 Babel output of private fields (`#x`) needs heavy helpers, hence the `core-js` allow-script. Gulp 5, Babel 8 and uglify is a dated toolchain. wrap-chars moved to esbuild.
- ESLint config is the legacy `.eslintrc.json` (ESLint 10 needs flat config), uses `babel-eslint` (dead), and mandates tabs, `windows` line endings and double quotes. The source uses 4 spaces, single quotes and mixed tabs, so lint would fail wholesale.
- `test` script is a stub. `tests/*.html` are manual pages with no assertions. `old/` (ActionScript) and two generated `docs/` versions are in the repo.
- `package.json` has no `exports`, `files` or `type`, and README version (`a4`) differs from package (`alpha1`).
- `dist/` is committed and `.gitignore` doesn't exclude `.claude` or similar. There's no CHANGELOG.

## Session 0: Decisions and baseline

Small, and best done first so later sessions don't re-litigate.

- Commit the three uncommitted edits (README, `ProximityEffect.js` comment, `tests/1.html`) or discard them.
- Decide, and record in this file:
  - **Breaking-change policy.** 4.0 is already alpha. Recommend: break freely where the old behaviour was a bug, keep the `new ProximityEffect(nodes, params)` and `addStyle(property, keyframes)` signatures, and write a migration guide. Does the in-the-wild usage depend on the classic script tag (`unpkg` URL)? If so, keep a classic-script build.
  - **Browser baseline.** Recommend ES2022 (private fields are already required), matching wrap-chars. This drops ES5 output.
  - **Licence.** wrap-chars is LGPL-3.0, this is MPL-2.0. Keep MPL-2.0, or change? (Only the author can change it, and it affects the existing installs, so default is keep.)
  - **Shared code.** `AdashaUtils.mjs` is copied here and also lives in `../adasha-utils`. Keep a private copy (recommended, zero dependencies) or depend on the shared package?
  - **Version number** to ship: 4.0.0 (recommended).
- Capture a baseline: open each `tests/*.html` demo and note which work, so regressions are visible later.

**Decisions (agreed 2026-10-16):**
- Breaking changes are allowed where the old behaviour was a bug. Keep the `new ProximityEffect(nodes, params)` and `addStyle(property, keyframes)` signatures. Write a migration guide.
- Browser baseline is ES2022. The ES5 build is dropped. A minified classic-script build stays, so the bare unpkg URL keeps working.
- Licence stays MPL-2.0.
- `AdashaUtils` stays a private copy in this repo, with no shared-package dependency.
- Ship as 4.0.0.

Baseline (2026-10-16, commit `df25917` plus the plan commit): the tree is clean on branch `4.0`, with nothing pushed since `939d1ee`. `npm run build` works on Node 22.12 (it only changes one line of `dist/ProximityEffect.js`; the committed `dist` is otherwise current). `npm run lint` fails because ESLint 10 can't read `.eslintrc.json`, and `npm test` is a stub. Both are Session 1 work.

Remaining for Session 0: capture the demo baseline. (Partly done in Session 5 by a headless check; see its handoff. A manual look in a real browser is still worthwhile.)

**Handoff:** _(fill in)_

## Session 1: Tooling foundation

No behaviour changes in this session.

- Set `"type": "module"`; replace Gulp, Babel and uglify with esbuild and a `scripts/build.js` (copy the wrap-chars pattern).
- Remove `@babel/polyfill`, `event-target`, `babel-eslint`, the Gulp and Babel packages and the `core-js` allow-script. Run `npm audit`.
- ESLint flat config (`eslint.config.js`) with `@eslint/js`. Pick one style (the dominant existing one: 4-space indent, Allman braces for classes?) and apply it with an autofix pass. Fix line endings via `.gitattributes` (`* text=auto eol=lf`) rather than the lint rule.
- Vitest with jsdom (or happy-dom) and a `npm test` script, plus one smoke test that imports the module.
- GitHub Actions: lint, test, build on push and PR (CodeQL is already present). Check Node version support.
- Repo hygiene: move `old/` to a branch or tag and remove it from the tree; stop committing generated `docs/` (replace in Session 9); decide whether `dist/` stays committed.

**Done when:** `npm run lint`, `npm test`, `npm run build` all pass on a clean checkout and in CI.

**Handoff (2026-10-16):**
- Done: `"type": "module"`, esbuild via `scripts/build.js` (outputs `dist/proximity-effect.mjs` and `dist/proximity-effect.min.js` plus source map), `exports`/`files`/`sideEffects`/`unpkg`/`jsdelivr` set. Removed Gulp, Babel, uglify, `@babel/polyfill`, `event-target`, `babel-eslint`, JSDoc, and the `core-js` allow-script. `npm audit` reports 0 vulnerabilities.
- ESLint flat config (recommended rules only; no style rules, so the mixed tabs/spaces were left alone). `.gitattributes` already had `* text=auto`. Only mechanical fix in `src`: `hasOwnProperty` became `Object.hasOwn`. Ten warnings remain in `src` on purpose: they mark the audit bugs (`valid-typeof`, undefined `node`, setter return, unused vars/members). **Session 2/3 must fix them and promote those rules back to errors in `eslint.config.js`.**
- Vitest 5 + jsdom with `tests/smoke.test.js` and `tests/dist.test.js` (builds and loads the dist files). Needs **Node 24** (`.nvmrc`); it fails on Node 22.12 (undici). No `engines` field added yet; Session 8.
- CI: `.github/workflows/ci.yml` (lint, test, build, `npm pack --dry-run`) on push to master/4.0 and PRs. Actions are pinned to the same SHAs as wrap-chars. CodeQL workflow untouched (still `@v1`/`v2` actions, master only; update in Session 4). Not yet run on GitHub since nothing is pushed.
- Repo hygiene: removed `old/`, generated `docs/`, and the committed `dist/` (now gitignored, built on `prepack`). `old/` and `docs/` remain in history. Hot-linking `dist/ProximityEffect*.js` from raw GitHub will break; npm/unpkg users are covered by the new `unpkg` field. Recheck in Session 8.
- `CHANGELOG.md` started. `tests/1.html` now imports `../src/ProximityEffect.js`; dead `event-target` script tags removed from the demos. Other demos (`div-grid.html`, `frame-seq_grid.html`, `video*.html`, `6.html`) were not checked for working imports.
- `package.json` version is still `v4.0.0-alpha1` (with the `v`); fix in Session 8. Done after review: the `v` is gone from `package.json` and the lockfile (the build banner adds it), and the README header now says `v4.0.0-alpha1`.

## Session 2: Utilities and Style class

Pure logic with no DOM, so it's the cheapest place to build the test habit.

- Unit-test `AdashaUtils.mjs` (`constrain`, `roundTo`, `lerp`, `map`, `random`, `xor`) and `StyleClass.mjs`, including edge cases: NaN, Infinity, missing bounds, empty keyframes.
- Fix: the `random` method names (settle on `"uniform"` and `"normal"`, accept `"gaussian"` as an alias), `constrain` behaviour on non-numbers, `xor` returning non-booleans, and `Style` mutating the caller's keyframes.
- Strip out unused helpers (`map`, `isVisibleInViewport`, etc.) if nothing uses them, and `Style extends Object`.
- Consolidate the duplicated `#DEFINED_STYLES` table (it exists in both `ProximityEffect.js` and `StyleClass.mjs`) into one module.
- Decide how the `args: 3` styles (`color`, `backgroundColor`, `scale3D`) behave. The README says they're unsupported, yet they're defined. Either finish or remove them (this overlaps the 4.1 roadmap item).

**Handoff (2026-10-16):**
- Done: `AdashaUtils.mjs` trimmed to `constrain`, `roundTo`, `lerp`, `random`, `xor`, `isObject` (removed `map`, `valToObj`, `isVisibleInViewport`). `constrain` now throws `TypeError` on non-numbers (NaN passes through); `random` accepts `"uniform"`, `"normal"` and the alias `"gaussian"` and throws `RangeError` otherwise; `xor` returns booleans.
- New `src/definedStyles.mjs` is the one frozen preset table. `args: 3` styles (`color`, `backgroundColor`, `scale3D`) were **removed**, to come back with multi-value properties in 4.1. `ProximityEffect.js` no longer has its own copy or `#VALID_RANDOM_METHODS`.
- `Style` rewritten: it was broken (`near`/`far` never set, `addStyle` could not work). It now validates, copies keyframes and params, clamps object keyframes, and has read-only getters `rule, func, unit, min, max, defaultValue, near, far, params`. The update loop reads `style.rule/func/unit` (was `style.rules.*`). Needs ≥2 keyframes; only first and last are used (middle keyframes are for 4.3).
- Tests: `tests/utils.test.js`, `tests/style.test.js` (31 tests in total pass on Node 24). `no-unused-private-class-members` promoted to error. Seven warnings remain, all in `ProximityEffect.js` for Session 3: `valid-typeof` (setCoords), `no-undef` (`node` in getNodeData), `no-setter-return`, and the unused `timestamp`/`view`/`bounds` in `update()`.
- Not done / for later: setters still call `random` with unvalidated `jitterMethod`, so a bad value now throws at calc time; Session 4 should validate in the setter. Custom style `rule`/`func`/`unit` strings are still unvalidated (Session 4). The jitter-method default and README names (`"gaussian"`) still need reconciling in docs.

## Session 3: Core correctness and lifecycle

Fix every item under **Correctness** and the lifecycle bullets above, with a regression test for each.

- Fix the `readyState` bug, `getNodeData`, `removeStyle`, `setCoords`, `runoff` of 0, `lastDelta` initialisation, the shared `params` object, and the jitter lifecycle.
- Add `destroy()`: stop the loop, remove every listener (stable bound references, or an `AbortController`), and restore the nodes' original inline styles (the original `cssText` is already captured). Add `pause()` and `resume()`.
- Make instance creation safe at any point in the page lifecycle and on import without a DOM (SSR-safe: no `window` or `document` access at module scope).
- Accept a NodeList, an array, or a single Element for `nodes`.
- Test with jsdom, faking `getBoundingClientRect` and `requestAnimationFrame`.

**Handoff (2026-10-16):**
- Done: every Correctness bullet except the ones explicitly owned by later sessions (z-index side effect: Session 4; layout thrash in `setCenterPoints` and per-frame allocation: Session 5). The `params` object is copied (own properties only); nodes data is built in one place (`#createNodeData`), so jitter and style values survive `nodes` being reset. `runoff` 0 is a hard edge; the default stays **100** (the README's "0" is wrong; fix in Session 9). `lastDelta` starts `undefined` (first frame = current distance) or 1 with `primeDistances`.
- Lifecycle: `destroy()` (AbortController for all listeners, cancels rAF and the reflow timer, restores `cssText`), `pause()`/`resume()`, `paused`/`destroyed` getters. One rAF clock; `FPS` is now a rAF throttle (pulled forward from Session 5 because it was the cleanest fix for the double-drive bug). `ready` fires in a microtask, or on `load` while loading. No synthetic `mousemove`; with nothing to track nodes rest at the far value and `pointer` is `null`.
- `nodes` accepts NodeList, HTMLCollection, array or Element (deduped); dropped nodes get their `cssText` back. `target` must be an `Element`. `jitterMethod` is validated in its setter (Session 2's note is done). `Style` gained a `name` getter (preset name, else `func ?? rule`) used by `hasStyle`/`removeStyle`, which also match `func` for compatibility.
- `update()` is now a plain "draw one frame" (no scheduling, ignores arguments; no-op after destroy). `updatePointer` and `reflowEvent` are still public, wrapped by stable private arrow fields; Session 7 decides whether to make them private.
- SSR: no DOM access at module scope; constructing without `document` throws. Tested in `tests/ssr.test.js` (node environment).
- Tests: `tests/proximity-effect.test.js` (36) + `tests/ssr.test.js` (2); 69 total pass on Node 24. ESLint rule overrides removed; all recommended rules are errors and lint is clean.
- For later: `offsetX`/`offsetY` and keyframe `scatter` are still unvalidated (Session 4). `reflowEvent` still uses the `setTimeout` hack, now debounced and cancellable (Session 5). `setCenterPoints` still writes `cssText` to measure each node (Session 5). `destroy()` restores the `cssText` captured at construction, so inline style changes made by the page afterwards are lost; document it (Session 9) or capture only the properties the effect writes. Demos were not opened in a browser this session.

## Session 4: Hardening

Same treatment as wrap-chars: validate everything up front, fail loudly with typed errors, and never leave an instance half-configured.

- Consistent `TypeError` or `RangeError` for every public setter and method argument, with validation completed before any state changes. Clamp or reject NaN and Infinity.
- Copy `params` and `keyframes` defensively. Use `Object.hasOwn` rather than calling `hasOwnProperty` on caller objects. Guard against prototype pollution in custom style objects.
- Validate custom style definitions: `rule` against a pattern for CSS property names (or checked against `CSSStyleDeclaration`), `func` against `[a-z-]+`, `unit` against an allow-list. Document that this stops a configuration object from writing arbitrary values into inline styles.
- Resolve the `z-index` side effect: make it opt-in and documented.
- A short `SECURITY.md`, an update to the existing CodeQL workflow if needed, and a note in the changelog about anything that was previously exploitable (probably little, but confirm instead of assuming).

**Handoff (2026-10-16):**
- Done: new `src/validate.mjs` (`finite`, `boolean`, `randomMethod`, `RANDOM_METHODS`). Rule everywhere: wrong type → `TypeError`; NaN, Infinity or an unknown name → `RangeError`; in-range clamping is kept (negative `threshold` → 0, `attack` > 1 → 1, `accuracy` capped at 20). Every setter validates before writing. `invert`, `zIndex`, `primeDistances` must be real booleans. `FPS`: `null`/`undefined`/`false`/0 mean off; anything else must be a positive finite number. `setCoords` NaN is now `RangeError` (was `TypeError`).
- `Style`: custom `rule` must be camelCase or kebab-case and not a reserved `CSSStyleDeclaration`/`Object.prototype` member (`cssText`, `setProperty` etc.); `func` must be a plain function name and not `url`/`image-set`/`attr`/`var`/etc.; `unit` from a fixed CSS unit list (case-insensitive). `min`/`max`/`default`, keyframe `value`/`scatter`/`scatterMethod`/`distance` and per-style params are all validated. Only own properties are read; keyframe objects always carry every key, so a polluted `Object.prototype` can't leak in (tested). `near`/`far` return copies. Unknown per-style params are dropped (they're still unused by `update()`; Session 7 decides).
- `addStyle()` computes all per-node values before touching the stack. `getNodeIndexData`/`hasNodeIndexData` validate the index; node data reads are own-property only. Bad `data-offsetx/y` count as 0.
- z-index is now opt-in (`zIndex: true`); turning it off restores the original value.
- Security: confirmed against the published 2.1.19 (fetched from npm) that a custom effect's `rule`/`unit` went into `node.style[rule]` unchecked, so `rule: "cssText"` plus a crafted `unit` could set arbitrary inline CSS (including `url()` requests). No script execution. Only reachable with untrusted config. Recorded under **Security** in the CHANGELOG. `SECURITY.md` added. CodeQL workflow rewritten: pinned `checkout` v7.0.1 and `codeql-action` v4.39.0 SHAs, `javascript-typescript`, `security-and-quality` queries, no autobuild, runs on master, 4.0 and all PRs.
- GitHub private vulnerability reporting is on, and the "< 4.0 not supported" policy in `SECURITY.md` is confirmed (2026-10-16).
- Tests: 90 pass on Node 24 (new "Style hardening", "hardening" and "zIndex" blocks). Lint, build and `npm pack --dry-run` clean.
- For Session 9 (migration guide): 2.1.x's `opacity` preset was the CSS `opacity` property (0–1); 4.0's is the `filter: opacity()` function (0–100%). Also document the z-index change and the stricter validation.
- For later: `addProperty`/`hasProperty`/`removeProperty` stubs are still unvalidated (Session 7 decides their fate). Custom properties (`--foo`) aren't supported, since writes use `style[rule]` rather than `setProperty`; could be added in 4.1.

## Session 5: Performance

Measure first, then change. Build a small benchmark page (for example 1,000 and 5,000 nodes) and record frame times before and after.

- Separate the read phase from the write phase in `update()`: no `getBoundingClientRect()` in the per-frame loop for nodes (centres are cached), and compute the target position once per frame rather than once per node.
- Stop the loop when idle: don't run rAF when the pointer hasn't moved and all nodes have settled. Pause when the tab is hidden (`visibilitychange`).
- Skip off-screen nodes with `IntersectionObserver`, or skip style writes when the value hasn't changed.
- Replace the scroll and resize `setTimeout` hack with `ResizeObserver` plus a throttled (rAF-batched) recalculation of centres. Use passive listeners.
- Reduce per-frame allocation (the `styles` object, joined strings) and cache the per-node transform and filter strings.
- Fix the `FPS` interval and rAF double-drive: one clock, with `FPS` implemented as a rAF throttle.
- Consider documenting `will-change` and `contain` guidance for users instead of applying it automatically.

**Done when:** the benchmark shows a measurable improvement, and idle CPU is near zero.

**Handoff (2026-10-17):**
- Benchmark: `tests/bench.html` + `scripts/bench.js` (`npm run bench`; options `--n 1000,5000`, `--styles all|filter`, `--baseline <dir of another src/>`). It drives headless Chrome over the DevTools protocol with Node's WebSocket (no dependency), and finds Chrome in `~/.cache/puppeteer` or `$CHROME_PATH`. Not in CI.
- Results (baseline = commit `113b30d`, 1,000 / 5,000 nodes): frame work 4.5 → 1.8 ms / 15.6 → 2.3 ms; idle frames 60/s → 0; remeasure 0.83 s → 17 ms / 25 s → 67 ms; page scroll froze the page (a remeasure on every scroll) and now runs at 60fps with no remeasure. Figures are in the CHANGELOG under **Performance**.
- Done: the loop stops when idle (no node's eased value changed) and is woken by pointer moves, scroll/resize, every output-affecting setter and method, and `visibilitychange` (stopped while hidden). With a `target` element it runs every frame. Writes are skipped for unchanged nodes (`#needsRewrite` forces them after style stack or `zIndex` changes). Styles are grouped by property once (`#groupStyles`), not every frame. Params are hoisted, and `data-offsetx/y` are read at measure time.
- Measuring (`#measure`) is batched into write/read/write passes. It only strips non-paint properties (`PAINT_ONLY_RULES`: filter, opacity, z-index, backdrop-filter), one property at a time from cached originals; cssText swaps forced full layout. Page scroll: nodes not inside fixed or sticky elements (`scrollsWithPage`, from `getComputedStyle` in the read pass) are shifted arithmetically in `update()` (`#followScroll`). Fixed and sticky nodes are remeasured on their own. Container scrolls remeasure only if the container holds a node. `ResizeObserver` (on `documentElement` and every node, feature-detected) and `resize` request a batched remeasure on the next frame. The `setTimeout` hack is gone. Offsets and jitter are applied without remeasuring.
- Bug found and fixed: easing could stall one rounding step short of the target forever (now snaps when a step rounds to nothing, unless the rate is 0).
- Decided not to use IntersectionObserver: skipping unchanged nodes already avoids writing to far-away (and so usually off-screen) nodes, and the 5,000-node frame is 2.3 ms. FPS throttle was already done in Session 3.
- Behaviour changes (all in CHANGELOG): `redraw` only fires for drawn frames; `reflow` fires per remeasure rather than per event; external inline style changes on a node are no longer overwritten every frame; `center` now includes `data-offset`; the node data has new `measured` and `scrollsWithPage` fields (Session 7 decides what of node data is public).
- Demo check (headless Chrome, mouse moves + scroll): `1`–`7.html` and `div-grid.html` work identically to the baseline. `frame-seq_grid`, `gooffscreen`, `video`, `video2`, `x1` and `x2` are broken in both (404s on old dist paths, non-module scripts), so that's Session 9. `1.html` also has one 404 asset.
- For later: Session 6 switches `mousemove` to Pointer Events; update `tests/bench.html` (it dispatches `mousemove`). Session 9: document `will-change: transform` / `contain` guidance (not applied automatically), that transform presets are cheaper than layout properties (custom `width`, `letterSpacing`), and that `setCenterPoints()` is only needed for movement the instance can't see (e.g. CSS animations of the nodes' positions). The first `ResizeObserver` report for each element is now skipped (`#sizeReported`), so start-up and newly added nodes aren't measured twice.
- Known gap (review, finding 7): `filter` and `backdrop-filter` are treated as paint-only, so `#measure` never takes them off. On an ancestor they also make it the containing block for `position: fixed` descendants, so an animated filter on a controlled node could shift a fixed node inside it. Rare; noted only.
- Done after review: the effect's own size-changing writes are marked per node (`#ownResizes`) and the observer ignores them; other observer reports set `#measureWhenSettled`, measured on the first frame after nodes stop moving (window `resize` still measures straight away). `#measure` returns whether a centre moved, and `reflow` only fires then. Known gap: an outside size change to a node in the same frame as the effect resizes it is missed until the next trigger. `npm run bench -- --styles layout` animates `width`.

## Session 6: Accessibility

- Honour `prefers-reduced-motion`: by default, snap to the settled state or disable the effect, with an option to override, and react to the media query changing live.
- Pointer Events instead of `mousemove`: touch and pen support, plus `pointerleave` and `blur` handling so the effect settles when the pointer leaves.
- Keyboard and focus: an option to treat the focused element as the target (`target` already supports an arbitrary element, so this may be mostly documentation and an example).
- Don't hide information from assistive tech: the effect only changes visual style, so confirm it never touches `aria-*`, `hidden`, `tabindex` or the DOM structure, and test that opacity and blur ranges don't destroy a text label's contrast (document recommended limits and WCAG criteria 1.4.3, 2.2.2 and 2.3.3).
- A visible and programmatic way to pause or stop the effect (`pause()` from Session 3), with example markup for a "pause animations" control.
- Run an automated check (axe-core in a demo page) and a manual screen reader pass on one demo.

**Handoff (2026-10-17):**
- Reduced motion: new `reducedMotion` param/property, `"rest"` (default) | `"snap"` | `"ignore"`, and read-only `motionReduced`. `matchMedia("(prefers-reduced-motion: reduce)")` is read in `#init` and followed live (`change` listener on the abort signal; feature-detected, since jsdom has no `matchMedia`). "rest" makes `#targetPoint()` return null (so nodes rest exactly as with nothing tracked, including with `invert`) and `#followingTarget()` false, so the loop sleeps even with a target. Any reduced mode sets the easing rate to 1, so switching snaps rather than eases.
- Pointer Events: `pointermove` + `pointerdown` replace `mousemove`. `updatePointer` ignores `isPrimary===false` (so synthetic `PointerEvent`s need `isPrimary: true`; plain `MouseEvent`s still work if passed in directly). `pointerout` with `relatedTarget===null` (left the page, or touch/pen lifted) and window `blur` set `pointer` to null and the nodes ease back to rest. `tests/bench.html` dispatches `pointermove`.
- Never touches ARIA/`hidden`/`tabindex`/DOM: tested with a `MutationObserver` (only `style` attribute changes, on controlled nodes). That test found `destroy()` leaving an empty `style=""`; node data now has `hadStyle` and `#restoreInlineStyle` removes the attribute when there was none (also when nodes are dropped).
- Demo `tests/a11y.html`: pause toggle (`aria-pressed`), keyboard focus as target (`focusin` + `:focus-visible`, `focusout` clears), reducedMotion select and a `role="status"` line. `npm run a11y [-- --page tests/x.html]` (`scripts/a11y.js`) runs axe-core 4.14 (new devDependency) at rest, with the pointer over a node and under emulated reduced motion, plus its own checks: text contrast with `opacity` and `filter: opacity()` blended in (axe misses the latter; confirmed with a 40% copy of the demo, which axe passed and the custom check failed), pointer moves nodes, Tab makes focus the target, reduced motion rests. All pass. The page must expose `window.pe`. Server + DevTools client moved from `bench.js` into `scripts/chrome.js` (`open()` now navigates and waits for load); bench re-run, same figures.
- README: new **Accessibility** section (reduced motion, pointer/touch, pause markup, focus example, contrast table of minimum opacity for 4.5:1 and 3:1, blur and screen-reader notes, WCAG 1.4.3, 2.2.2, 2.3.3, 2.4.7) and a `reducedMotion` row in the params table. Session 9 can carry it into the rewrite.
- Tests: 143 pass on Node 24 (new "accessibility" block, 18 tests). Lint clean.
- Manual screen reader pass on `tests/a11y.html`: done by the user (2026-10-17), passes (links read in order, pause button announces its pressed state, status line is read).
- For Session 7: new public surface to pin: `reducedMotion`, `motionReduced`, `hadStyle` in node data; `updatePointer`'s `isPrimary` rule if it stays public. For Session 9: demos now rest under reduced motion automatically; the other demos could get `npm run a11y` once they expose `window.pe`. For Session 10: check `pointerout` with a null `relatedTarget` fires on leaving the window in Firefox and Safari, and touch behaviour on a real phone.

## Session 7: Public API, events and types

- Settle the 4.0 public surface and mark what's private. Finish or remove the unfinished stubs (`addProperty`, `hasProperty`, `removeProperty`, `getCoords` and `setCoords` naming, `totalNodes`), and make `updatePointer`, `reflowEvent` and `update` private or clearly documented. The public name `update` is currently callable with a bogus timestamp.
- Document the events (`ready`, `redraw`, `reflow`), whether they bubble, and what the payload is. Consider adding `CustomEvent` details, and stop dispatching `redraw` every frame unless something is listening.
- Ship TypeScript declarations (`.d.ts`, written by hand or generated from JSDoc with `tsc --allowJs --declaration`) and test them with a small `tsd` or `tsc` check.
- Pin the API in tests, so changes later are deliberate.
- Decide how the 4.1 to 4.3 roadmap features will fit (multi-value properties, per-property parameters, multi-point animations), so 4.0 doesn't paint them into a corner. Record the decision only; don't build them.
- Per-style params (review finding): nothing ever read them, despite the JSDoc. Decided: `threshold`, `runoff`, `invert`, `attack` and `decay` now throw a `RangeError` in `Style`, so 4.2 can add them without changing existing calls. `id` is still accepted and stored but unused; decide here whether `removeStyle` should match it.

**Handoff (2026-10-17):**
- Public surface, pinned in `tests/api.test.js` (exact prototype member list, getter/setter/method kind, `Style` getters, node data keys, and a check that `src/ProximityEffect.d.ts` declares the same members). Read-write: `target nodes threshold runoff invert zIndex attack decay offsetX offsetY jitter jitterX jitterY jitterMethod direction FPS tolerance reducedMotion`. Read-only: `totalNodes styles boundary motionReduced pointer paused destroyed`. Methods: `addStyle hasStyle removeStyle distanceFrom distanceFromIndex clearTarget getCoords setCoords clearCoords setCenterPoints pause resume destroy getNodeData getNodeIndexData hasNodeIndexData update`. No statics.
- Removed `addProperty`/`hasProperty`/`removeProperty`. `updatePointer` and `reflowEvent` are private (`#pointerMove`, `#reflow`). `update()` stays public, documented as "draw one frame now" (useful while paused; no `redraw`). `totalNodes` documented and kept. `getCoords`/`setCoords`/`clearCoords` keep their names (a consistent trio; no `coords` property). `nodes` now returns a copy.
- Node data: `getNodeData`/`getNodeIndexData` return copies built from a frozen field table (`NODE_DATA` in `ProximityEffect.js`): `node, measured, center, jitter, distance, lastDelta, styles`, leaving out fields with no value yet. `style` (original cssText), `hadStyle`, `originals` and `scrollsWithPage` are internal now. `hasNodeIndexData` means "public field with a value".
- Style `id`: `hasStyle`/`removeStyle` match it (as well as the name and func); `Style` has an `id` getter.
- Events: kept as plain `Event` (no bubbling, not cancelable, no detail), documented with `@event` JSDoc and in the types. Moving to `CustomEvent` with a `detail` later is backwards compatible. Not counting listeners for `redraw`: since Session 5 it only fires for drawn frames, and an unheard dispatch is cheap.
- Keyframes: more than two, or a keyframe `distance`, now throw a `RangeError` (same reasoning as per-style params). Every stored keyframe has `distance` 0 (near) or 1 (far). README line updated. **`tests/frame-seq_grid.html` passes five keyframes and will now throw** (it was already broken; Session 9).
- Types: hand-written `src/ProximityEffect.d.ts`, copied to `dist/proximity-effect.d.ts` by `scripts/build.js`; `package.json` has `types` and an `exports` `types` condition (pulled forward from Session 8). `npm run typecheck` (`tsc -p tests/types`, TypeScript 7.0.2 devDependency) checks `tests/types/api.ts`, which uses `@ts-expect-error` for what must fail (unknown presets, three keyframes, private/removed members, read-only properties). Added to CI. `dist.test.js` checks the shipped `.d.ts`.
- Roadmap fit (decision only, nothing built):
  - 4.1 multi-value properties: keyframe `value` (and `scatter`) will also accept an array of numbers (`[r, g, b]`, `[x, y, z]`); presets gain an argument count and per-argument `min`/`max`; values are joined inside the function. 4.0 rejects non-number values, so it's additive at runtime. In the types, `StyleKeyframe.value` and `NodeStyleValues.near/far` will widen to `number | number[]`, which TypeScript readers of those fields will notice; acceptable for a minor.
  - 4.2 per-style params: the third `addStyle` argument (already validated and rejecting them). Each style gets its own eased distance; per-style `distance`/`lastDelta` would go in node data `styles[i]` (already objects), while the top-level fields stay global. `#groupStyles` stays; only the lerp input changes per item.
  - 4.3 multi-point: more than two keyframes, with optional ascending `distance` (missing ones spread evenly). `Style` gains a `keyframes` getter; `near`/`far` stay as first/last, and node data `styles[i]` gains a `values` array alongside `near`/`far`.
- Tests: 156 pass on Node 24 (new `tests/api.test.js`, 9; style tests updated). Lint, typecheck, build, `npm pack --dry-run` (now 8 files, 66.8 kB) and `npm run a11y` all clean.
- For Session 8: no type declaration for the classic script's global `ProximityEffect` (consider a `global.d.ts` or document `import type`). The typecheck uses the source path, not the package name; Session 10's tarball install should include a TypeScript consumer. For Session 9: the API reference can be built from the `.d.ts` plus JSDoc; document node data, events and `update()` as above; migration guide entries are in the CHANGELOG.

## Session 8: Build and packaging

- `package.json`: `exports` map, `files`, `sideEffects: false`, `types`, `module`, `unpkg` and `jsdelivr`, and correct engines. Matching version in README, source header and `package.json`.
- Outputs: an ES module (`dist/proximity-effect.mjs`) and a minified classic script that sets a global `ProximityEffect` (keeps the bare unpkg URL working for existing installs). Source maps. Check the size against the old build and compare with `npm pack --dry-run`.
- A `dist.test.js` that loads the built files (as wrap-chars does), to catch packaging mistakes.
- Decide on `dist/` committed versus built in CI and on publish. Add provenance to the npm publish workflow if publishing from CI.
- Confirm the old file names (`dist/ProximityEffect.js`, `.min.js`) still resolve for people who hot-link them, or document the change clearly.

**Handoff (2026-10-17):**
- Most of this was already in place from Sessions 1 and 7 (`exports`, `files`, `sideEffects`, `module`, `types`, `unpkg`/`jsdelivr`, ESM and classic builds, source map, `dist.test.js`). Added this session:
  - `src/ProximityEffect.global.d.ts`, shipped as `dist/proximity-effect.global.d.ts` (the build rewrites its import to the renamed module types) and exported types-only as `proximity-effect/global`. It needs `nodenext`/`bundler` resolution, since `exports` is ignored under the old `node` resolution. `tests/types/global.ts` checks it.
  - `dist.test.js` now checks: every file `package.json` names exists; the exact `npm pack` file list (9 files); and that `package.json`, the lockfile, the README header, `@version` and both build banners agree on the version. That last check guards Session 10's version bump.
  - `devEngines` (Node >=24, `onFail: "warn"`) for contributors. No `engines`: it's a browser library, and `engines` would only make npm warn for consumers.
- Versions already agree (`4.0.0-alpha1` everywhere).
- Size: classic `proximity-effect.min.js` is 20.7 kB, 7.1 kB gzipped. The 2.1.16 `ProximityEffect.min.js` was 12.1 kB and 3.7 kB gzipped; the growth is validation, lifecycle, accessibility and reduced-motion code. The ESM build is 57 kB unminified (comments kept; consumers' bundlers minify it). `npm pack --dry-run`: 67 kB packed, 9 files.
- `dist/` stays uncommitted and is built on `prepack`. **Publishing stays manual by the user** (matching wrap-chars), so there's no publish workflow and no provenance. Provenance needs publishing from CI; add an OIDC trusted-publishing workflow later if wanted.
- Old file names: findings recorded in the CHANGELOG. npm's latest, 2.1.19, shipped **no `dist/` at all**, so the bare unpkg URL (redirecting to `2.1.19/dist/ProximityEffect.min.js`) and the bare jsDelivr URL return 404 today; 4.0 fixes both. jsDelivr shows about 47 hits a month, all for 2.1.19. Version-pinned 2.1.x CDN URLs (e.g. 2.1.16) still work and are unaffected. `master` still has `dist/ProximityEffect*.js` committed from 2022, so GitHub/jsDelivr `gh` hot links on `master` break when 4.0 merges. The CHANGELOG tells those users to pin tag `2.1.14` (checked: returns 200). No alias files were shipped under the old names: unpinned path URLs are already broken, and pinned ones don't need them.
- Tests: 160 pass on Node 24. Lint, typecheck, build and a11y are clean.
- For Session 9: the README install section still describes ES5 builds in `dist`; rewrite it with the URLs above, `import type`, and the `proximity-effect/global` reference. For Session 10: the tarball install should include a TypeScript consumer using `proximity-effect/global` (resolved by package name, which the typecheck here doesn't do).

## Session 9: Documentation and demos

- Rewrite the README: install (ESM, CDN, classic script), a quick start that works when pasted, the full parameter table (correct defaults, correct method names), the preset style list, accessibility notes, browser support, and licence.
- Replace the unfinished wiki API page with a complete API reference in the repo (generated from JSDoc, or hand-written Markdown), covering every parameter, property, method and event. Fix the placeholder JSDoc (`XXXXX`, "Did this work?", empty descriptions).
- A migration guide (3.x to 4.0) and a CHANGELOG in Keep a Changelog format.
- Turn `tests/*.html` into tidy, accessible demos: consistent markup, real titles and alt text, `lang`, reduced-motion respected, and delete or merge the duplicates (`x1`/`x2`, `video`/`video2`, etc.). Decide what the live site at lab.adasha.com should show.
- Remove the stale generated `docs/v3.*` folders.
- `CONTRIBUTING.md`, plus a check that the issue templates are current.

**Handoff (2026-10-17):**
- README rewritten in the wrap-chars v3 layout: Contents, About, Installation (npm, browser module, classic script on UNPKG and jsDelivr, TypeScript with `proximity-effect/global`), a quick start page (checked against the local build in headless Chrome; the `@4` URLs only work once 4.0.0 is published), Use (full params table with `runoff` default 100, `addStyle()`, presets, custom styles, scatter, methods, events), Accessibility (kept from Session 6), Performance (`will-change`/`contain` guidance, not applied), Browser support (ES2022: Chrome/Edge 93+, Firefox 92+, Safari 15.4+), Known issues, Development, Roadmap, Version history, Licence, AI usage disclosure.
- **For the user to confirm:** the AI usage disclosure wording (modelled on wrap-chars), and the licence paragraph, which now describes what the MPL 2.0 asks (changed files stay MPL, with source available) instead of "pushed back".
- `docs/API.md`: complete hand-written reference (how distances become values, constructor, every property and method, presets with ranges, custom styles and their checks, keyframes, style params and objects, node data, events, `data-offsetx/y`, errors, exported types). It replaces the wiki page, which can now be deleted or pointed at the file.
- JSDoc and `.d.ts` comments filled in (no `XXXXX` placeholders were left; the vague ones were attack, decay, target, FPS, jitter, offsets). Found while documenting: a positive `offsetX`/`offsetY`/`data-offsetx` moves the centre **left/up** (they're subtracted, as in 2.1.19). Documented, not changed.
- CHANGELOG: an intro, the renames since the published 2.1.19 that were missing (`addEffect` → `addStyle`, `hasEffect`/`removeEffect`/`effects`, `doPresetDistances` → `primeDistances`, `mode` removed, `opacity` preset range), the 3.0-alpha features under Added (`jitterX/Y`, `jitterMethod`, coords methods, `FPS`), a fix (2.1.19's classic script also leaked a global `Utils`), an **Upgrading from 2.x** checklist (the migration guide, kept in the changelog as wrap-chars does), and short 2.1.19/2.1.16/2.1.11 entries with npm links. Session 10 turns `[Unreleased]` into 4.0.0 and updates its link.
- Demos moved to `demos/` with an `index.html`, shared `demo.css` and `demo.js` (pause button, `window.pe`). Kept and tidied: `bubbles` (1), `depth` (2), `flip` (3), `reveal` (4), `lens` (5), `scatter` (6 and 7 merged, with letter/word and direction controls), `pulse` (x2), `playground` (div-grid, controls now wired), `a11y`. Removed: `video`, `video2`, `x1` (relied on lab site files), `frame-seq_grid` (duplicate, five keyframes), `gooffscreen` (old `addEffect` API). `WrapChars.min.js` replaced by the wrap-chars 3.0 module (accessible by default). Changes to the art: `lens` now magnifies near the pointer and stays readable at rest (it was blurred 5px at rest), the 3D stages in `flip` and `playground` have no background (turned tiles went behind it), and `pulse` rests visible.
- `npm run a11y` checks every demo by default (`--page` can be repeated), and takes the test point from the node's `center` (a `translateZ` box can be anywhere). All nine pass. `tests/` now only holds tests, `bench.html` and the type checks.
- `docs/v3.*` were already removed in Session 1. Issue templates updated (version, load method, input, reduced motion), plus `config.yml` pointing security reports to private reporting. `CONTRIBUTING.md` added.
- Tests: 160 pass on Node 24. Lint, typecheck, build and a11y clean.
- **Live site (user's decision):** recommended to publish `demos/` as it is. Its pages import `../src/ProximityEffect.js`, so either upload `src/` beside it, or change the imports to the published UNPKG module at release.
- For Session 10: the cross-browser pass can use `demos/` (the playground covers most properties); check the quick start's URLs once published; the Session 0 manual demo baseline is moot now the demos are rewritten.

## Session 10: Release

- Full pass: lint, tests, build, `npm audit`, `npm pack --dry-run`, and install the packed tarball into a scratch project (ESM, classic script and TypeScript consumers).
- Final cross-browser check of the demos (Chrome, Firefox, Safari, mobile).
- Confirm CHANGELOG, README and versions agree. Tag and publish (**the user publishes; Claude prepares**). Update the live demo site.
- No further alphas: the next published version is `4.0.0`, straight from `4.0.0-alpha1`. Set it in `package.json`, the lockfile, the README header and the `@version` tag in `src/ProximityEffect.js`, and turn `[Unreleased]` in the CHANGELOG into the 4.0.0 entry.
- Review remaining TODOs and open issues, and note anything deferred to 4.1.
- Consider an explicit posterise option (quantised steps), replacing what low `accuracy` did by accident. Discuss the design first; it can be added earlier if that turns out simpler.
- Optional (user's choice at the time): npm trusted publishing with provenance. Before anything else, confirm that two-factor authentication is on for the npm account. If going ahead: add a `.github/workflows/publish.yml` that runs on a GitHub release (or a `v*` tag). It needs `id-token: write`, actions pinned by SHA as in `ci.yml`, Node from `.nvmrc`, and `npm ci`, lint, test and typecheck before `npm publish`. Then the user registers the workflow as a trusted publisher in the package settings on npmjs.com. With trusted publishing, no `NPM_TOKEN` secret is needed and provenance is added automatically; check this against current npm docs. Do the same for wrap-chars to keep the two consistent. Otherwise, the user publishes 4.0.0 by hand as planned.

**Handoff:** _(fill in)_

## Notes for every session

- Work on the `4.0` branch; commit at the end of each session with a clear message. Don't push or publish without asking.
- Keep the zero-runtime-dependency property.
- Every bug fix gets a test. Every public change gets a CHANGELOG line (start the file in Session 1 so entries accumulate).
- If a session is running long, stop at a clean boundary, write the handoff, and carry the remainder into the next session rather than rushing.
