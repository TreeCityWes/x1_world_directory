/**
 * Same-kind site-capture diminishing returns — permanent-stat route balance.
 *
 * Keep free of React so unit tests can pin the curve without mounting GameLayer.
 */

/** Geometric base: nth same-kind capture multiplies by BASE^(n-1). Was 0.82. */
export const SITE_KIND_DIM_BASE = 0.72;

/**
 * Fractional damage add range for dexGate before dim (mean ~9.25%).
 * Slightly below the prior 0.09+rng*0.03 (~10.5% mean).
 */
export const DEX_GATE_DMG_BASE = 0.08;
export const DEX_GATE_DMG_SPREAD = 0.025;

/**
 * Multiplier for the nth capture of the same landmark kind (1-indexed).
 * First capture is full strength (1); repeats decay geometrically.
 */
export function siteKindDim(count: number): number {
  if (count <= 1) return 1;
  return Math.pow(SITE_KIND_DIM_BASE, count - 1);
}
