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
- [ ] 6. Accessibility
- [ ] 7. Public API, events and types
- [ ] 8. Build and packaging
- [ ] 9. Documentation and demos
- [ ] 10. Release

Sessions 2 to 7 are ordered by dependency: tests first, then fix, then harden, then optimise. Don't optimise before the tests exist.

## What the audit found

Read from `src/` as of commit `939d1ee`. Concrete bugs, so they're not rediscovered later:

**Correctness**
- `document.readyState === "completed"` is never true (the value is `"complete"`), so an instance created after load waits for a `load` event that has already fired and never initialises. This is probably the most visible bug for late-created instances.
- `getNodeData(n)` references an undefined `node` (its `findIndex` callback shadows `n`), so `distanceFrom()` always throws.
- `removeStyleProp()` checks `eff["type"]`, which doesn't exist (`hasStyleProp` uses `func`). It also splices an array while iterating forwards, and doesn't remove the per-node `styles` entries, so indexes drift.
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
- `package.json` version is still `v4.0.0-alpha1` (with the `v`); fix in Session 8.

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

- Fix the `readyState` bug, `getNodeData`, `removeStyleProp`, `setCoords`, `runoff` of 0, `lastDelta` initialisation, the shared `params` object, and the jitter lifecycle.
- Add `destroy()`: stop the loop, remove every listener (stable bound references, or an `AbortController`), and restore the nodes' original inline styles (the original `cssText` is already captured). Add `pause()` and `resume()`.
- Make instance creation safe at any point in the page lifecycle and on import without a DOM (SSR-safe: no `window` or `document` access at module scope).
- Accept a NodeList, an array, or a single Element for `nodes`.
- Test with jsdom, faking `getBoundingClientRect` and `requestAnimationFrame`.

