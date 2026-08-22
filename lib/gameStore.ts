"use client";

import { create } from "zustand";
import { sfx } from "@/lib/sound";
import { preloadCharacterModel } from "@/lib/preloadCharacter";
import { CHARACTERS, type CharacterId } from "@/lib/characters";
import { submitScore } from "@/lib/leaderboard";
import { useProfile } from "@/lib/profile";

/**
 * X1 Ninja Survivors — game state. Authoritative per-frame numbers live in the
 * mutable `run` object (60fps hot path, no React); the zustand store mirrors a
 * snapshot ~4x/s for the DOM HUD, plus mode/choices/sites which change rarely.
 */

export type GameMode = "explore" | "menu" | "play" | "paused" | "levelup" | "dead" | "won" | "timeup";

export type TutorialPhase = "move" | "capture" | "capture-wait" | "levelup" | "done";

// The run is a TIME ATTACK: every player gets the same clock, and the
// leaderboard is the best score inside it. Beat the map (all sites + final
// boss) before the bell for the win + conquest bonus; otherwise the bell
// ends the run where you stand. This is what stops "avoid the bosses and
// farm the horde forever" — score is bounded by the window, not by how long
// you can survive. scoreOf() caps its time term at this same value so the
// two can never drift.
export const RUN_SECONDS = 420; // 7 minutes

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

// ---- daily seed + weekly mutator (client-side meta) ----

/** Deterministic integer hash for today's UTC date. Everyone on earth sees the
 *  same site order and upgrade offers on a given day. */
export function dailySeed(d = new Date()): number {
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const da = d.getUTCDate();
  return (y * 10000 + mo * 100 + da) ^ 0x9e3779b9;
}

function isoWeek(d = new Date()): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
}

/** Mulberry32 — tiny, decent seeded PRNG. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Mutator = {
  id: string;
  name: string;
  desc: string;
  scoreMult: number;
  timeMult: number;
  /** extra starting levels granted by the mutator */
  startLevel?: number;
  /** every capture also emits a bridge-portal shockwave */
  bridgeSurge?: boolean;
};

const MUTATORS: Mutator[] = [
  { id: "none", name: "Standard Conditions", desc: "No weekly twist. Pure ninja.", scoreMult: 1, timeMult: 1 },
  { id: "rush", name: "Half Time, 2× Score", desc: "4-minute runs. All scoring doubled.", scoreMult: 2, timeMult: 0.5 },
  { id: "bridgeSurge", name: "Bridge Surge", desc: "Every site capture clears nearby enemies.", scoreMult: 1, timeMult: 1, bridgeSurge: true },
  { id: "cursedStart", name: "Cursed Starts +1 Level", desc: "Cursed runs begin at level 2.", scoreMult: 1, timeMult: 1, startLevel: 1 },
];

/** The single active mutator for the current ISO week (rotates Monday). */
export function activeMutator(d = new Date()): Mutator {
  return MUTATORS[isoWeek(d) % MUTATORS.length] ?? MUTATORS[0];
}

/** Current run clock, including any weekly time mutator. */
export function effectiveRunSeconds(r = run): number {
  return RUN_SECONDS * (r.timeMult ?? 1);
}

// ---- registries (ported from the original X1 Ninja Survivors) ----

export type EnemyTypeId = "goblin" | "gremlin" | "rug" | "boss";

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
  // the heavy mob IS the rug on screen (RugMob) — name and color now match
  rug: { hp: 90, speed: 0.13, radius: 0.09, dmg: 24, xp: 8, gemSplit: 4, color: "#d4a03b", weight: (b) => (b >= 2 ? 4 : 0) },
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

// Same mechanic, different fantasy: per-character names/copy for shared
// upgrade IDs, so CAPY is never offered "throw more shurikens".
const UPGRADE_FLAVOR: Partial<
  Record<string, Partial<Record<CharacterId, { name?: string; desc?: (l: number) => string }>>>
