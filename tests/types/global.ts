// Type checks for src/ProximityEffect.global.d.ts, run with `npm run typecheck`.
// Uses the global from the classic script build, with no import.

/// <reference path="../../src/ProximityEffect.global.d.ts" />

const fx: ProximityEffect = new ProximityEffect(document.querySelectorAll("div"), { threshold: 50 });
fx.addStyle("opacity", [100, 20]);
fx.addEventListener("ready", () => fx.pause());
const total: number = fx.totalNodes;
void total;

// @ts-expect-error unknown preset
fx.addStyle("nope", [0, 1]);

// @ts-expect-error read-only
fx.paused = true;
