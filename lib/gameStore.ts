"use client";

import { create } from "zustand";

/**
 * X1 Ninja Survivors — game state. Authoritative per-frame numbers live in the
 * mutable `run` object (60fps hot path, no React); the zustand store mirrors a
 * snapshot ~4x/s for the DOM HUD, plus mode/choices/sites which change rarely.
 */

export type GameMode = "explore" | "play" | "levelup" | "dead";

// ---- registries (ported from the original X1 Ninja Survivors) ----

export type EnemyTypeId = "goblin" | "gremlin" | "whale" | "boss";

export const ENEMY_TYPES: Record<
  EnemyTypeId,
  {
    hp: number;
    speed: number; // rad/s along the surface
    radius: number; // world units (mesh scale)
    dmg: number; // hp/s on contact
    xp: number;
    gemSplit: number;
    color: string;
    weight: (block: number) => number;
  }
> = {
  goblin: { hp: 22, speed: 0.26, radius: 0.055, dmg: 10, xp: 2, gemSplit: 1, color: "#e0563f", weight: () => 10 },
  gremlin: { hp: 10, speed: 0.42, radius: 0.04, dmg: 6, xp: 1, gemSplit: 1, color: "#fb923c", weight: (b) => (b >= 1 ? 8 : 0) },
  whale: { hp: 90, speed: 0.13, radius: 0.09, dmg: 18, xp: 8, gemSplit: 4, color: "#a78bfa", weight: (b) => (b >= 2 ? 4 : 0) },
  boss: { hp: 700, speed: 0.16, radius: 0.16, dmg: 30, xp: 48, gemSplit: 8, color: "#f0c75e", weight: () => 0 },
};

export type UpgradeDef = {
  id: string;
  name: string;
  desc: (lv: number) => string;
  maxLevel: number;
  weight: number;
};

export const UPGRADES: UpgradeDef[] = [
  { id: "damage", name: "Poison Blades", desc: (l) => `+${6 * l} shuriken damage`, maxLevel: 5, weight: 8 },
  { id: "firerate", name: "Quick Hands", desc: (l) => `${12 * l}% faster throws`, maxLevel: 4, weight: 8 },
  { id: "multishot", name: "Fan of Blades", desc: (l) => `throw ${1 + l} shurikens`, maxLevel: 3, weight: 5 },
  { id: "speed", name: "Swift Tabi", desc: (l) => `+${10 * l}% run speed`, maxLevel: 3, weight: 8 },
  { id: "magnet", name: "Coin Magnet", desc: (l) => `+${60 * l}% pickup range`, maxLevel: 3, weight: 7 },
  { id: "vitality", name: "Iron Gi", desc: (l) => `+${25 * l} max hp & heal`, maxLevel: 3, weight: 6 },
  { id: "katana", name: "Orbiting Katana", desc: (l) => `${l} spinning katana${l > 1 ? "s" : ""}`, maxLevel: 2, weight: 4 },
];

export const BLOCK_SECONDS = 30; // difficulty ramps every "block" — X1 has 1s blocks, ours are chunkier

// ---- per-run mutable state (game loop writes, never re-renders React) ----

export const run = {
  t: 0,
  hp: 100,
  maxHp: 100,
  xp: 0,
  xpNext: 8,
  level: 1,
  block: 0,
  kills: 0,
  captured: 0,
  upgrades: {} as Record<string, number>,
  // effect expiry timestamps (compared against run.t)
  fx: { speed: 0, dmg: 0, rate: 0, xp: 0, shield: 0 },
  speedMult: 1, // consumed by the planet movement controller
  lastHitAt: -10,
};

export function resetRun() {
  run.t = 0;
  run.hp = 100;
  run.maxHp = 100;
  run.xp = 0;
  run.xpNext = 8;
  run.level = 1;
  run.block = 0;
  run.kills = 0;
  run.captured = 0;
  run.upgrades = {};
  run.fx = { speed: 0, dmg: 0, rate: 0, xp: 0, shield: 0 };
  run.speedMult = 1;
  run.lastHitAt = -10;
}

