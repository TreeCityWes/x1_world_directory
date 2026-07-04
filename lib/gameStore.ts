"use client";

import { create } from "zustand";
import { sfx } from "@/lib/sound";
import { submitScore } from "@/lib/leaderboard";
import { useProfile } from "@/lib/profile";

/**
 * X1 Ninja Survivors — game state. Authoritative per-frame numbers live in the
 * mutable `run` object (60fps hot path, no React); the zustand store mirrors a
 * snapshot ~4x/s for the DOM HUD, plus mode/choices/sites which change rarely.
 */

export type GameMode = "explore" | "menu" | "play" | "levelup" | "dead" | "won";

export const DIFFICULTIES = {
  normal: {
    name: "Normal",
    desc: "The standard run. Capture every project to win.",
    scoreMult: 1,
    enemyMult: 1,
    statMult: 1,
    blockSeconds: 30,
  },
  hard: {
    name: "Hard",
    desc: "20-second blocks, denser horde. Faster, juicier.",
    scoreMult: 1.5,
    enemyMult: 1.3,
    statMult: 1,
    blockSeconds: 20,
  },
  cursed: {
    name: "Cursed",
    desc: "Start 30% weaker. Endure. Double score.",
    scoreMult: 2,
    enemyMult: 1,
    statMult: 0.7,
    blockSeconds: 30,
  },
} as const;
export type DifficultyId = keyof typeof DIFFICULTIES;

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
  goblin: { hp: 22, speed: 0.26, radius: 0.055, dmg: 13, xp: 2, gemSplit: 1, color: "#e0563f", weight: () => 10 },
  gremlin: { hp: 10, speed: 0.42, radius: 0.04, dmg: 9, xp: 1, gemSplit: 1, color: "#fb923c", weight: (b) => (b >= 1 ? 8 : 0) },
  whale: { hp: 90, speed: 0.13, radius: 0.09, dmg: 24, xp: 8, gemSplit: 4, color: "#a78bfa", weight: (b) => (b >= 2 ? 4 : 0) },
  boss: { hp: 1100, speed: 0.19, radius: 0.18, dmg: 75, xp: 64, gemSplit: 10, color: "#f0c75e", weight: () => 0 },
};

export type UpgradeDef = {
  id: string;
  name: string;
  desc: (lv: number) => string;
  maxLevel: number;
  weight: number;
  /** evolution: requires both listed upgrades at max level; offered as a golden card */
  requires?: [string, string];
};

export const UPGRADES: UpgradeDef[] = [
  { id: "damage", name: "Poison Blades", desc: (l) => `+${6 * l} shuriken damage`, maxLevel: 5, weight: 8 },
  { id: "firerate", name: "Quick Hands", desc: (l) => `${12 * l}% faster throws`, maxLevel: 4, weight: 8 },
  { id: "multishot", name: "Fan of Blades", desc: (l) => `throw ${1 + l} shurikens`, maxLevel: 3, weight: 5 },
  { id: "speed", name: "Swift Tabi", desc: (l) => `+${10 * l}% run speed`, maxLevel: 3, weight: 8 },
  { id: "magnet", name: "Coin Magnet", desc: (l) => `+${60 * l}% pickup range`, maxLevel: 3, weight: 7 },
  { id: "vitality", name: "Iron Gi", desc: (l) => `+${25 * l} max hp & heal`, maxLevel: 3, weight: 6 },
  { id: "katana", name: "Orbiting Katana", desc: (l) => `${l} spinning katana${l > 1 ? "s" : ""}`, maxLevel: 2, weight: 4 },
  // ---- wave-1 weapons: change how you position, not just numbers ----
  { id: "arcnode", name: "Arc Node", desc: (l) => `lightning chains through ${1 + l} enemies — herd them`, maxLevel: 4, weight: 6 },
  { id: "halo", name: "Ion Halo", desc: (l) => `burning aura around you, ${(0.16 + 0.03 * l).toFixed(2)} rad wide`, maxLevel: 4, weight: 6 },
  // ---- wave-1 passives: the health-tension kit ----
  { id: "armor", name: "Validator Plating", desc: (l) => `−${8 * l}% contact damage`, maxLevel: 3, weight: 7 },
  { id: "lifesteal", name: "Crimson Protocol", desc: (l) => `heal ${3 * l}% of damage you deal`, maxLevel: 3, weight: 5 },
  { id: "regen", name: "Uptime", desc: (l) => `+${(0.8 * l).toFixed(1)} hp/s regeneration`, maxLevel: 3, weight: 6 },
  { id: "crit", name: "MEV Strike", desc: (l) => `${8 * l}% chance to hit for double`, maxLevel: 3, weight: 5 },
  // ---- evolutions (weight 0: never rolled — injected when ingredients max) ----
  { id: "bladestorm", name: "Blade Storm", desc: () => "every 3s: a 360° nova of 12 shurikens", maxLevel: 1, weight: 0, requires: ["multishot", "firerate"] },
  { id: "tempest", name: "Crimson Tempest", desc: () => "4 burning katanas · double blade damage", maxLevel: 1, weight: 0, requires: ["damage", "katana"] },
  { id: "whirlwind", name: "Golden Whirlwind", desc: () => "your sprint leaves a damaging golden wake", maxLevel: 1, weight: 0, requires: ["speed", "magnet"] },
  { id: "chainreaction", name: "Chain Reaction", desc: () => "lightning chains through EVERYTHING and always crits", maxLevel: 1, weight: 0, requires: ["arcnode", "crit"] },
  { id: "meltdown", name: "Core Meltdown", desc: () => "huge halo · enemies inside slowed to a crawl", maxLevel: 1, weight: 0, requires: ["halo", "armor"] },
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
  // PERMANENT stacks from captured sites — the ninja grows all run
  perm: { speed: 0, dmg: 0, rate: 0, xp: 0, magnet: 0 },
  speedMult: 1, // consumed by the planet movement controller
  lastHitAt: -10,
  killedBy: "", // flavor id of the last thing that bit us
  finalBossAlive: false,
  damage: 0, // total damage dealt (feeds the score formula)
  difficulty: "normal" as DifficultyId,
};