> = {
  damage: {
    jack: { name: "Loaded XEN Coins", desc: (l) => `+${6 * l} coin damage` },
    theo: { name: "Prompt Tuning", desc: (l) => `+${6 * l} pulse damage` },
    capy: { name: "Sharpened Slash", desc: (l) => `+${6 * l} slash damage` },
  },
  firerate: {
    jack: { name: "Rapid Mint", desc: (l) => `${12 * l}% faster coin throws` },
    theo: { name: "Token Streaming", desc: (l) => `${12 * l}% faster pulses` },
    capy: { name: "Frenzied Cleave", desc: (l) => `${12 * l}% faster swings` },
  },
  multishot: {
    jack: { name: "Coin Fan", desc: (l) => `throw ${1 + l} coins` },
    theo: { name: "Parallel Prompts", desc: (l) => `fire ${1 + l} pulses` },
    capy: { name: "Wider Cleave", desc: (l) => `+${30 * l}% slash arc & reach` },
  },
  bladestorm: {
    jack: { name: "XEN Detonation", desc: () => "every 3s: a ring of 12 exploding coins" },
    theo: { name: "Prompt Cascade", desc: () => "every 3s: a radial burst of chaining pulses" },
    capy: { name: "Validator Sweep", desc: () => "every 3s: a full-circle cleave" },
  },
};

/** Display name/desc for an upgrade as THIS character experiences it. */
export function upgradeView(id: string, character: CharacterId = run.character) {
  const def = UPGRADES.find((u) => u.id === id);
  const f = UPGRADE_FLAVOR[id]?.[character];
  return {
    name: f?.name ?? def?.name ?? id,
    desc: f?.desc ?? def?.desc ?? (() => ""),
  };
}

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
  // effect expiry timestamp (compared against run.t) — only the shield is
  // timed; permanent site buffs live in `perm`
  fx: { shield: 0 },
  // PERMANENT stacks from captured sites — the ninja grows all run
  perm: { speed: 0, dmg: 0, rate: 0, xp: 0, magnet: 0 },
  // additive fractional bonuses from sites (e.g. 0.05 = +5%), with random
  // variance and diminishing returns for repeated same-kind captures
  permAdd: { speed: 0, dmg: 0, rate: 0, xp: 0, magnet: 0 },
  kindCaptures: {} as Record<string, number>,
  speedMult: 1, // consumed by the planet movement controller
  lastHitAt: -10,
  killedBy: "", // flavor id of the last thing that bit us
  finalBossAlive: false,
  character: "ninja" as CharacterId,
  damage: 0, // total damage dealt (feeds the score formula)
  difficulty: "normal" as DifficultyId,
  // client-side weekly mutator + deterministic daily seed
  mutator: activeMutator(),
  timeMult: 1,
  scoreMult: 1,
  rng: mulberry32(dailySeed()),
  /** run.t clock — brief slow-mo beat on site capture */
  captureSlowUntil: 0,
};

export function charDef() {
  return CHARACTERS[run.character];
}

export function resetRun(diff?: DifficultyId, character?: CharacterId) {
  if (diff) run.difficulty = diff;
  const statMult = DIFFICULTIES[run.difficulty].statMult;
  run.t = 0;
  run.character = character ?? run.character;
  run.maxHp = Math.round(100 * statMult * charDef().hp);
  run.hp = run.maxHp;
  run.xp = 0;
  run.xpNext = 8;
  run.level = 1;
  run.block = 0;
  run.kills = 0;
  run.captured = 0;
  run.upgrades = {};
  run.fx = { shield: 0 };
  run.perm = { speed: 0, dmg: 0, rate: 0, xp: 0, magnet: 0 };
  run.permAdd = { speed: 0, dmg: 0, rate: 0, xp: 0, magnet: 0 };
  run.kindCaptures = {};
  run.speedMult = 1;
  run.lastHitAt = -10;
  run.killedBy = "";
  run.finalBossAlive = false;
  run.damage = 0;
  run.mutator = activeMutator();
  run.timeMult = run.mutator.timeMult;
  run.scoreMult = run.mutator.scoreMult;
  run.rng = mulberry32(dailySeed());
  run.captureSlowUntil = 0;

  // weekly mutator: bonus starting levels
  const bonusLevels = run.mutator.startLevel ?? 0;
  if (bonusLevels > 0) {
    run.level += bonusLevels;
    // each level roughly doubles the next threshold
    run.xpNext = Math.round(run.xpNext * Math.pow(2, bonusLevels));
  }
}

/** Base score before the weekly mutator multiplier is applied. */
export function scoreOf() {
  const cap = effectiveRunSeconds();
  const T = Math.min(cap, run.t); // survival time caps at the run clock
  // linear time term — the old T² quadratically rewarded circle-running;
  // kills, damage, and captures are the score now, surviving is the floor
  const base = (T * 40 + run.kills * 40 + run.damage / 2) / 100 + run.captured * 50;
  return Math.round(base * DIFFICULTIES[run.difficulty].scoreMult);
}

/** Final score for the current run, including mutator multipliers. */
export function runScore(win = false): number {
  const bonus = win ? 1000 : 0;
  return Math.round((scoreOf() + bonus) * run.scoreMult);
}

