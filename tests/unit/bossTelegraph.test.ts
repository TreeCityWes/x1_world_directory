import { describe, expect, it } from "vitest";
import {
  BOSS_PENDING_SLOTS,
  BOSS_SPAWN_TELEGRAPH,
  MOB_SPAWN_TELEGRAPH,
  telegraphHatchAt,
} from "@/lib/bossTelegraph";

describe("boss telegraph", () => {
  it("warns longer than mobs but stays in the ~1.0–1.2s band", () => {
    expect(BOSS_SPAWN_TELEGRAPH).toBeGreaterThan(MOB_SPAWN_TELEGRAPH);
    expect(BOSS_SPAWN_TELEGRAPH).toBeGreaterThanOrEqual(1.0);
    expect(BOSS_SPAWN_TELEGRAPH).toBeLessThanOrEqual(1.2);
  });

  it("reserves enough dedicated slots for mid-run + finale overlap", () => {
    expect(BOSS_PENDING_SLOTS).toBeGreaterThanOrEqual(2);
  });

  it("schedules hatch after the telegraph window", () => {
    expect(telegraphHatchAt(10)).toBe(10 + BOSS_SPAWN_TELEGRAPH);
    expect(telegraphHatchAt(3, MOB_SPAWN_TELEGRAPH)).toBe(3 + MOB_SPAWN_TELEGRAPH);
  });
});
