"use client";

import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { useWorld } from "@/lib/store";

/**
 * Top-center header over the world: names the focused landmark (the same one
 * that's lit and shown in the console) and swaps with a blur/slide animation.
 * Lives in the HUD so it can never cover the ninja.
 * When nearId is set (in range, not locked), shows a brief press-E chip.
 */
export default function FocusHeader() {
  const nearId = useWorld((s) => s.nearId);
  const selectedId = useWorld((s) => s.selectedId);
  const id = useWorld((s) => s.selectedId ?? s.nearId ?? s.hoveredId ?? s.closestId);
  const region = regions.find((r) => r.id === id);
  if (!region) return null;

  // in range but not yet locked — surface E next to the landmark name
  const canLock = Boolean(nearId && !selectedId);

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 w-full max-w-[min(340px,60%)] -translate-x-1/2">
      {/* contained glass chip — fixed footprint, text truncates inside */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[rgba(9,13,28,0.7)] px-4 py-2 text-center backdrop-blur-md">
        <div
          className="absolute inset-x-0 top-0 h-px transition-all duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, ${region.accent}, transparent)`,
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={region.id}
            initial={{ opacity: 0, y: -12, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(5px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <p
              className="truncate font-mono text-[9px] uppercase tracking-[0.22em]"
              style={{ color: region.accent }}
            >
              {region.category}
            </p>
            <h2
              className="font-display truncate text-base font-bold leading-tight tracking-tight text-ink max-md:text-sm"
              style={{ textShadow: `0 0 18px ${region.accent}66` }}
            >
              {region.name}
            </h2>
            {canLock && (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
                press{" "}
                <span className="rounded border border-cyan/60 px-1 text-cyan">e</span> to
                lock
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
