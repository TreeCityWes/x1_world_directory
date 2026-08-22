"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/gameStore";

const ARRIVAL_KEY = "x1world_arrival_v1";

function initialArrivalShow() {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(ARRIVAL_KEY) === "1") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    localStorage.setItem(ARRIVAL_KEY, "1");
    return false;
  }
  return true;
}

/** First-visit cinematic beat: star-field drifts in, title + pitch fade, then release. */
export default function ArrivalIntro() {
  const mode = useGame((s) => s.mode);
  const [show, setShow] = useState(initialArrivalShow);

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(ARRIVAL_KEY, "1");
    setShow(false);
  };

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(dismiss, 2800);
    return () => clearTimeout(t);
  }, [show]);

  if (mode !== "menu" && mode !== "explore") return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="arrival"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onClick={dismiss}
          className="pointer-events-auto absolute inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(4,6,15,0.35)_0%,rgba(4,6,15,0.82)_70%)]"
        >
          <motion.p
            initial={{ opacity: 0, y: 12, letterSpacing: "0.35em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.22em" }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan"
          >
            the x1 ecosystem
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-display mt-3 text-5xl font-bold tracking-tighter max-md:text-3xl"
          >
            x1<span className="text-gold">.world</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 max-w-xs px-6 text-center text-sm leading-relaxed text-ink-dim max-md:text-xs"
          >
            A tiny explorer walks a living blue world — every region is a real X1 project.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1.4, duration: 0.4 }}
            className="mt-8 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim/60"
          >
            tap to enter
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
