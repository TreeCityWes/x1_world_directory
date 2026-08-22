"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { POWER_LABEL, regions } from "@/lib/regions";
import { useGame } from "@/lib/gameStore";

/** Lower-right flash when a site is captured: screenshot + name + power.
 *  Desktop-only (max-md:hidden): the card ate half a phone screen, and the
 *  center flash + quest ribbon already announce the capture there. */
export function CaptureToast() {
  const capturedIds = useGame((s) => s.capturedIds);
  const [toast, setToast] = useState<(typeof regions)[number] | null>(null);
  const seen = useRef(0);

  useEffect(() => {
    if (capturedIds.length > seen.current) {
      const r = regions.find((x) => x.id === capturedIds[capturedIds.length - 1]);
      if (r) {
        const show = setTimeout(() => setToast(r), 0);
        const hide = setTimeout(() => setToast(null), 3400);
        seen.current = capturedIds.length;
        return () => {
          clearTimeout(show);
          clearTimeout(hide);
        };
      }
    }
    seen.current = capturedIds.length;
  }, [capturedIds]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 40, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="pointer-events-none absolute bottom-4 right-4 z-40 w-48 overflow-hidden rounded-xl border bg-[rgba(9,13,28,0.94)] backdrop-blur max-md:hidden"
          style={{ borderColor: toast.accent }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- site capture */}
          <img
            src={toast.screenshot}
            alt={toast.name}
            className="aspect-[8/5] w-full object-cover object-top"
          />
          <div className="px-3 py-2">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-gold">
              ↯ captured!
            </p>
            <p className="truncate text-sm font-bold leading-tight">{toast.name}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Center-screen reward beat when a site is captured: big project name +
 *  the bonus it grants, in bold display type. Pairs with the corner toast. */
export function CaptureFlash() {
  const capturedIds = useGame((s) => s.capturedIds);
  const [flash, setFlash] = useState<{ id: string; name: string; power: string; accent: string } | null>(
    null,
  );
  const seen = useRef(0);

  useEffect(() => {
    if (capturedIds.length > seen.current) {
      const r = regions.find((x) => x.id === capturedIds[capturedIds.length - 1]);
      seen.current = capturedIds.length;
      if (r) {
        const power = POWER_LABEL[r.kind] ?? "captured";
        const show = setTimeout(
          () => setFlash({ id: r.id, name: r.name, power, accent: r.accent }),
          0,
        );
        const hide = setTimeout(() => setFlash(null), 1900);
        return () => {
          clearTimeout(show);
          clearTimeout(hide);
        };
      }
    }
    seen.current = capturedIds.length;
  }, [capturedIds]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-x-0 top-[15%] z-40 flex flex-col items-center text-center max-md:top-[20%]"
        >
          <motion.p
            initial={{ scale: 0.6, y: 18, letterSpacing: "0.4em" }}
            animate={{ scale: 1, y: 0, letterSpacing: "0.02em" }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gold"
          >
            ↯ site captured
          </motion.p>
          <motion.h2
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.04 }}
            className="font-display mt-1 text-2xl font-bold tracking-tight max-md:text-lg"
            style={{
              color: "#fff",
              // the one earned glow in this decluttered UI: mid-run capture celebration — halved intensity
              textShadow: `0 0 6px ${flash.accent}, 0 0 14px ${flash.accent}88, 0 2px 4px rgba(0,0,0,0.6)`,
            }}
          >
            {flash.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-1.5 rounded-full border px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-[0.14em] backdrop-blur max-md:text-[10px]"
            style={{
              color: flash.accent,
              borderColor: `${flash.accent}aa`,
              background: `${flash.accent}1a`,
            }}
          >
            {flash.power}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
