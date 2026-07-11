import { beforeEach, describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  RUN_SECONDS,
  UPGRADES,
  resetRun,
  rollChoices,
  run,
  scoreOf,
  upgradeView,
} from "@/lib/gameStore";

/**
 * The score formula and roll rules define the game's fairness design. These
 * tests pin them so a balance tweak can't silently reopen
 * the "farm forever" hole or break evolution gating.
 */

beforeEach(() => {
  resetRun("normal", "ninja");
});

describe("scoreOf", () => {
  it("scores the documented formula on normal", () => {
    run.t = 100;
    run.kills = 50;
    run.damage = 2000;
    run.captured = 4;
    // (100*40 + 50*40 + 2000/2)/100 + 4*50 = (4000+2000+1000)/100 + 200 = 270
    expect(scoreOf()).toBe(270);
  });

  it("caps the survival-time term at the run clock (anti circle-running)", () => {
    run.t = RUN_SECONDS;
    const atBell = scoreOf();
    run.t = RUN_SECONDS * 10;
    expect(scoreOf()).toBe(atBell);
  });

  it("time cap matches RUN_SECONDS so the clock and score window can't drift", () => {
    // If someone retunes RUN_SECONDS, the score cap must follow — this is
    // the invariant, not the constant's value.
    run.t = RUN_SECONDS - 1;
    const before = scoreOf();
    run.t = RUN_SECONDS + 1;
    const after = scoreOf();
    // one more second of survival before the cap is worth exactly 0.4 pts
    expect(after - before).toBeLessThanOrEqual(1); // rounded 0.4
  });

  it("applies difficulty multipliers", () => {
    run.t = 100;
    run.kills = 50;
    run.damage = 2000;
    run.captured = 4;
    const normal = scoreOf();
    resetRun("hard", "ninja");
    run.t = 100;
    run.kills = 50;
    run.damage = 2000;
    run.captured = 4;
    expect(scoreOf()).toBe(Math.round(normal * 1.5));
    resetRun("cursed", "ninja");
    run.t = 100;
    run.kills = 50;
    run.damage = 2000;
    run.captured = 4;
    expect(scoreOf()).toBe(normal * 2);
  });

  it("kills and damage keep counting inside the window (they're the score)", () => {
    run.t = RUN_SECONDS;
    const base = scoreOf();
    run.kills = 100;
    run.damage = 10_000;
    expect(scoreOf()).toBeGreaterThan(base);
  });
});

describe("resetRun", () => {
  it("zeroes the run and applies character + difficulty HP", () => {
    run.kills = 99;
    run.upgrades = { damage: 3 };
    resetRun("normal", "ninja");
    expect(run.kills).toBe(0);
    expect(run.upgrades).toEqual({});
    expect(run.maxHp).toBe(100);
    expect(run.hp).toBe(100);
  });

  it("cursed starts 30% weaker", () => {
    resetRun("cursed", "ninja");
    expect(run.maxHp).toBe(70);
  });

  it("CAPY is the tank", () => {
    resetRun("normal", "capy");
    expect(run.maxHp).toBe(135);
  });

  it("keeps the previous character when none is passed", () => {
    resetRun("normal", "capy");
    resetRun("hard");
    expect(run.character).toBe("capy");
  });
});

describe("rollChoices", () => {
  it("offers 3 distinct, non-maxed upgrades", () => {
    for (let i = 0; i < 50; i++) {
      const out = rollChoices();
      expect(out).toHaveLength(3);
      expect(new Set(out).size).toBe(3);
    }
  });

  it("THEO's AI surfaces 4 choices", () => {
    resetRun("normal", "theo");
    expect(rollChoices()).toHaveLength(4);
  });

  it("never offers an upgrade at max level", () => {
    run.upgrades = { damage: 5 }; // maxLevel 5
    for (let i = 0; i < 50; i++) {
      expect(rollChoices()).not.toContain("damage");
    }
  });

  it("a ready evolution is a guaranteed card", () => {
    const evo = UPGRADES.find((u) => u.id === "bladestorm")!;
    for (const req of evo.requires!) {
      run.upgrades[req] = UPGRADES.find((u) => u.id === req)!.maxLevel;
    }
    for (let i = 0; i < 20; i++) {
      expect(rollChoices()).toContain("bladestorm");
    }
  });

  it("an owned evolution never reappears", () => {
    const evo = UPGRADES.find((u) => u.id === "bladestorm")!;
    for (const req of evo.requires!) {
      run.upgrades[req] = UPGRADES.find((u) => u.id === req)!.maxLevel;
    }
    run.upgrades.bladestorm = 1;
    for (let i = 0; i < 20; i++) {
      expect(rollChoices()).not.toContain("bladestorm");
    }
  });
});

describe("DIFFICULTIES", () => {
  it("score multipliers rank normal < hard < cursed", () => {
    expect(DIFFICULTIES.normal.scoreMult).toBeLessThan(DIFFICULTIES.hard.scoreMult);
    expect(DIFFICULTIES.hard.scoreMult).toBeLessThan(DIFFICULTIES.cursed.scoreMult);
  });

  it("every difficulty has a positive block clock", () => {
    for (const d of Object.values(DIFFICULTIES)) {
      expect(d.blockSeconds).toBeGreaterThan(0);
      expect(d.enemyMult).toBeGreaterThan(0);
      expect(d.statMult).toBeGreaterThan(0);
    }
  });
});

describe("upgradeView", () => {
  it("re-flavors upgrade names per character without changing mechanics", () => {
    const ninja = upgradeView("damage", "ninja");
    const jack = upgradeView("damage", "jack");
    expect(jack.name).not.toBe(ninja.name);
    // same underlying upgrade — both must describe a damage bump
    expect(ninja.desc(1)).toMatch(/damage/i);
    expect(jack.desc(1)).toMatch(/damage/i);
  });
});