// derived combat numbers (upgrades + timed powerups)
export function shurikenDamage() {
  // Cursed's statMult (0.7) now weakens outgoing damage too — the mode is
  // meant to make you 30% weaker, not just squishier. Normal/Hard = ×1.
  return (
    (10 + 6 * (run.upgrades.damage ?? 0)) *
    (1 + Math.min(1.5, run.permAdd.dmg)) *
    charDef().dmg *
    DIFFICULTIES[run.difficulty].statMult
  );
}
export function fireCooldown() {
  // permAdd.rate is the total fractional fire-rate bonus (mean ~6% per stack).
  // Convert back to equivalent stacks so the curve stays the same shape.
  const rateStacks = run.permAdd.rate / 0.06;
  return Math.max(
    0.15,
    0.55 * charDef().cooldown * Math.pow(0.88, run.upgrades.firerate ?? 0) * Math.pow(0.94, rateStacks),
  );
}
export function magnetAngle() {
  // capped: a fully-stacked magnet used to vacuum more than the visible planet
  return Math.min(
    1.1,
    0.75 * 0.2 * (1 + 0.6 * (run.upgrades.magnet ?? 0)) * (1 + run.permAdd.magnet / 0.08),
  );
}
export function currentSpeedMult() {
  const finalStand = run.hp < run.maxHp * 0.2 ? 1.3 : 1;
  return (
    (1 + 0.1 * (run.upgrades.speed ?? 0)) *
    (1 + Math.min(0.45, run.permAdd.speed)) *
    DIFFICULTIES[run.difficulty].statMult *
    charDef().speed *
    finalStand
  );
}
export function xpMult() {
  return (1 + run.permAdd.xp) * charDef().xp;
}
export function armorMult() {
  return Math.max(0.15, 1 - 0.08 * (run.upgrades.armor ?? 0) - charDef().armor);
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
  pb: number; // personal best for the currently selected character + difficulty
  /** true if the just-ended run set a new per-character/difficulty PB */
  newPb: boolean;
  character: CharacterId;
  setCharacter: (c: CharacterId) => void;
  finalScore: number;
  /** difficulty of the run finalScore came from — survives openMenu/resetRun */
  finalDiff: DifficultyId;
  /** boss entrance nameplate — set by the game loop, shown ~3s by the HUD */
  bossCard: string;
  bossCardAt: number;
  /** leaderboard submit status for the end screens */
  scoreSubmit: "" | "sending" | "ok" | "fail";
  /** late ranked submission — a run that ended before name+wallet were set
   *  can still post until the next run starts */
  retrySubmit: () => void;
  start: (diff?: DifficultyId) => void;
  openMenu: () => void;
  pause: () => void;
  resume: () => void;
  quit: () => void;
  deathCause: string;
  die: () => void;
  timeUp: () => void;
  win: () => void;
  syncHud: () => void;
  offerLevelUp: (choices: string[]) => void;
  pick: (id: string) => void;
  setActiveSites: (ids: string[]) => void;
  capturedIds: string[];
  /** transient id of a site whose arrow the player just tapped to flash */
  flashSiteId: string | null;
  tutorialPhase: TutorialPhase;
  tutorialCompleted: boolean;
  setTutorialPhase: (p: TutorialPhase) => void;
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
const TUTORIAL_KEY = "x1world_tutorial_v1";

const pbKey = (char: CharacterId, diff: DifficultyId) => `x1world_pb_${char}_${diff}`;
function readPb(char: CharacterId, diff: DifficultyId) {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(pbKey(char, diff)) ?? 0);
}
export function getPb(char: CharacterId, diff: DifficultyId) {
  return readPb(char, diff);
}
function writePb(char: CharacterId, diff: DifficultyId, score: number) {
  if (typeof window === "undefined") return;
  const key = pbKey(char, diff);
  const prev = Number(localStorage.getItem(key) ?? 0);
  localStorage.setItem(key, String(Math.max(prev, score)));
}

function readTutorialCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TUTORIAL_KEY) === "1";
}

/** Only trust localStorage if it names a real, unlocked character. */
function readSavedCharacter(): CharacterId {
  if (typeof window === "undefined") return "ninja";
  const c = localStorage.getItem("x1world_char") as CharacterId | null;
  return c && CHARACTERS[c]?.unlocked ? c : "ninja";
}

