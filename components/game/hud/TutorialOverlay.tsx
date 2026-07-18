"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/gameStore";

const TUTORIAL_KEY = "x1world_tutorial_v1";

/**
 * First-run interactive tutorial for X1 Ninja Survivors.
 *
 * Step 1 — Move: point the player toward the glowing compass arrows.
 * Step 2 — Capture: celebrate the first site capture and explain powers.
 * Step 3 — Level up: prompt the player to pick their first upgrade.
 *
 * The overlay is DOM-only so it survives mode changes and does not need
 * 3D-to-screen projection. Phase transitions are driven by game events
 * in GameLayer and gameStore; only the tap-to-dismiss action lives here.
 */
export function TutorialOverlay() {
  const mode = useGame((s) => s.mode);
  const phase = useGame((s) => s.tutorialPhase);
  const completed = useGame((s) => s.tutorialCompleted);
  const setPhase = useGame((s) => s.setTutorialPhase);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem(TUTORIAL_KEY, "1");
    setPhase("done");
  };

  if (completed || phase === "done") return null;
  if (mode !== "play" && mode !== "levelup") return null;

  return (
    <AnimatePresence mode="wait">
      {(phase === "move" || phase === "capture-wait") && (
        <motion.div
          key="move"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-50"
        >
          <div className="absolute inset-0 bg-space/35" />
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-center">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="text-3xl text-gold"
            >
              ↓
            </motion.div>
            <div className="mt-2 rounded-lg border border-gold/40 bg-[rgba(9,13,28,0.92)] px-4 py-2.5 backdrop-blur">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
                Follow the glowing arrows
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim">
                Walk to the nearest glowing site
              </p>
            </div>
          </div>
          <button
            onClick={finish}
            className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-white/20 bg-space/80 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim transition-colors hover:border-gold/60 hover:text-gold"
          >
            skip tutorial
          </button>
        </motion.div>
      )}

      {phase === "capture" && (
        <motion.div
          key="capture"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/50"
          onClick={() => setPhase("capture-wait")}
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border-2 border-gold bg-gold/10 text-2xl text-gold"
            >
              ✓
            </motion.div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
              Site captured
            </p>
            <p className="mt-1 max-w-[260px] font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-ink">
              Every site grants a permanent power. Capture them all to unlock the final boss.
            </p>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim/70">
              tap anywhere to continue
            </p>
          </div>
        </motion.div>
      )}

      {phase === "levelup" && mode === "play" && (
        <motion.div
          key="levelup-wait"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-50"
        >
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center">
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="text-2xl text-gold"
            >
              ↑
            </motion.div>
            <div className="mt-1 rounded-lg border border-gold/40 bg-[rgba(9,13,28,0.92)] px-4 py-2 backdrop-blur">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
                Grab coins to level up
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "levelup" && mode === "levelup" && (
        <motion.div
          key="levelup-pick"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-50"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[130%] text-center">
            <div className="rounded-lg border border-gold/40 bg-[rgba(9,13,28,0.92)] px-4 py-2 backdrop-blur">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
                Level up — pick a power
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim">
                Gold cards are evolutions when you meet the requirements
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Reset tutorial for debugging or a "how to play" replay button. */
export function resetTutorial() {
  if (typeof window !== "undefined") localStorage.removeItem(TUTORIAL_KEY);
}
