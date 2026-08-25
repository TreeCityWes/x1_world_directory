import { describe, expect, it } from "vitest";
import {
  DEX_GATE_DMG_BASE,
  DEX_GATE_DMG_SPREAD,
  SITE_KIND_DIM_BASE,
  siteKindDim,
} from "@/lib/siteCapture";

describe("siteKindDim", () => {
  it("is full strength on the first same-kind capture", () => {
    expect(siteKindDim(1)).toBe(1);
    expect(siteKindDim(0)).toBe(1);
  });

  it("decays geometrically with SITE_KIND_DIM_BASE", () => {
    expect(siteKindDim(2)).toBeCloseTo(SITE_KIND_DIM_BASE, 10);
    expect(siteKindDim(3)).toBeCloseTo(SITE_KIND_DIM_BASE ** 2, 10);
    expect(siteKindDim(5)).toBeCloseTo(SITE_KIND_DIM_BASE ** 4, 10);
  });

  it("is stricter than the old 0.82 curve so permanent-stat routes dilute faster", () => {
    // 4th same-kind: 0.72^3 ≈ 0.373 vs 0.82^3 ≈ 0.551
    expect(siteKindDim(4)).toBeLessThan(Math.pow(0.82, 3));
    expect(SITE_KIND_DIM_BASE).toBeLessThan(0.82);
  });
});

describe("dexGate dmg stack", () => {
  it("nerfs mean first-capture add below the prior ~10.5%", () => {
    const mean = DEX_GATE_DMG_BASE + DEX_GATE_DMG_SPREAD / 2;
    expect(mean).toBeLessThan(0.105);
    expect(DEX_GATE_DMG_BASE).toBeLessThan(0.09);
  });
});
