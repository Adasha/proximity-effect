# 4.2 plan

**Status:** design notes only, not yet put into stages. The README's 4.2 items are: multi-value CSS properties (colours), a posterise option (`steps`) and per-property parameters. The notes below come from looking at how the Flash version's "drive a movieclip's frame from proximity" feature could come back.

## Design principle

Prefer general building blocks that allow several approaches over features that build one technique into the code. Each feature below should be useful on its own, and frame-style animation should come from combining them, not from a dedicated "sprite" or "Lottie" mode.

## Frame-driven animation: what it needs

The Flash version could call `gotoAndStop()` on a movieclip from the proximity value. The web equivalents all come down to "pause an animation and set its playhead":

| Approach | How it's driven | What the library needs |
| --- | --- | --- |
| Sprite sheet | `background-position` stepped by frame width | `steps` (per style), see below |
| CSS `@keyframes` | paused animation with `animation-delay: calc(var(--proximity) * -1s)` | custom property output |
| Web Animations API | `animation.currentTime = d * duration` on `element.getAnimations()` | per-node value hook, or a later built-in scrub |
| Lottie, Rive, SVG SMIL, `<video>`, canvas sequences | `goToAndStop(frame)`, a state machine input, `setCurrentTime()`, `currentTime`, draw frame N | per-node value hook |

No browser has a pointer-driven animation timeline (only scroll- and view-driven ones), which is the gap this library fills.

The three building blocks, in order of how much they enable:

