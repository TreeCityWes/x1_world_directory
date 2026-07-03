/**
 * Per-frame movement values shared imperatively between the planet controller
 * (which writes them) and the character (which reads them for walk animation
 * and facing). Deliberately NOT React state — this is the 60fps hot path.
 *
 * vx/vz are the character's apparent surface velocity in world units/s
 * (+x = screen right, -z = away from camera).
 */
export const moveState = {
  vx: 0,
  vz: 0,
  speed: 0,
  /** camera azimuth (rad) — Rig writes, input mapping reads (camera-relative WASD) */
  camAz: 0,
  /** knockback impulse (planet angular velocity) — GameLayer writes, Planet consumes */
  pushVX: 0,
  pushVZ: 0,
  /** true while shoving through an enemy — Planet applies extra drag this frame */
  contactSlow: false,
};
