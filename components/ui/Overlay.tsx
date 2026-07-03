"use client";

import { useEffect } from "react";
import { useWorld } from "@/lib/store";
import FocusHeader from "@/components/ui/FocusHeader";
import TouchPad from "@/components/ui/TouchPad";

/**
 * HUD for the LEFT screen only: wordmark + tribute note over the world.
 * E locks focus on the nearby project; Esc releases it. The right screen
 * (SidePanel) lives in the console layout, not here.
 */
export default function Overlay() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { nearId, select } = useWorld.getState();
      if (e.code === "KeyE" && nearId) select(nearId);
      if (e.code === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* top-left: controls hint only (top-center belongs to the focus header) */}
      <p className="absolute left-5 top-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim max-md:hidden">
        keyboard:{" "}
        <span className="rounded border border-gold/60 px-1.5 py-0.5 text-gold">w a s d</span>{" "}
        <span className="text-ink">run the world</span>
      </p>
      <p className="absolute left-4 top-3 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim md:hidden">
        drag to spin · pad to run
      </p>

      {/* bottom-right: the x1.ninja spot, out of everyone's way */}
      <a
        href="https://x1.ninja"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto absolute bottom-4 right-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim transition-colors hover:text-gold max-md:hidden"
      >
        watch <span className="text-gold">x1 ninja</span> run the world —{" "}
        <span className="text-cyan underline decoration-dotted underline-offset-2">x1.ninja</span> ↗
      </a>

      <FocusHeader />

      <TouchPad />

      <h1 className="absolute bottom-4 left-5 text-5xl font-semibold leading-none tracking-tighter max-md:bottom-3 max-md:text-2xl md:text-6xl">
        x1<span className="text-gold">.world</span>
      </h1>
    </div>
  );
}
