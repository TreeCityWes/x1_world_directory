/**
 * Shared scoring + weekly mutator math — used by the client game loop and by
 * the leaderboard API so a forged `score` number cannot drift from the
 * documented formula (SEC-01).
 *
 * Keep this module free of React / "use client" so the API route can import it.
 */

export const RUN_SECONDS = 420; // 7 minutes
export const SCORE_BOARD_CAP = 500_000;

/** Upper bound on captures — projects.json can grow; leave headroom. */
export const MAX_CAPTURES = 120;

export const DIFFICULTY_SCORE_MULT = {
  normal: 1,
  hard: 1.5,
  cursed: 2,
} as const;

export type DifficultyId = keyof typeof DIFFICULTY_SCORE_MULT;

export type Mutator = {
  id: string;
  name: string;
  desc: string;
  scoreMult: number;
  timeMult: number;
  startLevel?: number;
  bridgeSurge?: boolean;
};

export const MUTATORS: Mutator[] = [
  { id: "none", name: "Standard Conditions", desc: "No weekly twist. Pure ninja.", scoreMult: 1, timeMult: 1 },
  { id: "rush", name: "Half Time, 2× Score", desc: "4-minute runs. All scoring doubled.", scoreMult: 2, timeMult: 0.5 },
  { id: "bridgeSurge", name: "Bridge Surge", desc: "Every site capture clears nearby enemies.", scoreMult: 1, timeMult: 1, bridgeSurge: true },
  { id: "cursedStart", name: "Cursed Starts +1 Level", desc: "Cursed runs begin at level 2.", scoreMult: 1, timeMult: 1, startLevel: 1 },
];

export function isoWeek(d = new Date()): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
}

/** The single active mutator for the current ISO week (rotates Monday). */
export function activeMutator(d = new Date()): Mutator {
  return MUTATORS[isoWeek(d) % MUTATORS.length] ?? MUTATORS[0];
}

export function mutatorById(id: string): Mutator | undefined {
  return MUTATORS.find((m) => m.id === id);
}

export type RunStats = {
  t: number;
  kills: number;
  damage: number;
  captured: number;
  win: boolean;
};

export type ScoreInput = RunStats & {
  difficulty: DifficultyId;
  /** weekly mutator score multiplier */
  mutatorScoreMult: number;
  /** weekly mutator time multiplier (caps survival term) */
  timeMult: number;
};

/** Base score before the weekly mutator multiplier (matches historical scoreOf). */
export function baseScoreOf(input: ScoreInput): number {
  const cap = RUN_SECONDS * (input.timeMult || 1);
  const T = Math.min(cap, Math.max(0, input.t));
  const base =
    (T * 40 + Math.max(0, input.kills) * 40 + Math.max(0, input.damage) / 2) / 100 +
    Math.max(0, input.captured) * 50;
  const diffMult = DIFFICULTY_SCORE_MULT[input.difficulty] ?? 1;
  return Math.round(base * diffMult);
}

/** Final run score including win bonus + mutator multiplier. */
export function computeRunScore(input: ScoreInput): number {
  const bonus = input.win ? 1000 : 0;
  return Math.round((baseScoreOf(input) + bonus) * (input.mutatorScoreMult || 1));
}

export function clampBoardScore(score: number): number {
  return Math.max(0, Math.min(SCORE_BOARD_CAP, Math.round(score)));
}

/**
 * Soft anti-cheat bounds. Generous on purpose — reject only impossible claims,
 * not high-skill runs. Returns an error code or null if ok.
 */
export function statsPlausible(
  stats: RunStats,
  opts: { timeMult: number; wallElapsedSec: number },
): string | null {
  const { t, kills, damage, captured } = stats;
  if (![t, kills, damage, captured].every((n) => Number.isFinite(n))) return "stats_nan";
  if (t < 0 || kills < 0 || damage < 0 || captured < 0) return "stats_negative";
  if (!Number.isInteger(kills) || !Number.isInteger(captured)) return "stats_int";
  if (captured > MAX_CAPTURES) return "captures_impossible";

  const clockCap = RUN_SECONDS * (opts.timeMult || 1) + 1;
  if (t > clockCap) return "time_over_clock";
  // claimed game-time cannot exceed wall time since the run token was issued
  // (+3s slack for clock skew / load stalls)
  if (t > opts.wallElapsedSec + 3) return "time_over_wall";

  // densest theoretical: ~25 kills/s sustained; leave headroom
  if (kills > Math.ceil(t * 25) + 80) return "kills_impossible";
  // outgoing DPS ceiling with stacked buffs — ~50k/s is already absurd
  if (damage > Math.ceil(t * 50_000) + 20_000) return "damage_impossible";
  // win bonus requires a serious clear — at least half the map is a soft gate
  if (stats.win && captured < 20) return "win_without_captures";

  return null;
}