1. **Per-node value hook.** Gives user code each node's **eased** value, so it can drive anything. Today `redraw` plus `distanceFrom()` comes close, but `distanceFrom()` is the value *before* easing ([API.md:243](API.md#L243)), so a hook built on it ignores `attack` and `decay`. Options: expose the eased value (for example in node data or a `distanceFrom(node, { eased: true })`), and/or a per-node callback called from `#writeStyles()`. Decide whether it reports the posterised value when `steps` is on (it probably should, so everything driven from the effect steps together).
2. **CSS custom property output.** Let a custom style write to `--name`. That needs two changes: `CSS_PROPERTY` in [StyleClass.mjs:18](../src/StyleClass.mjs#L18) has to accept `--name`, and `#writeStyles()` ([ProximityEffect.js:2477](../src/ProximityEffect.js#L2477)) has to use `style.setProperty()`, since `style[rule] = value` doesn't work for custom properties. A unitless `--proximity` from 0 to 1 then lets CSS do the rest with `calc()`, including scrubbing paused `@keyframes`. Lifts the "custom properties aren't supported" limit in [README.md:339](../README.md#L339).
3. **`steps` (posterise).** See below. Combined with 1 and 2, it gives stepped versions of every approach in the table.

A built-in Web Animations scrub mode (point a style at a named CSS animation and set `currentTime`) could follow later. It's the one place where the library doing the work beats a hook, since it would handle multi-step keyframes, colours and easing without the single-number limit. But it isn't needed for 4.2 if the hook exists.

## `steps` (posterise): design notes

The 4.0 proposal (in the untracked PLAN.md, Session 10 handoff) was a global integer `steps`, 0 = off, snapping the eased distance to N even steps. Sprite sheets show what the design has to get right:

```js
// F frames of width W in a horizontal strip
effect.addStyle({ rule: "backgroundPositionX", unit: "px" },
                { near: -(F - 1) * W, far: 0, steps: F });
```

- **Count levels, ends included.** A sprite with F frames needs exactly F levels, from 0 to 1 inclusive. Say clearly what `steps: N` means. CSS `steps(n, jump-none)` already means this, so follow CSS's terms or at least match it. Consider allowing the other CSS jump terms later rather than now.
- **Per style as well as global.** A sprite style steps while scale or blur stays smooth, so `steps` belongs with 4.2's per-style params. A global `steps` can stay as the default that per-style values override.
- **Snap after easing.** Snap the eased distance (as proposed), so `attack` and `decay` still decide *when* the value changes, but no in-between values reach the property. Easing has to keep running on the unsnapped value, or it would stick at a step. Snap only the copy that's written. Only write when the snapped value changes, which also means fewer writes than smooth output.
- **Stay on the grid.** Two linear keyframes land on step boundaries. A non-zero `scatter` on a stepped style moves each node off the grid, and 4.3's multi-point keyframes could too if their stops aren't on step boundaries. Document both. Decide whether stepping applies to the distance (simple, as now) or to the output value. Distance is the general choice. Output-value stepping is only worth it if multi-point keyframes make it necessary.
- **Round stepped px output.** Float drift such as `-383.9999px` can show a one-pixel sliver of the next frame.
- **`zIndex`.** It's derived from the same distance ([ProximityEffect.js:2502](../src/ProximityEffect.js#L2502)). Decide whether it follows the global `steps`.
- **Performance note for the docs.** `background-position` repaints, unlike transforms and filters, but stepping means it repaints only at step boundaries.

## Per-style parameters: design notes

Per-style `threshold`, `runoff`, `invert`, `attack`, `decay` (and `steps`, above) are rejected today by `FUTURE_PARAMS` in [StyleClass.mjs:132](../src/StyleClass.mjs#L132). The cost is in semantics, not speed: the per-frame maths is tiny next to building style strings and the browser's restyle.

**Two kinds of parameter.** Today [update()](../src/ProximityEffect.js#L2388) works out one `hypot`, one normalised distance and one eased value (`lastDelta`) per node, then lerps each style in [#writeStyles()](../src/ProximityEffect.js#L2477).

| Param | Acts on | Needs its own easing state? |
| --- | --- | --- |
| `threshold`, `runoff` | the target distance `td` | Yes: a different `td` eases separately |
| `attack`, `decay`, `tolerance` | how `d` follows `td` | Yes |
| `invert` | the eased value | No: the `xor(td>last, invert)` rate choice makes inverted easing equal `1 - (uninverted easing)`, so it can be a flip at write time. Check how `primeDistances` interacts. |
| `steps` | the eased value | No: snap only the written copy |

**Channels.** Group styles by their resolved `(threshold, runoff, attack, decay, tolerance)`. Each distinct set is a channel with its own `lastDelta` per node. `hypot` still runs once per node. Each channel adds a subtract, divide, clamp and easing step.

- With no per-style params there's one channel, so the loop does exactly what it does now.
- Cost is about nodes x channels x ~10 flops: microseconds for 1,000 nodes and 3 channels. Memory is one number per channel per node.
- Writes can drop: only rewrite a rule group (such as the combined `transform`) if one of its members' channels changed, instead of rewriting the whole node.
- A slow-decay channel keeps its node, and the rAF loop, awake until it settles. That's the user's choice, but say so in the docs.

**Open questions.**

1. **Inheritance.** An unset per-style value follows the global one live, so `effect.runoff = 300` still reaches styles that don't set it. Rebuild the channel table in [#groupStyles()](../src/ProximityEffect.js#L1965) and when a relevant global setter runs. `scaleEffect` applies to per-style `threshold` and `runoff` too.
2. **Distance APIs.** `distanceFrom()`, `getNodeData("distance" | "lastDelta")` and `zIndex` assume one distance per node. Simplest: they report the global channel, plus a per-style form such as `distanceFrom(node, { style: id })`. Design this with the per-node value hook above.
3. **Rest and change detection.** `#changed` and `#resting()` must cover every channel. Mostly falls out of setting `changed` per channel in the loop.
4. **`updateStyle()` moving a style between channels.** Seed the new channel from the style's current eased value to avoid a jump, or accept and document the jump.
5. **Per-style `direction`?** Not in the list, but cheap: compute `hypot` or the single axis lazily per channel.

**Size.** Roughly 60 to 100 lines for the loop and channel table, a similar amount for validation, inheritance and API changes (including `.d.ts`, the API.md limit at [API.md:290](API.md#L290) and the `RangeError` row), and more again in tests: inheritance, live global changes, mixed channels in one transform group, and rest detection.
