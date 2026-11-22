# 4.1 plan

**Done:** released as 4.1.0 on 2026-11-22 (#29 to #34). This is kept as a record of how it was planned, so line links point at the code as it was then.

The four 4.1 items from the README roadmap, put in build order. Stage 1 is a refactor that stages 2 and 3 depend on; stage 4 doesn't depend on anything and can be done at any point. Each stage is meant to be its own PR into a `release/4.1` branch, with its own tests and doc changes, so `master` only gets 4.1 once all four are finished.

| Stage | Item | Depends on | Size |
| --- | --- | --- | --- |
| 1 | Jitter and scatter kept as unit random values | none | S–M |
| 2 | `updateStyle(name, keyframes)` | 1 | S |
| 3 | `scaleEffect` parameter | 1 | M |
| 4 | `pointerLeave: "hold" \| "rest"` | none | M |
| 5 | Release: docs, types, demos, changelog | 1–4 | S |

## Stage 1: unit random values

**Goal:** changing `jitter`, `jitterX`, `jitterY` or a style's scatter changes how far nodes move without picking new random amounts.

**Why first:** `updateStyle()` (stage 2) needs to keep each node's scatter roll when keyframes change, and `scaleEffect` (stage 3) needs to multiply jitter and scatter at the point of use. Both are simple once the roll and the amount are kept apart.

**How it works today:**

- `#randomJitter()` ([ProximityEffect.js:1825](../src/ProximityEffect.js#L1825)) rolls `random(jitter + jitterX, method)` straight into pixels, and every jitter setter calls `#calculateJitters()`, which re-rolls every node.
- `#scatterValues(style)` ([ProximityEffect.js:1809](../src/ProximityEffect.js#L1809)) rolls scatter into the final near and far values when a style or node is added.

**Change:**

- `AdashaUtils.random(v, m)` scales linearly with `v` for both methods (uniform is `(r-0.5)*v`; normal is the mean of six such terms), so `random(v) === v * random(1)`. Store `random(1, method)` per node and multiply later. Rolls already made keep the same distribution.
- Node data gets `jitterUnit: {x, y}`, always rolled, even when jitter is 0, so turning jitter on later uses the roll that's already there.
- Each node's style entry gets `nearUnit` and `farUnit`, always rolled, so a keyframe that gains scatter in `updateStyle()` has a roll ready. Keep the resolved `near` and `far` values cached next to them, so `#writeStyles()` stays as fast as it is.
- Jitter setters call `#applyOffsets()` instead of `#calculateJitters()`.
- `jitterMethod` still re-rolls, since a new method needs a new shape. Each method needs its own unit roll, so changing the method has to replace it.
- `getNodeData().jitter` and `.styles` keep their current shape and report resolved pixels and values, so nothing public changes there.

**Watch for:** rolling units for every keyframe changes how many times, and in what order, `Math.random` is called. The tests that mock it at [proximity-effect.test.js:235](../tests/proximity-effect.test.js#L235), [:253](../tests/proximity-effect.test.js#L253) and [:510](../tests/proximity-effect.test.js#L510) return a constant, so they should still pass, but check any test that depends on call order.

**Tests:**

- Set `jitter` to 10, then 20: each node's jitter doubles and its sign stays the same.
- Changing `jitterMethod` gives new jitter.
- A node added after a jitter change gets jitter at the current size.

**Docs:** [API.md:112](API.md#L112) ("Setting any of the jitter properties picks new random amounts") and [API.md:278](API.md#L278) both change. Changelog entry under *Changed*.

## Stage 2: `updateStyle(name, keyframes)`

**Goal:** change a style's keyframes in place, keeping its position in the stack and each node's scatter rolls.

**API:**

```js
updateStyle(name, keyframes) // → boolean, true if anything was updated
```

- `name` is matched the same way as in `hasStyle()` and `removeStyle()` (`#styleMatches`). Every matching style is updated, as `removeStyle()` removes every match.
- `keyframes` is checked as `addStyle()` checks it, against the existing style's `min`, `max` and rule. Build every replacement `Style` before changing anything, so a bad call leaves the stack as it was (same pattern as `addStyle()`).
- The property can't be changed here: remove and add a new style to do that. Per-style params stay as they are (`id` is kept).

**Change:** `Style` is immutable (private fields, copying getters), so build a new `Style` from the old one's property description plus the new keyframes, swap it in at the same index, re-resolve each node's cached `near` and `far` from its existing units, then `#invalidate()`. `#groupStyles()` doesn't need to run, since the rule and func stay the same.

**Tests:** scatter rolls survive an update; returns false for a missing name; a bad keyframe throws and leaves the style unchanged; with several matches, all are updated; throws once the instance is destroyed; nodes are redrawn after an update.

**Types:** add to `ProximityEffect.d.ts`, plus a line in `tests/types/api.ts`.

## Stage 3: `scaleEffect`

**Goal:** one multiplier that shrinks or grows an effect with its container, without the caller recomputing every pixel value.

**Decision: a plain number for 4.1.** The other idea in the roadmap, px values that accept CSS lengths (`"5vw"`, `"2rem"`), needs lengths resolved against a context and re-resolved when it changes, and it overlaps with the 4.2 multi-value work. A number covers the lab's small-screen case (`effect.scaleEffect = container.clientWidth / 800` in a `ResizeObserver`), and CSS lengths can come later without changing it.

**API:** `scaleEffect`, a getter and setter plus a constructor param. Default `1`. Must be finite; negative values become 0, as other numeric params are clamped. Getters such as `threshold` and `jitter` still return the unscaled values you set. It's called `scaleEffect` rather than `scale` so it can't be confused with the `scale` preset style.

**What it multiplies, at render time:**

| Value | Where |
| --- | --- |
| `threshold`, `runoff` | the destructure in `update()` ([ProximityEffect.js:2076](../src/ProximityEffect.js#L2076)) |
| `offsetX`, `offsetY` and jitter | `#applyOffset()` ([ProximityEffect.js:1711](../src/ProximityEffect.js#L1711)): `measured - offset * scaleEffect + jitterUnit * (jitter + jitterX) * scaleEffect` |
| px style values and their scatter | when each node's cached `near` and `far` are resolved: `translateX/Y/Z`, `blur`, and custom styles with `unit: "px"` |

`min` and `max` are clamped before scaling, since they're in the style's own units at the size it was written for.

`perspective` isn't scaled: it depends on how far away the viewer is, not on the size of the elements.

**Change:** setting `scaleEffect` re-resolves the cached px style values, calls `#applyOffsets()` and redraws. No remeasure is needed.

**Tests:** threshold and runoff edges move with `scaleEffect`; offsets, jitter and px translate values scale; `perspective` doesn't; deg and % values don't; min/max are clamped before scaling; an invalid value throws and leaves the old one; 0 works.

## Stage 4: `pointerLeave: "hold" | "rest"`

**Goal:** on touch screens a tap leaves the effect where the finger was, instead of flickering back to rest.

**How it works today:** `#pointerOut()` ([ProximityEffect.js:2019](../src/ProximityEffect.js#L2019)) clears `#pointer` when `relatedTarget` is null (the pointer left the page, or a touch or pen lifted), and so does `blur`. `#pointer` is in viewport coordinates.

**API:** `pointerLeave`, a getter and setter plus a constructor param, `"rest"` (default, today's behaviour) or `"hold"`. Anything else throws a `RangeError`, as for `direction`.

**Behaviour with `"hold"`:**

- When a touch or pen lifts (`pointerType !== "mouse"`), keep the last point in page coordinates (`clientX + scrollX`), and convert it back to viewport coordinates in `#targetPoint()` each frame. A held point stays on the same spot on the page while it scrolls, and `#followScroll()` already reads the page scroll before that. A live pointer stays in viewport coordinates as it is now, since a mouse that isn't moving stays put on screen while the page scrolls under it.
- A mouse leaving the page still rests: `"hold"` only applies to touch and pen, since a mouse that leaves and comes back is a different thing from a tap.
- Leave room for a mouse version later (holding the point where a mouse button was released, or holding only while it's down). Keep the "should this lift be held" decision in one private method that checks `pointerType`, and keep `pointerLeave` a string, so a later value such as `"hold-mousedown"` (name to be decided) can be added without changing what `"hold"` does.
- `blur` still rests in both modes, since switching tabs means you've stopped looking.
- The next `pointerdown` or `pointermove` replaces the held point.
- `pointercancel` fires when a touch turns into a scroll. It's followed by `pointerout`, so it's held as well, which is what we want.
- `pointer` returns the held point in viewport coordinates, so it's no longer `null` after a touch lifts in this mode. Update [API.md:83](API.md#L83).
- Setting `pointerLeave = "rest"` drops a held point, so there's no separate method for letting go.

**Interactions:** `setCoords()` and `target` still take over first (`#targetPoint()` order doesn't change). Reduced motion `"rest"` still wins.

**Tests:** a pointer event with `pointerType: "touch"` and then `pointerout` with `relatedTarget: null` keeps the point; the held point moves with the page when it scrolls; the mouse still rests; `blur` rests; `"rest"` mode is unchanged; switching to `"rest"` drops the point; invalid values throw.

**Demo:** add a "tap and hold" toggle to `demos/playground.html`, and check on a real phone (the lab's case).

**Added after the phone check: `touchDrag`.** Holding works, but a finger dragging over the effect scrolls the page, and the browser then cancels the pointer, so the point can't follow. The lab sets `touch-action: pinch-zoom` on the nodes' common parent, or on the nodes when that parent is taller than 80% of the window. The library takes the element explicitly instead of guessing: `touchDrag: true` sets it on each node, an element sets it on that element (so gaps between nodes count), and `false`/`null` gives the original back, as `destroy()` does. A separate param rather than part of `"hold"`, since blocking scrolls is a separate choice from keeping the point.

## Stage 5: release

- `ProximityEffect.d.ts` and `ProximityEffect.global.d.ts`: `scaleEffect`, `pointerLeave`, `touchDrag`, `updateStyle`. `tests/types/api.ts` covers each one.
- `docs/API.md`: new rows in the parameter tables, an `updateStyle()` section, and the jitter, scatter and `pointer` wording from stages 1 and 4.
- `README.md`: move the four 4.1 roadmap lines into the version history (`v4.1`); keep the 4.2 and 4.3 lines.
- `.github/ISSUE_TEMPLATE/feature_request.md`: remove the 4.1 items from its "already planned" list.
- `CHANGELOG.md`: `[4.1.0]` with *Added* (`scaleEffect`, `pointerLeave`, `touchDrag`, `updateStyle()`) and *Changed* (jitter and scatter no longer re-roll). No breaking changes. The re-roll change is a change in behaviour, but no API changes and no documented promise is broken (the docs only described it), so a minor release fits.
- `npm run lint`, `npm test`, `npm run typecheck`, `npm run a11y` and `npm run bench`; size check against the "around 8KB gzipped" claim in the README.
- Bump `package.json` to `4.1.0`, tag, publish.

## Not in 4.1

Multi-value properties (colours) and `steps` (posterise) are planned for 4.2 with per-style parameters. Multi-point animations are planned for 4.3. CSS-length values for `scaleEffect` (see stage 3) could join 4.2's multi-value work.
