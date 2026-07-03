"use client";

import { useEffect } from "react";
import { useWorld } from "@/lib/store";
import { useGame } from "@/lib/gameStore";
import FocusHeader from "@/components/ui/FocusHeader";
import TouchPad from "@/components/ui/TouchPad";
import GameHUD from "@/components/game/GameHUD";

/**
 * HUD for the LEFT screen: EXPLORE/SURVIVE tabs, wordmark, hints, focus
 * header (explore) or game HUD (survive). E locks focus, Esc releases /
 * quits a run.
 */
export default function Overlay() {
  const mode = useGame((s) => s.mode);
  const startGame = useGame((s) => s.start);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const world = useWorld.getState();
      const game = useGame.getState();
      if (e.code === "KeyE" && game.mode === "explore" && world.nearId) world.select(world.nearId);
      if (e.code === "Escape") {
        if (game.mode === "play") game.quit();
        else world.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* mode tabs — top-left */}
      <div className="pointer-events-auto absolute left-4 top-3 flex overflow-hidden rounded-lg border border-white/15 font-mono text-[10px] uppercase tracking-[0.18em] backdrop-blur">
        <button
          onClick={() => mode !== "explore" && useGame.getState().quit()}
          className={`px-3 py-1.5 transition-colors ${
            mode === "explore"
              ? "bg-gold text-space"
              : "bg-space/70 text-ink-dim hover:text-gold"
          }`}
        >
          🌐 explore
        </button>
        <button
          onClick={() => mode === "explore" && startGame()}
          className={`px-3 py-1.5 transition-colors ${
            mode !== "explore"
              ? "bg-gold text-space"
              : "bg-space/70 text-ink-dim hover:text-gold"
          }`}
        >
          🥷 survive
        </button>
      </div>

      {/* controls hint — below the tabs */}
      <p className="absolute left-4 top-14 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim max-md:hidden">
        keyboard: <span className="rounded border border-gold/60 px-1 py-0.5 text-gold">wasd</span>{" "}
        {mode === "explore" ? "run the world" : "dodge & weave"}
      </p>
      <p className="absolute left-4 top-14 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim md:hidden">
        drag to spin · pad to run
      </p>

      {/* bottom-right: the x1.ninja spot (explore only) */}
      {mode === "explore" && (
        <a
          href="https://x1.ninja"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto absolute bottom-4 right-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim transition-colors hover:text-gold max-md:hidden"
        >
          watch <span className="text-gold">x1 ninja</span> run the world —{" "}
          <span className="text-cyan underline decoration-dotted underline-offset-2">x1.ninja</span>{" "}
          ↗
        </a>
      )}

      <h1 className="absolute bottom-4 left-5 text-5xl font-semibold leading-none tracking-tighter max-md:bottom-3 max-md:text-2xl md:text-6xl">
        x1<span className="text-gold">.world</span>
      </h1>

      {mode === "explore" && <FocusHeader />}
      <GameHUD />

      <TouchPad />
    </div>
  );
}