export function scoreOf() {
  return run.kills * 10 + run.captured * 50 + run.block * 100 + Math.floor(run.t);
}

// derived combat numbers (upgrades + timed powerups)
export function shurikenDamage() {
  return (10 + 6 * (run.upgrades.damage ?? 0)) * (run.t < run.fx.dmg ? 2 : 1);
}
export function fireCooldown() {
  return 0.55 * Math.pow(0.88, run.upgrades.firerate ?? 0) * (run.t < run.fx.rate ? 0.5 : 1);
}
export function magnetAngle() {
  return 0.2 * (1 + 0.6 * (run.upgrades.magnet ?? 0));
}
export function currentSpeedMult() {
  return (1 + 0.1 * (run.upgrades.speed ?? 0)) * (run.t < run.fx.speed ? 1.5 : 1);
}

// ---- React-facing store ----

type Hud = {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  block: number;
  time: number;
  kills: number;
  captured: number;
  upgrades: Record<string, number>;
  shield: boolean;
  hit: boolean;
};

type GameStore = {
  mode: GameMode;
  hud: Hud;
  choices: string[];
  activeSites: string[];
  best: number;
  finalScore: number;
  start: () => void;
  quit: () => void;
  die: () => void;
  syncHud: () => void;
  offerLevelUp: (choices: string[]) => void;
  pick: (id: string) => void;
  setActiveSites: (ids: string[]) => void;
};

const emptyHud = (): Hud => ({
  hp: run.hp,
  maxHp: run.maxHp,
  xp: run.xp,
  xpNext: run.xpNext,
  level: run.level,
  block: run.block,
  time: run.t,
  kills: run.kills,
  captured: run.captured,
  upgrades: { ...run.upgrades },
  shield: run.t < run.fx.shield,
  hit: run.t - run.lastHitAt < 0.35,
});

const BEST_KEY = "x1world_best_score";

export const useGame = create<GameStore>((set) => ({
  mode: "explore",
  hud: emptyHud(),
  choices: [],
  activeSites: [],
  best: 0,
  finalScore: 0,
  start: () => {
    resetRun();
    const best =
      typeof window !== "undefined" ? Number(localStorage.getItem(BEST_KEY) ?? 0) : 0;
    set({ mode: "play", hud: emptyHud(), choices: [], activeSites: [], best });
  },
  quit: () => set({ mode: "explore", activeSites: [] }),
  die: () => {
    const score = scoreOf();
    let best = 0;
    if (typeof window !== "undefined") {
      best = Math.max(score, Number(localStorage.getItem(BEST_KEY) ?? 0));
      localStorage.setItem(BEST_KEY, String(best));
    }
    set({ mode: "dead", finalScore: score, best, hud: emptyHud() });
  },
  syncHud: () => set({ hud: emptyHud() }),
  offerLevelUp: (choices) => set({ mode: "levelup", choices, hud: emptyHud() }),
  pick: (id) => {
    run.upgrades[id] = (run.upgrades[id] ?? 0) + 1;
    if (id === "vitality") {
      run.maxHp = 100 + 25 * run.upgrades.vitality;
      run.hp = Math.min(run.maxHp, run.hp + 25);
    }
    set({ mode: "play", choices: [], hud: emptyHud() });
  },
  setActiveSites: (ids) => set({ activeSites: ids }),
}));

/** Roll 3 distinct upgrade choices weighted like the original game. */
export function rollChoices(): string[] {
  const pool = UPGRADES.filter((u) => (run.upgrades[u.id] ?? 0) < u.maxLevel);
  const out: string[] = [];
  const candidates = [...pool];
  while (out.length < 3 && candidates.length > 0) {
    const total = candidates.reduce((s, u) => s + u.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < candidates.length; i++) {
      r -= candidates[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(candidates[idx].id);
    candidates.splice(idx, 1);
  }
  return out;
}
