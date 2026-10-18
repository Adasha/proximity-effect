/*
 * Declares the global ProximityEffect that the classic script build
 * (dist/proximity-effect.min.js) sets. Reference it from code that uses the
 * global instead of importing the module:
 *
 *     /// <reference types="proximity-effect/global" />
 *
 * scripts/build.js copies this to dist/proximity-effect.global.d.ts.
 */

import type ProximityEffectClass from "./ProximityEffect.js";


declare global
{
    /** Set by the classic script build. */
    var ProximityEffect: typeof ProximityEffectClass;
    type ProximityEffect = ProximityEffectClass;
}

export {};
