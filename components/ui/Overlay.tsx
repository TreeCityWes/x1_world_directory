"use client";

import { useEffect, useRef, useState } from "react";
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
  const openMenu = useGame((s) => s.openMenu);
  const [escArmed, setEscArmed] = useState(false);
  const escTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const world = useWorld.getState();
      const game = useGame.getState();
      if (e.code === "KeyE" && game.mode === "explore" && world.nearId) world.select(world.nearId);
      if (e.code === "Escape") {
        if (game.mode === "play") {
          // mid-run quits need a confirm: press Esc twice within 1.5s
          setEscArmed((armed) => {
            if (armed) {
              game.quit();
              return false;
            }
            if (escTimer.current) clearTimeout(escTimer.current);
            escTimer.current = setTimeout(() => setEscArmed(false), 1500);
            return true;
          });
        } else if (game.mode === "menu" || game.mode === "won") {
          game.quit();
        } else {
          world.select(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* mode tabs — big, bright, unmissable */}
      <div className="pointer-events-auto absolute left-4 top-3 flex gap-2">
        <button
          onClick={() => mode !== "explore" && useGame.getState().quit()}
          className={`rounded-xl border-2 px-4 py-2 font-mono text-sm font-bold uppercase tracking-[0.14em] backdrop-blur transition-all hover:-translate-y-0.5 max-md:px-3 max-md:text-xs ${
            mode === "explore"
              ? "border-cyan bg-gradient-to-b from-[#39c7f5] to-[#1e6fff] text-white shadow-[0_0_24px_rgba(57,199,245,0.55)]"
              : "border-white/20 bg-space/70 text-ink-dim hover:border-cyan/70 hover:text-cyan"
          }`}
        >
          🌐 explore
        </button>
        <button
          onClick={() => mode === "explore" && openMenu()}
          className={`rounded-xl border-2 px-4 py-2 font-mono text-sm font-bold uppercase tracking-[0.14em] backdrop-blur transition-all hover:-translate-y-0.5 max-md:px-3 max-md:text-xs ${
            mode !== "explore"
              ? "border-gold bg-gradient-to-b from-[#ffd97a] to-[#c9921e] text-space shadow-[0_0_24px_rgba(240,199,94,0.6)]"
              : "animate-pulse border-gold/60 bg-space/70 text-gold shadow-[0_0_16px_rgba(240,199,94,0.25)] hover:animate-none hover:border-gold hover:shadow-[0_0_24px_rgba(240,199,94,0.5)]"
          }`}
        >
          🥷 game
        </button>
      </div>

      {/* controls hint — below the tabs (explore only; the run HUD covers play) */}
      {mode === "explore" && (
        <>
          <p className="absolute left-4 top-14 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim max-md:hidden">
            keyboard:{" "}
            <span className="rounded border border-gold/60 px-1 py-0.5 text-gold">wasd</span> run the
            world
          </p>
          <p className="absolute left-4 top-14 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim md:hidden">
            drag to spin · pad to run
          </p>
        </>
      )}

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
      {escArmed && mode === "play" && (
        <p className="absolute bottom-32 left-1/2 -translate-x-1/2 rounded-md border border-[#e0563f]/70 bg-space/80 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ff8c6b] backdrop-blur">
          press esc again to abandon the run
        </p>
      )}
      <GameHUD />

      <TouchPad />
    </div>
  );
}
