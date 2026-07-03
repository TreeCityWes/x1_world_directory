// Tracks the user's reduced-motion preference for the imperative R3F canvas
// loops. globals.css already zeros CSS/DOM animation durations under the media
// query; framer-motion is covered by <MotionConfig reducedMotion="user">. This
// flag is for the decorative motion driven inside useFrame (globe breathing,
// idle drift, character bob/scarf).
export const prefersReducedMotion = { current: false };

if (typeof window !== "undefined" && "matchMedia" in window) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  prefersReducedMotion.current = mq.matches;
  mq.addEventListener("change", (e) => {
    prefersReducedMotion.current = e.matches;
  });
}