export function resetRun(diff?: DifficultyId) {
  if (diff) run.difficulty = diff;
  const statMult = DIFFICULTIES[run.difficulty].statMult;
  run.t = 0;
  run.maxHp = Math.round(100 * statMult);
  run.hp = run.maxHp;
  run.xp = 0;
  run.xpNext = 8;
  run.level = 1;
  run.block = 0;
  run.kills = 0;
  run.captured = 0;
  run.upgrades = {};
  run.fx = { speed: 0, dmg: 0, rate: 0, xp: 0, shield: 0 };
  run.perm = { speed: 0, dmg: 0, rate: 0, xp: 0, magnet: 0 };
  run.speedMult = 1;
  run.lastHitAt = -10;
  run.killedBy = "";
  run.finalBossAlive = false;
  run.damage = 0;
}

export function scoreOf() {
  const T = Math.min(600, run.t); // survival time caps at 10 minutes
  const base = (T * T + run.kills * 30 + run.damage / 2) / 100 + run.captured * 50;
  return Math.round(base * DIFFICULTIES[run.difficulty].scoreMult);
}

// derived combat numbers (upgrades + timed powerups)
export function shurikenDamage() {
  return (10 + 6 * (run.upgrades.damage ?? 0)) * (1 + Math.min(1.5, 0.1 * run.perm.dmg));
}
export function fireCooldown() {
  return Math.max(0.18, 0.55 * Math.pow(0.88, run.upgrades.firerate ?? 0) * Math.pow(0.94, run.perm.rate));
}
export function magnetAngle() {
  // capped: a fully-stacked magnet used to vacuum more than the visible planet
  return Math.min(1.1, 0.75 * 0.2 * (1 + 0.6 * (run.upgrades.magnet ?? 0)) * (1 + 0.08 * run.perm.magnet));
}
export function currentSpeedMult() {
  const finalStand = run.hp < run.maxHp * 0.2 ? 1.3 : 1;
  return (
    (1 + 0.1 * (run.upgrades.speed ?? 0)) *
    (1 + Math.min(0.4, 0.05 * run.perm.speed)) *
    DIFFICULTIES[run.difficulty].statMult *
    finalStand
  );
}
export function xpMult() {
  return 1 + 0.1 * run.perm.xp;
}
export function armorMult() {
  return 1 - 0.08 * (run.upgrades.armor ?? 0);
}
export function lifestealPct() {
  return 0.03 * (run.upgrades.lifesteal ?? 0);
}
export function regenRate() {
  return 0.8 * (run.upgrades.regen ?? 0);
}
export function critChance() {
  return 0.08 * (run.upgrades.crit ?? 0);
}
export function haloAngle() {
  const lv = run.upgrades.halo ?? 0;
  if (lv === 0) return 0;
  return (0.16 + 0.03 * lv) * (run.upgrades.meltdown ? 1.6 : 1);
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
  finalBoss: boolean;
  hit: boolean;
  diff: DifficultyId;
};