export const useGame = create<GameStore>((set, get) => ({
  mode: "menu", // the game IS the landing experience; explore is the side quest
  hud: emptyHud(),
  character: readSavedCharacter(),
  choices: [],
  activeSites: [],
  capturedIds: [],
  flashSiteId: null,
  tutorialPhase: readTutorialCompleted() ? "done" : "move",
  tutorialCompleted: readTutorialCompleted(),
  best: 0,
  pb: readPb(readSavedCharacter(), run.difficulty),
  newPb: false,
  finalScore: 0,
  finalDiff: "normal",
  bossCard: "",
  bossCardAt: 0,
  scoreSubmit: "",
  deathCause: "",
  start: (diff) => {
    resetRun(diff ?? run.difficulty, get().character);
    // selection bugs are invisible without this — one line per run start
    console.info("[x1:run]", {
      selectedCharacterId: get().character,
      spawnedCharacterId: run.character,
      startingWeaponId: charDef().weapon.kind,
      activeWeapons: [charDef().weapon.name],
      maxHp: run.maxHp,
      difficulty: run.difficulty,
    });
    const best =
      typeof window !== "undefined" ? Number(localStorage.getItem(BEST_KEY) ?? 0) : 0;
    const completed = readTutorialCompleted();
    const char = get().character;
    const difficulty = diff ?? run.difficulty;
    // a new run supersedes the previous unposted score — retrySubmit ends here
    set({
      mode: "play",
      hud: emptyHud(),
      choices: [],
      activeSites: [],
      capturedIds: [],
      best,
      pb: readPb(char, difficulty),
      finalScore: 0,
      scoreSubmit: "",
      newPb: false,
      tutorialPhase: completed ? "done" : "move",
      tutorialCompleted: completed,
    });
  },
  openMenu: () => {
    resetRun();
    const best =
      typeof window !== "undefined" ? Number(localStorage.getItem(BEST_KEY) ?? 0) : 0;
    const char = get().character;
    set({ mode: "menu", hud: emptyHud(), choices: [], activeSites: [], capturedIds: [], best, pb: readPb(char, run.difficulty), newPb: false, bossCard: "", bossCardAt: 0 });
  },
  pause: () => {
    if (get().mode === "play") set({ mode: "paused", hud: emptyHud() });
  },
  resume: () => {
    if (get().mode === "paused") set({ mode: "play" });
  },
  quit: () => set({ mode: "explore", activeSites: [], capturedIds: [], bossCard: "", bossCardAt: 0 }),
  die: () => {
    const score = runScore();
    const prevPb = typeof window !== "undefined" ? readPb(run.character, run.difficulty) : 0;
    let best = 0;
    if (typeof window !== "undefined") {
      best = Math.max(score, Number(localStorage.getItem(BEST_KEY) ?? 0));
      localStorage.setItem(BEST_KEY, String(best));
      writePb(run.character, run.difficulty, score);
    }
    sfx.death();
    const pd = useProfile.getState();
    const ranked = !!pd.name.trim() && !!pd.wallet;
    if (ranked) {
      void submitScore({ name: pd.name, wallet: pd.wallet, score, diff: run.difficulty }).then(
        (ok) => set({ scoreSubmit: ok ? "ok" : "fail" }),
      );
    }
    set({
      mode: "dead",
      finalScore: score,
      finalDiff: run.difficulty,
      best,
      pb: readPb(run.character, run.difficulty),
      newPb: score > prevPb,
      deathCause: run.killedBy,
      scoreSubmit: ranked ? "sending" : "",
      hud: emptyHud(),
    });
  },
  timeUp: () => {
    // Time-attack ending: the clock ran out. Scores like a death (no conquest
    // bonus — you only get that by actually finishing), but it's the EXPECTED
    // way most runs end, so it gets its own neutral screen, not a death card.
    const score = runScore();
    const prevPb = typeof window !== "undefined" ? readPb(run.character, run.difficulty) : 0;
    let best = 0;
    if (typeof window !== "undefined") {
      best = Math.max(score, Number(localStorage.getItem(BEST_KEY) ?? 0));
      localStorage.setItem(BEST_KEY, String(best));
      writePb(run.character, run.difficulty, score);
    }
    sfx.win(); // a "you made it to the bell" flourish, not the death sting
    const pt = useProfile.getState();
    const ranked = !!pt.name.trim() && !!pt.wallet;
    if (ranked) {
      void submitScore({ name: pt.name, wallet: pt.wallet, score, diff: run.difficulty }).then(
        (ok) => set({ scoreSubmit: ok ? "ok" : "fail" }),
      );
    }
    set({
      mode: "timeup",
      finalScore: score,
      finalDiff: run.difficulty,
      best,
      pb: readPb(run.character, run.difficulty),
      newPb: score > prevPb,
      scoreSubmit: ranked ? "sending" : "",
      hud: emptyHud(),
    });
  },
  win: () => {
    const score = runScore(true);
    const prevPb = typeof window !== "undefined" ? readPb(run.character, run.difficulty) : 0;
    let best = 0;
    if (typeof window !== "undefined") {
      best = Math.max(score, Number(localStorage.getItem(BEST_KEY) ?? 0));
      localStorage.setItem(BEST_KEY, String(best));
      writePb(run.character, run.difficulty, score);
    }
    sfx.win();
    const pw = useProfile.getState();
    const ranked = !!pw.name.trim() && !!pw.wallet;
    if (ranked) {
      void submitScore({ name: pw.name, wallet: pw.wallet, score, diff: run.difficulty }).then(
        (ok) => set({ scoreSubmit: ok ? "ok" : "fail" }),
      );
    }
    set({
      mode: "won",
      finalScore: score,
      finalDiff: run.difficulty,
      best,
      pb: readPb(run.character, run.difficulty),
      newPb: score > prevPb,
      scoreSubmit: ranked ? "sending" : "",
      hud: emptyHud(),
    });
  },
  retrySubmit: () => {
    const { finalScore, finalDiff, scoreSubmit } = get();
    if (finalScore <= 0 || scoreSubmit === "ok" || scoreSubmit === "sending") return;
    const p = useProfile.getState();
    if (!p.name.trim() || !p.wallet) return;
    set({ scoreSubmit: "sending" });
    void submitScore({ name: p.name, wallet: p.wallet, score: finalScore, diff: finalDiff }).then(
      (ok) => set({ scoreSubmit: ok ? "ok" : "fail" }),
    );
  },
  syncHud: () => set({ hud: emptyHud() }),
  offerLevelUp: (choices) => {
    if (get().tutorialPhase === "capture-wait") {
      set({ mode: "levelup", choices, hud: emptyHud(), tutorialPhase: "levelup" });
    } else {
      set({ mode: "levelup", choices, hud: emptyHud() });
    }
  },
  pick: (id) => {
    // only apply an upgrade that was actually offered this level-up
    if (get().mode !== "levelup" || !get().choices.includes(id)) return;
    const def = UPGRADES.find((u) => u.id === id);
    if (def?.requires) sfx.evolve();
    else sfx.ui();
    run.upgrades[id] = (run.upgrades[id] ?? 0) + 1;
    if (id === "vitality") {
      // incremental — preserves Cursed's stat penalty AND fort capture bonuses
      run.maxHp += 25;
      run.hp = Math.min(run.maxHp, run.hp + 25);
    }
    const tutorialDone = get().tutorialPhase === "levelup";
    if (tutorialDone && typeof window !== "undefined") {
      localStorage.setItem(TUTORIAL_KEY, "1");
    }
    set({
      mode: "play",
      choices: [],
      hud: emptyHud(),
      tutorialPhase: tutorialDone ? "done" : get().tutorialPhase,
      tutorialCompleted: tutorialDone || get().tutorialCompleted,
    });
  },
  setActiveSites: (ids) => set({ activeSites: ids }),
  setCharacter: (c) => {
    if (typeof window !== "undefined") localStorage.setItem("x1world_char", c);
    preloadCharacterModel(c);
    set({ character: c, pb: readPb(c, run.difficulty) });
    sfx.ui();
  },
  setTutorialPhase: (p) => {
    if (get().tutorialCompleted) return;
    set({ tutorialPhase: p });
  },
}));

/** Roll 3 distinct upgrade choices weighted like the original game. */
export function rollChoices(): string[] {
  // EVERY ready evolution jumps the queue as a guaranteed card — a second
  // ready evo must not stay hidden until the next level-up
  const evos = UPGRADES.filter(
    (u) =>
      u.requires &&
      !(run.upgrades[u.id] ?? 0) &&
      u.requires.every((r) => (run.upgrades[r] ?? 0) >= (UPGRADES.find((x) => x.id === r)?.maxLevel ?? 99)),
  );
  const pool = UPGRADES.filter((u) => u.weight > 0 && (run.upgrades[u.id] ?? 0) < u.maxLevel);
  const out: string[] = evos.map((e) => e.id);
  const candidates = [...pool];
  const want = charDef().choices ?? 3; // THEO's AI surfaces an extra option
  while (out.length < want && candidates.length > 0) {
    const total = candidates.reduce((s, u) => s + u.weight, 0);
    const rng = run.rng ?? Math.random;
    let r = rng() * total;
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
