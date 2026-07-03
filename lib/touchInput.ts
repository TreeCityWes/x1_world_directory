/**
 * On-screen D-pad state (mobile). Same shape as the keyboard ref — the planet
 * controller ORs the two together, so touch and keys are interchangeable.
 * Mutable module state on purpose: read every frame, never re-renders React.
 */
export const touchKeys = {
  forward: false,
  back: false,
  left: false,
  right: false,
};
