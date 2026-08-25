import { describe, expect, it } from "vitest";
import {
  activeMutator,
  baseScoreOf,
  clampBoardScore,
  computeRunScore,
  RUN_SECONDS,
  statsPlausible,
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

  it("applies win bonus and mutator multiplier in computeRunScore", () => {
    const base = baseScoreOf({
      t: 100,
      kills: 0,
      damage: 0,
      captured: 0,
      win: false,
      difficulty: "normal",
      mutatorScoreMult: 1,
      timeMult: 1,
    });
    expect(
      computeRunScore({
        t: 100,
        kills: 0,
        damage: 0,
        captured: 0,
        win: true,
        difficulty: "normal",
        mutatorScoreMult: 2,
        timeMult: 1,
      }),
    ).toBe(Math.round((base + 1000) * 2));
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
});