type GameStore = {
  mode: GameMode;
  hud: Hud;
  choices: string[];
  activeSites: string[];
  best: number;
  finalScore: number;
  start: (diff?: DifficultyId) => void;
  openMenu: () => void;
  quit: () => void;
  deathCause: string;
  die: () => void;
  win: () => void;
  syncHud: () => void;
  offerLevelUp: (choices: string[]) => void;
  pick: (id: string) => void;
  setActiveSites: (ids: string[]) => void;
  capturedIds: string[];
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
  finalBoss: run.finalBossAlive,
  hit: run.t - run.lastHitAt < 0.35,
  diff: run.difficulty,
});

const BEST_KEY = "x1world_best_score";

export const useGame = create<GameStore>((set) => ({
  mode: "menu", // the game IS the landing experience; explore is the side quest
  hud: emptyHud(),
  choices: [],
  activeSites: [],
  capturedIds: [],
  best: 0,
  finalScore: 0,
  deathCause: "",
  start: (diff) => {
    resetRun(diff ?? run.difficulty);
    const best =
      typeof window !== "undefined" ? Number(localStorage.getItem(BEST_KEY) ?? 0) : 0;
    set({ mode: "play", hud: emptyHud(), choices: [], activeSites: [], capturedIds: [], best });
  },
  openMenu: () => {
    resetRun();
    const best =
      typeof window !== "undefined" ? Number(localStorage.getItem(BEST_KEY) ?? 0) : 0;
    set({ mode: "menu", hud: emptyHud(), choices: [], activeSites: [], best });
  },
  quit: () => set({ mode: "explore", activeSites: [] }),
  die: () => {
    const score = scoreOf();
    let best = 0;
    if (typeof window !== "undefined") {
      best = Math.max(score, Number(localStorage.getItem(BEST_KEY) ?? 0));
      localStorage.setItem(BEST_KEY, String(best));
    }
    sfx.death();
    const pd = useProfile.getState();
    if (pd.name.trim()) submitScore({ name: pd.name, wallet: pd.wallet, score, diff: run.difficulty });
    set({ mode: "dead", finalScore: score, best, deathCause: run.killedBy, hud: emptyHud() });
  },
  win: () => {
    const score = scoreOf() + 1000; // full-ecosystem bonus
    let best = 0;
    if (typeof window !== "undefined") {
      best = Math.max(score, Number(localStorage.getItem(BEST_KEY) ?? 0));
      localStorage.setItem(BEST_KEY, String(best));
    }
    sfx.win();
    const pw = useProfile.getState();
    if (pw.name.trim()) submitScore({ name: pw.name, wallet: pw.wallet, score, diff: run.difficulty });
    set({ mode: "won", finalScore: score, best, hud: emptyHud() });
  },
  syncHud: () => set({ hud: emptyHud() }),
  offerLevelUp: (choices) => set({ mode: "levelup", choices, hud: emptyHud() }),
  pick: (id) => {
    const def = UPGRADES.find((u) => u.id === id);
    if (def?.requires) sfx.evolve();
    else sfx.ui();
    run.upgrades[id] = (run.upgrades[id] ?? 0) + 1;
    if (id === "vitality") {
      // incremental — preserves Cursed's stat penalty AND fort capture bonuses
      run.maxHp += 25;
      run.hp = Math.min(run.maxHp, run.hp + 25);
    }
    set({ mode: "play", choices: [], hud: emptyHud() });
  },
  setActiveSites: (ids) => set({ activeSites: ids }),
}));

/** Roll 3 distinct upgrade choices weighted like the original game. */
export function rollChoices(): string[] {
  // an unlocked evolution jumps the queue as a guaranteed first card
  const evo = UPGRADES.find(
    (u) =>
      u.requires &&
      !(run.upgrades[u.id] ?? 0) &&
      u.requires.every((r) => (run.upgrades[r] ?? 0) >= (UPGRADES.find((x) => x.id === r)?.maxLevel ?? 99)),
  );
  const pool = UPGRADES.filter((u) => u.weight > 0 && (run.upgrades[u.id] ?? 0) < u.maxLevel);
  const out: string[] = evo ? [evo.id] : [];
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
