/**
 * Spawn telegraph timings for mobs vs bosses.
 *
 * Bosses use a dedicated `world.bossPending` pool (not mob `world.pending`)
 * so a saturated mob telegraph cannot block mid-run bosses or the finale.
 * Nameplates still fire on hatch.
 */

/** Mob spawn warning ring duration (seconds). */
export const MOB_SPAWN_TELEGRAPH = 0.7;

/** Boss / finale spawn warning — slightly longer so the tell reads. */
export const BOSS_SPAWN_TELEGRAPH = 1.1;

/** Dedicated boss telegraph slots (mid-run + finale can overlap). */
export const BOSS_PENDING_SLOTS = 2;

/** Absolute hatch time for a telegraph queued at `now`. */
export function telegraphHatchAt(
  now: number,
  duration: number = BOSS_SPAWN_TELEGRAPH,
): number {
  return now + duration;
}
