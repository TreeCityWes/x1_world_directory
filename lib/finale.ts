/**
 * Finale / final-Nemesis tuning (safe constants + pure helpers).
 *
 * Trigger: soft gate on sites remaining AND run level, with a hard bypass
 * when every site is captured so a weak early run can still finish.
 * HP scales with a compact "power" score — not a flat multiplier — so
 * time-to-kill stays dramatic for both weak and godlike runs.
 *
 * Boss/finale spawns stay nameplate-only (COMBAT-01); no ground-ring
 * telegraph via `world.pending`.
 */

/** Sites remaining at which the finale may open (with level gate). */
export const FINALE_SITES_LEFT = 5;

/**
 * Soft level gate so lucky early capture streaks don't open the finale
 * while the run is still underpowered. All-sites-captured bypasses this.
 */
export const FINALE_MIN_LEVEL = 8;

/** HP mult = BASE + min(CAP, power). Weak ≈3.2× → godlike ≈5.6×. */
export const FINALE_HP_BASE = 1.8;
export const FINALE_HP_POWER_CAP = 3.8;

/** Weights for the compact finale power score. */
export const FINALE_POWER_LEVEL = 0.09;
export const FINALE_POWER_DAMAGE_UPGRADE = 0.12;
export const FINALE_POWER_MULTISHOT = 0.2;
export const FINALE_POWER_FIRERATE = 0.08;
/** Scales (difficulty.enemyMult - 1). */
export const FINALE_POWER_DIFFICULTY = 0.5;

/** Light damage bump (not fully power-scaled) so the fight threatens. */
export const FINALE_DMG_BASE = 1.2;
export const FINALE_DMG_POWER_CAP = 0.35;
export const FINALE_DMG_POWER_SCALE = 0.1;

/** Gentle speed bump with power. */
export const FINALE_SPEED_BASE = 1.1;
export const FINALE_SPEED_POWER_CAP = 0.2;
export const FINALE_SPEED_POWER_SCALE = 0.05;

export type FinaleTriggerInput = {
  /** `totalSites - captured` */
  remaining: number;
  level: number;
  totalSites: number;
};

/**
 * Whether the run should request the final Nemesis (`world.finalWanted`).
 * Opens at ≤ FINALE_SITES_LEFT remaining once level ≥ FINALE_MIN_LEVEL,
 * or immediately when every site is captured (finish-line bypass).
 */
export function shouldRequestFinale({
  remaining,
  level,
  totalSites,
}: FinaleTriggerInput): boolean {
  const captured = totalSites - remaining;
  return (
    (remaining <= FINALE_SITES_LEFT && level >= FINALE_MIN_LEVEL) ||
    captured >= totalSites
  );
}

export type FinalePowerInput = {
  level: number;
  /** Permanent damage add from sites / mutators (`run.permAdd.dmg`). */
  permDmg: number;
  damageUpgrades: number;
  multishotUpgrades: number;
  firerateUpgrades: number;
  /** `DIFFICULTIES[difficulty].enemyMult` */
  enemyMult: number;
};

/** Compact power score used to scale finale HP / light dmg & speed. */
export function finalePower({
  level,
  permDmg,
  damageUpgrades,
  multishotUpgrades,
  firerateUpgrades,
  enemyMult,
}: FinalePowerInput): number {
  return (
    level * FINALE_POWER_LEVEL +
    permDmg +
    damageUpgrades * FINALE_POWER_DAMAGE_UPGRADE +
    multishotUpgrades * FINALE_POWER_MULTISHOT +
    firerateUpgrades * FINALE_POWER_FIRERATE +
    (enemyMult - 1) * FINALE_POWER_DIFFICULTY
  );
}

/** HP multiplier from power (~3.2× weak → ~5.6× godlike). */
export function finaleHpMult(power: number): number {
  return FINALE_HP_BASE + Math.min(FINALE_HP_POWER_CAP, power);
}

export function finaleDmgMult(power: number): number {
  return FINALE_DMG_BASE + Math.min(FINALE_DMG_POWER_CAP, power * FINALE_DMG_POWER_SCALE);
}

export function finaleSpeedMult(power: number): number {
  return FINALE_SPEED_BASE + Math.min(FINALE_SPEED_POWER_CAP, power * FINALE_SPEED_POWER_SCALE);
}
