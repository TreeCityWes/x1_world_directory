import { describe, expect, it } from "vitest";
import { CHARACTERS, CHARACTER_ORDER } from "@/lib/characters";
import { regions } from "@/lib/regions";

/** Data-integrity invariants for the two registries everything reads. */

describe("character registry", () => {
  it("order lists every character exactly once", () => {
    expect([...CHARACTER_ORDER].sort()).toEqual(Object.keys(CHARACTERS).sort());
  });

  it("every character carries a complete color identity", () => {
    for (const c of Object.values(CHARACTERS)) {
      for (const key of ["hood", "suit", "band", "scarf", "eyes", "belt"] as const) {
        expect(c.colors[key]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("color bible: no hero wears enemy red as their identity band", () => {
    // red is reserved for enemies/danger (docs/DESIGN + GLM review)
    for (const c of Object.values(CHARACTERS)) {
      if (!c.unlocked) continue;
      const band = c.colors.band.toLowerCase();
      const r = parseInt(band.slice(1, 3), 16);
      const g = parseInt(band.slice(3, 5), 16);
      const b = parseInt(band.slice(5, 7), 16);
      const redDominant = r > 180 && r > g * 1.8 && r > b * 1.8;
      expect(redDominant, `${c.id} band ${band} reads as enemy-red`).toBe(false);
    }
  });

  it("stat multipliers are sane (no zero/negative, no runaway)", () => {
    for (const c of Object.values(CHARACTERS)) {
      for (const k of ["hp", "speed", "dmg", "cooldown", "luck", "xp"] as const) {
        expect(c[k], `${c.id}.${k}`).toBeGreaterThan(0);
        expect(c[k], `${c.id}.${k}`).toBeLessThan(3);
      }
      expect(c.armor).toBeGreaterThanOrEqual(0);
      expect(c.armor).toBeLessThan(1);
    }
  });

  it("exactly one locked mystery slot", () => {
    const locked = Object.values(CHARACTERS).filter((c) => !c.unlocked);
    expect(locked.map((c) => c.id)).toEqual(["mystery"]);
  });
});

describe("regions registry", () => {
  it("has projects and unique ids", () => {
    expect(regions.length).toBeGreaterThan(20);
    expect(new Set(regions.map((r) => r.id)).size).toBe(regions.length);
  });

  it("every beacon direction is a unit vector (Fibonacci sphere placement)", () => {
    for (const r of regions) {
      const [x, y, z] = r.dir;
      const len = Math.hypot(x, y, z);
      expect(Math.abs(len - 1), `${r.id} |dir|=${len}`).toBeLessThan(1e-6);
    }
  });

  it("every region links out over https", () => {
    for (const r of regions) {
      expect(r.href, r.id).toMatch(/^https:\/\//);
    }
  });
});
