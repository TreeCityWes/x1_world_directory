"use client";

import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { useWorld } from "@/lib/store";

/**
 * Top-center header over the world: names the focused landmark (the same one
 * that's lit and shown in the console) and swaps with a blur/slide animation.
 * Lives in the HUD so it can never cover the ninja.
 */
export default function FocusHeader() {
  const id = useWorld((s) => s.selectedId ?? s.nearId ?? s.hoveredId ?? s.closestId);
  const region = regions.find((r) => r.id === id);
  if (!region) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={region.id}
          initial={{ opacity: 0, y: -14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col items-center gap-1"
        >
          <p
            className="font-mono text-[9px] uppercase tracking-[0.24em]"
            style={{ color: region.accent }}
          >
            {region.category}
          </p>
          <h2
            className="text-lg font-semibold leading-none tracking-tight text-ink max-md:text-sm"
            style={{ textShadow: `0 0 18px ${region.accent}66` }}
          >
            {region.name}
          </h2>
          <span
            className="mt-0.5 h-px w-24"
            style={{
              background: `linear-gradient(90deg, transparent, ${region.accent}, transparent)`,
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
