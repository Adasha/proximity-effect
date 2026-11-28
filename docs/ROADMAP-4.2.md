# 4.2 plan

**Status:** agenda set 2026-11-28. Stage 1 done (#39). 4.2 is about **fixing known issues and letting other code work with the effect**. New effects (colours, `steps`, per-style params and the other ideas below) move to 4.3. No breaking changes.

As with 4.1, each stage is its own PR into a `release/4.2` branch, with its own tests, types and doc changes.

| Stage | Item | Kind | Depends on | Size |
| --- | --- | --- | --- | --- |
| 1 | `destroy()` and dropped nodes give back only what the instance wrote | Fix | none | S |
| 2 | `resting` getter, `wake`/`rest` and `beforeupdate` events | API | none | S |
| 3 | Read a node's eased value cheaply | API | none | S |
| 4 | CSS custom property output (`--name`) | Fix + API | none | S |
| 5 | Drive the effect from outside: `autoUpdate: false` and `update(time)` | API | 2 | M |
| 6 | Several instances on the same node | Fix | 1 | M–L |
| 7 | One shared scheduler for every instance on a page (stretch) | Fix (perf) | 2, 5, 6 | M–L |
| 8 | Look again at the two layout known issues | Fix | none | S each |
| 9 | Release: docs, types, demos, changelog | | 1–8 | S |

Stages 1 to 4 are small and independent, so they can go in any order or side by side. Stage 7 is the one that can slip to 4.3 without blocking anything else.

## Stage 1: give back only what was written

**Known issue:** `destroy()` puts back each node's whole original `cssText`, so inline styles the page's own code set since then are lost ([README.md:340](../README.md#L340)). Dropping nodes from `nodes` does the same ([#restoreInlineStyle()](../src/ProximityEffect.js#L2196)).

**Change:** put back, property by property, only the properties the instance has written (its style groups' rules, plus `z-index`, `touch-action`, and `perspective-origin` on the parent), using the per-rule originals that [#originalValue()](../src/ProximityEffect.js#L2183) already keeps. Remove the `style` attribute only if the node had none *and* it's empty afterwards. A property the page and the instance both write (such as `transform`) still goes back to its original: document that.

**Why first:** stage 6 needs `destroy()` to give back one instance's part and leave the others' alone.

**Tests:** an inline style set after construction survives `destroy()` and being dropped from `nodes`; a node with no `style` attribute is left with none; a property the instance wrote goes back to its original.

## Stage 2: rest state and a pre-frame hook

From the Dandelion gaps ([section 3](#3-hooks-for-outside-code) below):

- `resting`, a read-only getter, from [#resting()](../src/ProximityEffect.js#L1618).
- `wake` when the loop starts after resting, and `rest` when it settles and stops. Not dispatched by `pause()` and `resume()`, which already have `paused`.
- `beforeupdate`, dispatched at the start of each loop frame, before anything is read, so outside code (such as Dandelion's wind) can call `updateStyle()` or `setCoords()` and have it drawn that frame. Decide whether a listener can keep a resting effect awake (probably not: it can call `update()` or change something that wakes it).

**Tests:** event order over wake, frames and rest; no `rest` straight after `wake` when something keeps changing; `resting` matches the events.

## Stage 3: a node's eased value

`distanceFrom()` returns the value *before* easing ([API.md:243](API.md#L243)), so code built on it ignores `attack` and `decay`, and `getNodeIndexData(i, "lastDelta")` copies on every call.

- Add `valueFromIndex(index)` and `valueFrom(node)` (names to settle): the eased value the styles were drawn with, with `invert` applied, no copying.
- Keep `distanceFrom()` as it is, and say plainly in API.md which one to use for what.
- Design it so a per-style form (`valueFrom(node, { style: id })`) fits when 4.3's per-style params arrive, and so it can report the stepped value once `steps` exists.

## Stage 4: CSS custom property output

**Known issue:** custom properties (`--foo`) can't be animated ([README.md:339](../README.md#L339)). Let a custom style's `rule` be `--name`: accept it in `CSS_PROPERTY` ([StyleClass.mjs:18](../src/StyleClass.mjs#L18)), and write it with `style.setProperty()` in [#writeStyles()](../src/ProximityEffect.js#L2477), since `style[rule] = value` doesn't work for custom properties. Keep 4.0's validation: the name must be a valid custom property name, and the value is still a number plus a known unit.

This is the main integration hook for CSS: a unitless `--proximity` from 0 to 1 lets a page do the rest with `calc()`, scrub a paused `@keyframes` (see [Frame-driven animation](#frame-driven-animation-what-it-needs)), and do **colours** with `color-mix(in oklch, red calc(var(--proximity) * 100%), blue)`. That workaround is why multi-value properties can wait for 4.3. Add a demo for it.

Check: custom properties don't take part in measuring (they're paint-only unless the page uses them in layout, which is the page's business: document it), and `destroy()` removes them (stage 1).

## Stage 5: driving it from outside

`autoUpdate: false` (constructor param and setter) stops the instance running its own rAF loop, and `update(time)` draws a frame at a given time, for GSAP tickers, game loops or the page's own scheduler. Easing needs the time step, so `update(time)` uses it the way the loop uses rAF's timestamp. Decide:

- whether `update()` dispatches `redraw` (and `beforeupdate`) when the instance isn't driving itself. Probably yes when `autoUpdate` is off, so listeners don't care who drives it.
- how it meets `pause()`, `FPS` and sleep: with `autoUpdate` off, `FPS` does nothing, `resting` still reports, and `wake` tells the driver it has work to do.

## Stage 6: several instances on the same node

The bug in [section 1](#1-several-instances-on-the-same-node-a-bug-before-an-optimisation) below: writes clobber each other's `transform` and `filter`, and each instance measures the node with the other's output on it. Fix it with the module-level registry described there. Add a known issue for anything left over, such as `perspective` and `zIndex`.

## Stage 7: one scheduler for every instance (stretch)

[Section 2](#2-a-shared-scheduler-for-all-instances-on-a-page) below. It fixes the forced layout per instance per frame when instances use a `target`, and uses stage 6's registry. With it, stage 5's outside driver can drive the shared scheduler instead of each instance. Measure first with a multi-instance `npm run bench` case. If the gain is small, move it to 4.3.

## Stage 8: the two layout known issues

- **Size change made elsewhere in the same frame** ([README.md:342](../README.md#L342)). Find out why the `ResizeObserver` misses it (probably the instance's own measuring pass hides it), and fix it if that's cheap. Otherwise keep it listed.
- **`position: fixed` inside a filtered node** ([README.md:341](../README.md#L341)). That's how browsers place fixed elements inside a filter. See whether taking `filter` off while measuring fixes it without adding a layout. If not, keep it listed with the workaround.

## Moved to 4.3

- Multi-value CSS properties such as colours (#13). Stage 4 covers colours through CSS until then.
- `steps` (posterise), and per-style parameters (#14). The design notes below stay for 4.3. Stages 3 and 6 are designed with them in mind.
- Reading a missing keyframe from the element's own style (#12).
- From the further ideas below: pointer velocity, falloff curve, distance metric, several points, spring easing, pluggable outputs, pausing when off-screen, and a Web Animations scrub mode. Points without DOM nodes is probably 5.0.

## Design notes

These are the notes the agenda came from. The frame-driven, `steps` and per-style notes are now mostly for 4.3, apart from the per-node value (stage 3) and custom property output (stage 4).

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

## Further ideas: several instances, outside code, broader features

**Status:** ideas only, not yet prioritised or put into stages. Gathered 2026-11-28 after building the lab's Dandelion demo (five instances, pointer-speed "wind" fed in through `updateStyle()`). Suggested order: 1, then 2, then 3's rest events and pre-frame hook; the rest when they fit.

### 1. Several instances on the same node (a bug before an optimisation)

Two instances on one node break each other today:

- **Writes clobber.** [#writeStyles()](../src/ProximityEffect.js#L2477) sets `style[group.rule]` to a whole string, so for `transform` and `filter` the last instance to write wins: one instance's `scale` and another's `rotate` never show together. Dandelion avoided this by giving each instance its own elements (the flower's lean is on a wrapper).
- **Measuring sees the other's output.** [#measure()](../src/ProximityEffect.js#L1646) takes off only its own box-moving rules. If A animates only `filter` and B animates `transform` on the same node, A measures the node where B has moved it, so A's effect follows B's output and can feed back on itself.

Fix with a module-level registry, a `WeakMap` from node to the instances on it:

- **Compose writes.** For a node with several owners, build one `transform` and one `filter` from every instance's pieces, in the order the instances were created (stacking means adding up). One instance per node keeps today's path.
- **Measure once per node**, with every owner's box-moving rules taken off: correct, and shared nodes are measured once instead of once per instance.
- **`destroy()`** gives back only that instance's part, and rewrites the node from the instances that are left.
- **Docs:** once per-style params (channels, above) exist, say that same nodes plus same target should be one instance with per-style params. Stacking is then mainly for different targets.

Open: whether `perspective` and `zIndex` compose (probably the first owner's wins, with a warning), and whether shared nodes also share the distance maths. Only worth it when instances share nodes *and* target, since the maths is tiny next to the writes.

### 2. A shared scheduler for all instances on a page

No API change. Each instance has its own rAF loop ([#start()](../src/ProximityEffect.js#L1457)), seven document/window listeners, a `ResizeObserver` ([line 1400](../src/ProximityEffect.js#L1400)) and a `matchMedia` query. With several instances, each reads then writes in turn. With a `target`, [update()](../src/ProximityEffect.js#L2388) reads `getBoundingClientRect()` after another instance has already written that frame, which forces a fresh layout per instance per frame.

- One loop does every awake instance's reads (scroll, target rects, measurements), then every instance's writes.
- Shared listeners, `ResizeObserver` and `matchMedia`. Each instance registers with the scheduler and leaves it on `destroy()`.
- Keep each instance's own sleep/wake: the shared loop runs only while some instance is awake. `FPS` per instance becomes "skip ticks".
- Measure with several instances and with one, using `npm run bench` with an extra multi-instance case.

### 3. Hooks for outside code

Gaps hit while building Dandelion:

- **Rest state.** The demo polls every node's `lastDelta` each frame to see whether an instance is moving, which is O(n) per instance per frame in user code. The instance already knows ([#resting()](../src/ProximityEffect.js#L1618)): add a `resting` getter and `wake`/`rest` events.
- **Pre-frame hook.** The demo's wind loop runs in its own rAF, so its `updateStyle()` calls land a frame before or after the effect's frame. A `beforeupdate` event, or the shared scheduler (2) offering a tick to subscribe to, keeps outside code in step.
- **Driving it from outside.** `autoUpdate: false` plus `update(time)`, for GSAP tickers, game loops or a page's own scheduler. Check how this works with `pause()` and the sleep logic.
- **Pointer velocity.** Momentum and wind effects all work out pointer speed themselves. Expose `pointerVelocity` (px/ms, smoothed), on the instance or the shared input.
- **Fewer copies in hot paths.** `nodes` and `getNodeIndexData()` return copies, which is fine for safety but allocates per call when used every frame. The rest events above remove the main reason to call them each frame. Otherwise consider a cheap read such as `easedValue(i)`, designed with the planned per-node value hook.

### 4. Broader features

- **Falloff curve.** Between `threshold` and `threshold + runoff`, the value changes linearly. A `falloff` option, a CSS easing string (`"ease-in"`, `cubic-bezier()`, `linear()`) or `t => t`, would reshape any effect cheaply. Overlaps with 4.3's multi-point keyframes but is much lighter. Decide whether it applies before or after easing (before, to the target distance, seems right).
- **Distance metric.** Distance to the node's box edge instead of its centre (large buttons and paragraphs feel wrong measured from the centre), elliptical distance, or a `distance(dx, dy, rect)` function. Box-edge needs the measured size as well as the centre.
- **Several points.** Follow several touches, or several targets, combined with `combine: "nearest" | "max" | "sum"`. Today only the primary touch counts. (Different from 4.3's multi-point *keyframes*.)
- **Spring easing.** Stiffness and damping as an alternative to `attack`/`decay`, so values can overshoot and settle. Or make easing a pluggable step function `(last, target, dt) => next`, which covers springs and anything else. It needs velocity per node (per channel) and its own rest test.
- **Pluggable outputs.** `ProximityEffect.registerStyle(name, definition)` for new presets (validated like custom styles), and a per-style `write(node, value)` for outputs that aren't CSS, such as SVG attributes (`r`, `stroke-dashoffset`). With the per-node value hook, narrow uses can then live outside the library. Keep 4.0's security rule: built-in writes stay validated, and a user `write` is the user's own code.
- **Points without DOM nodes.** Accept `{ x, y }` points (canvas or WebGL particles) and report values back, with no DOM writes. This means splitting the distance "field" from the DOM writer. It's the largest change here, so it's probably 5.0, but designing 1 to 3 with this split in mind keeps it possible.
- **Pause when off-screen.** An `IntersectionObserver` stops an instance's loop while none of its nodes are in view. It helps pages with several effects below the fold.
