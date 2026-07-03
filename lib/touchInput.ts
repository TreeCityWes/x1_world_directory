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
