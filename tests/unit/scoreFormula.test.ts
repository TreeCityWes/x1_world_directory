import { describe, expect, it } from "vitest";
import {
  activeMutator,
  baseScoreOf,
  clampBoardScore,
  computeRunScore,
  DIFFICULTY_SCORE_MULT,
  normalizedScore,
  RUN_SECONDS,
  statsPlausible,
  WIN_BONUS_SITES,
  winBonus,
} from "@/lib/scoreFormula";

describe("scoreFormula", () => {
  it("matches the documented base formula on normal", () => {
    expect(
      baseScoreOf({
        t: 100,
        kills: 50,
        damage: 2000,
        captured: 4,
        win: false,
        difficulty: "normal",
        mutatorScoreMult: 1,
        timeMult: 1,
      }),
    ).toBe(270);
  });

  it("scales win bonus with captures (full map ≈ historical +1000)", () => {
    expect(winBonus(0)).toBe(400);
    expect(winBonus(WIN_BONUS_SITES)).toBe(1000);
    expect(winBonus(20)).toBe(Math.round(400 + (600 * 20) / WIN_BONUS_SITES));
  });

  it("applies scaled win bonus and mutator multiplier in computeRunScore", () => {
    const captured = 50;
    const base = baseScoreOf({
      t: 100,
      kills: 0,
      damage: 0,
      captured,
      win: false,
      difficulty: "normal",
      mutatorScoreMult: 1,
      timeMult: 1,
    });
    const bonus = winBonus(captured);
    expect(
      computeRunScore({
        t: 100,
        kills: 0,
        damage: 0,
        captured,
        win: true,
        difficulty: "normal",
        mutatorScoreMult: 2,
        timeMult: 1,
      }),
    ).toBe(Math.round((base + bonus) * 2));
    expect(
      computeRunScore({
        t: 100,
        kills: 0,
        damage: 0,
        captured,
        win: false,
        difficulty: "normal",
        mutatorScoreMult: 2,
        timeMult: 1,
      }),
    ).toBe(Math.round(base * 2));
  });

  it("caps board scores at 500k", () => {
    expect(clampBoardScore(600_000)).toBe(500_000);
  });

  it("rejects impossible stats", () => {
    expect(
      statsPlausible(
        { t: RUN_SECONDS + 10, kills: 0, damage: 0, captured: 0, win: false },
        { timeMult: 1, wallElapsedSec: 999 },
      ),
    ).toBe("time_over_clock");
    expect(
      statsPlausible(
        { t: 100, kills: 0, damage: 0, captured: 0, win: false },
        { timeMult: 1, wallElapsedSec: 10 },
      ),
    ).toBe("time_over_wall");
    expect(
      statsPlausible(
        { t: 10, kills: 0, damage: 0, captured: 5, win: true },
        { timeMult: 1, wallElapsedSec: 20 },
      ),
    ).toBe("win_without_captures");
  });

  it("activeMutator is stable within a week", () => {
    const a = activeMutator(new Date("2026-08-24T12:00:00Z"));
    const b = activeMutator(new Date("2026-08-25T12:00:00Z"));
    expect(a.id).toBe(b.id);
  });

  it("normalizedScore strips difficulty multipliers for mixed boards", () => {
    expect(normalizedScore(1000, "normal")).toBe(1000);
    expect(normalizedScore(1500, "hard")).toBe(1500 / DIFFICULTY_SCORE_MULT.hard);
    expect(normalizedScore(2000, "cursed")).toBe(1000);
    // a stronger normal run outranks a weaker cursed raw when compared normalized
    expect(normalizedScore(1200, "normal")).toBeGreaterThan(normalizedScore(2000, "cursed"));
    expect(normalizedScore(900, "unknown")).toBe(900);
  });
});
