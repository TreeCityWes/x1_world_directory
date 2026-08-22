/**
 * Mobile virtual-joystick state. Analog vector, -1..1 on each axis
 * (y+ = forward/up-screen). The planet controller adds this to the keyboard
 * direction, so touch and keys are interchangeable. Mutable module state on
 * purpose: read every frame, never re-renders React.
 */
export const touchStick = {
  x: 0,
  y: 0,
  active: false,
};

/** True while the user is drag-spinning the globe (explore). Rig reads this
 *  so pointer drift doesn't also swing the marketing camera. */
export const touchDrag = {
  globe: false,
};

/** Bottom-right safe zone reserved for the virtual stick (px from edges). */
export const STICK_ZONE = { inset: 160, bottom: 140 };
export function inStickZone(clientX: number, clientY: number) {
  if (typeof window === "undefined") return false;
  return (
    clientX >= window.innerWidth - STICK_ZONE.inset &&
    clientY >= window.innerHeight - STICK_ZONE.bottom
  );
}