**Handoff (2026-10-16):**
- Done: every Correctness bullet except the ones explicitly owned by later sessions (z-index side effect: Session 4; layout thrash in `setCenterPoints` and per-frame allocation: Session 5). The `params` object is copied (own properties only); nodes data is built in one place (`#createNodeData`), so jitter and style values survive `nodes` being reset. `runoff` 0 is a hard edge; the default stays **100** (the README's "0" is wrong; fix in Session 9). `lastDelta` starts `undefined` (first frame = current distance) or 1 with `primeDistances`.
- Lifecycle: `destroy()` (AbortController for all listeners, cancels rAF and the reflow timer, restores `cssText`), `pause()`/`resume()`, `paused`/`destroyed` getters. One rAF clock; `FPS` is now a rAF throttle (pulled forward from Session 5 because it was the cleanest fix for the double-drive bug). `ready` fires in a microtask, or on `load` while loading. No synthetic `mousemove`; with nothing to track nodes rest at the far value and `pointer` is `null`.
- `nodes` accepts NodeList, HTMLCollection, array or Element (deduped); dropped nodes get their `cssText` back. `target` must be an `Element`. `jitterMethod` is validated in its setter (Session 2's note is done). `Style` gained a `name` getter (preset name, else `func ?? rule`) used by `hasStyleProp`/`removeStyleProp`, which also match `func` for compatibility.
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
- For later: Session 6 switches `mousemove` to Pointer Events; update `tests/bench.html` (it dispatches `mousemove`). Session 9: document `will-change: transform` / `contain` guidance (not applied automatically), that animating layout properties (custom `width`, `letterSpacing`) makes `ResizeObserver` remeasure every frame, and that `setCenterPoints()` is only needed for movement the instance can't see (e.g. CSS animations of the nodes' positions). The first `ResizeObserver` callback causes one redundant remeasure (and `reflow`) just after `ready`. It's harmless; it could be skipped later.

## Session 6: Accessibility

- Honour `prefers-reduced-motion`: by default, snap to the settled state or disable the effect, with an option to override, and react to the media query changing live.
- Pointer Events instead of `mousemove`: touch and pen support, plus `pointerleave` and `blur` handling so the effect settles when the pointer leaves.
- Keyboard and focus: an option to treat the focused element as the target (`target` already supports an arbitrary element, so this may be mostly documentation and an example).
- Don't hide information from assistive tech: the effect only changes visual style, so confirm it never touches `aria-*`, `hidden`, `tabindex` or the DOM structure, and test that opacity and blur ranges don't destroy a text label's contrast (document recommended limits and WCAG criteria 1.4.3, 2.2.2 and 2.3.3).
- A visible and programmatic way to pause or stop the effect (`pause()` from Session 3), with example markup for a "pause animations" control.
- Run an automated check (axe-core in a demo page) and a manual screen reader pass on one demo.

**Handoff:** _(fill in)_

## Session 7: Public API, events and types

- Settle the 4.0 public surface and mark what's private. Finish or remove the unfinished stubs (`addProperty`, `hasProperty`, `removeProperty`, `getCoords` and `setCoords` naming, `totalNodes`), and make `updatePointer`, `reflowEvent` and `update` private or clearly documented. The public name `update` is currently callable with a bogus timestamp.
- Document the events (`ready`, `redraw`, `reflow`), whether they bubble, and what the payload is. Consider adding `CustomEvent` details, and stop dispatching `redraw` every frame unless something is listening.
- Ship TypeScript declarations (`.d.ts`, written by hand or generated from JSDoc with `tsc --allowJs --declaration`) and test them with a small `tsd` or `tsc` check.
- Pin the API in tests, so changes later are deliberate.
- Decide how the 4.1 to 4.3 roadmap features will fit (multi-value properties, per-property parameters, multi-point animations), so 4.0 doesn't paint them into a corner. Record the decision only; don't build them.

**Handoff:** _(fill in)_

## Session 8: Build and packaging

- `package.json`: `exports` map, `files`, `sideEffects: false`, `types`, `module`, `unpkg` and `jsdelivr`, and correct engines. Matching version in README, source header and `package.json`.
- Outputs: an ES module (`dist/proximity-effect.mjs`) and a minified classic script that sets a global `ProximityEffect` (keeps the bare unpkg URL working for existing installs). Source maps. Check the size against the old build and compare with `npm pack --dry-run`.
- A `dist.test.js` that loads the built files (as wrap-chars does), to catch packaging mistakes.
- Decide on `dist/` committed versus built in CI and on publish. Add provenance to the npm publish workflow if publishing from CI.
- Confirm the old file names (`dist/ProximityEffect.js`, `.min.js`) still resolve for people who hot-link them, or document the change clearly.

**Handoff:** _(fill in)_

## Session 9: Documentation and demos

- Rewrite the README: install (ESM, CDN, classic script), a quick start that works when pasted, the full parameter table (correct defaults, correct method names), the preset style list, accessibility notes, browser support, and licence.
- Replace the unfinished wiki API page with a complete API reference in the repo (generated from JSDoc, or hand-written Markdown), covering every parameter, property, method and event. Fix the placeholder JSDoc (`XXXXX`, "Did this work?", empty descriptions).
- A migration guide (3.x to 4.0) and a CHANGELOG in Keep a Changelog format.
- Turn `tests/*.html` into tidy, accessible demos: consistent markup, real titles and alt text, `lang`, reduced-motion respected, and delete or merge the duplicates (`x1`/`x2`, `video`/`video2`, etc.). Decide what the live site at lab.adasha.com should show.
- Remove the stale generated `docs/v3.*` folders.
- `CONTRIBUTING.md`, plus a check that the issue templates are current.

**Handoff:** _(fill in)_

## Session 10: Release

- Full pass: lint, tests, build, `npm audit`, `npm pack --dry-run`, and install the packed tarball into a scratch project (ESM, classic script and TypeScript consumers).
- Final cross-browser check of the demos (Chrome, Firefox, Safari, mobile).
- Confirm CHANGELOG, README and versions agree. Tag and publish (**the user publishes; Claude prepares**). Update the live demo site.
- Review remaining TODOs and open issues, and note anything deferred to 4.1.
- Consider an explicit posterise option (quantised steps), replacing what low `accuracy` did by accident. Discuss the design first; it can be added earlier if that turns out simpler.

**Handoff:** _(fill in)_

## Notes for every session

- Work on the `4.0` branch; commit at the end of each session with a clear message. Don't push or publish without asking.
- Keep the zero-runtime-dependency property.
- Every bug fix gets a test. Every public change gets a CHANGELOG line (start the file in Session 1 so entries accumulate).
- If a session is running long, stop at a clean boundary, write the handoff, and carry the remainder into the next session rather than rushing.
