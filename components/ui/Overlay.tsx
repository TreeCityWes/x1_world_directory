"use client";

import { useEffect } from "react";
import { useWorld } from "@/lib/store";

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
      <div className="absolute left-5 top-4 space-y-2.5">
        <a
          href="https://x1.ninja"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim transition-colors hover:text-gold"
        >
          watch <span className="text-gold">x1 ninja</span> run the world — visit{" "}
          <span className="text-cyan underline decoration-dotted underline-offset-2">x1.ninja</span>{" "}
          for charting, wallet &amp; validator tools ↗
        </a>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
          <span className="mr-1 rounded border border-gold/60 px-1.5 py-0.5 text-gold">
            w a s d
          </span>{" "}
          use your keyboard to run the world
        </p>
      </div>

      <h1 className="absolute bottom-4 left-5 text-5xl font-semibold leading-none tracking-tighter sm:text-6xl">
        x1<span className="text-gold">.world</span>
      </h1>
    </div>
  );
}
