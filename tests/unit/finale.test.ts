import { describe, expect, it } from "vitest";
import {
  FINALE_HP_BASE,
  FINALE_HP_POWER_CAP,
  FINALE_MIN_LEVEL,
  FINALE_SITES_LEFT,
  WIN_TARGET,
  finaleHpMult,
  finalePower,
  shouldRequestFinale,
  winTarget,
} from "@/lib/finale";

describe("winTarget", () => {
  it("freezes at WIN_TARGET when more regions exist", () => {
    expect(winTarget(WIN_TARGET + 10)).toBe(WIN_TARGET);
  });

  it("clamps down when fewer regions are available", () => {
    expect(winTarget(WIN_TARGET - 5)).toBe(WIN_TARGET - 5);
    expect(winTarget(0)).toBe(0);
  });
});

describe("shouldRequestFinale", () => {
  const totalSites = 50;

  it("opens when remaining ≤ FINALE_SITES_LEFT and level ≥ FINALE_MIN_LEVEL", () => {
    expect(
      shouldRequestFinale({
        remaining: FINALE_SITES_LEFT,
        level: FINALE_MIN_LEVEL,
        totalSites,
      }),
    ).toBe(true);
    expect(
      shouldRequestFinale({
        remaining: FINALE_SITES_LEFT - 1,
        level: FINALE_MIN_LEVEL + 2,
        totalSites,
      }),
    ).toBe(true);
  });

  it("blocks early lucky captures below the soft level gate", () => {
    expect(
      shouldRequestFinale({
        remaining: FINALE_SITES_LEFT,
        level: FINALE_MIN_LEVEL - 1,
        totalSites,
      }),
    ).toBe(false);
    expect(
      shouldRequestFinale({
        remaining: 1,
        level: 1,
        totalSites,
      }),
    ).toBe(false);
  });

  it("does not open while plenty of sites remain even at high level", () => {
    expect(
      shouldRequestFinale({
        remaining: FINALE_SITES_LEFT + 1,
        level: 99,
        totalSites,
      }),
    ).toBe(false);
  });

  it("forces finale when the win target is met (below min level)", () => {
    expect(
      shouldRequestFinale({
        remaining: 0,
        level: 1,
        totalSites,
      }),
    ).toBe(true);
  });
});

describe("finaleHpMult", () => {
  it("uses named base + capped power", () => {
    expect(finaleHpMult(0)).toBe(FINALE_HP_BASE);
    expect(finaleHpMult(1)).toBe(FINALE_HP_BASE + 1);
    expect(finaleHpMult(10)).toBe(FINALE_HP_BASE + FINALE_HP_POWER_CAP);
  });
});

describe("finalePower", () => {
  it("grows with level, perms, upgrades, and difficulty", () => {
    const weak = finalePower({
      level: 1,
      permDmg: 0,
      damageUpgrades: 0,
      multishotUpgrades: 0,
      firerateUpgrades: 0,
      enemyMult: 1,
    });
    const strong = finalePower({
      level: 20,
      permDmg: 0.5,
      damageUpgrades: 5,
      multishotUpgrades: 3,
      firerateUpgrades: 4,
      enemyMult: 1.4,
    });
    expect(strong).toBeGreaterThan(weak);
    expect(weak).toBeCloseTo(0.09, 5);
  });
});
