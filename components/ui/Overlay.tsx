"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useWorld } from "@/lib/store";
import { useGame } from "@/lib/gameStore";
import {
  isMuted,
  isMusicMuted,
  startMusic,
  subscribeMute,
  subscribeMusicMute,
  toggleMute,
  toggleMusicMute,
} from "@/lib/sound";
import { isTyping } from "@/lib/useKeyboard";
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
  const nearId = useWorld((s) => s.nearId);
  const selectedId = useWorld((s) => s.selectedId);
  const mutedUi = useSyncExternalStore(subscribeMute, isMuted, () => false);
  const musicMutedUi = useSyncExternalStore(subscribeMusicMute, isMusicMuted, () => false);
  // active run (playing or mid level-up) — mobile top chrome collapses to a
  // single row here; the pause menu is the exit, so the mode tabs step aside
  const inRun = mode === "play" || mode === "levelup";

  useEffect(() => {
    if (mode !== "menu") startMusic();
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return; // typing a name — E/Esc are letters, not commands
      const world = useWorld.getState();
      const game = useGame.getState();
      if (e.code === "KeyE" && game.mode === "explore" && world.nearId) world.select(world.nearId);
      // P (or Esc) toggles pause — an interruption never costs the run
      if (e.code === "KeyP") {
        if (game.mode === "play") game.pause();
        else if (game.mode === "paused") game.resume();
      }
      if (e.code === "Escape") {
        if (game.mode === "play") {
          game.pause();
        } else if (game.mode === "paused") {
          game.resume();
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
      {/* mode tabs — big, bright, unmissable. Mobile hides these during an
          active run: the top chrome is one compact row, and leaving a run
          goes through pause (esc/tap pause -> abandon run), not this tab. */}
      <div
        className={`pointer-events-auto absolute left-4 top-3 flex gap-2 ${inRun ? "max-md:hidden" : ""}`}
      >
        <button
          onClick={() => {
            if (inRun) useGame.getState().pause();
            else if (mode === "explore") openMenu();
          }}
          className={`rounded-xl border px-4 py-2 font-mono text-sm font-bold uppercase tracking-[0.14em] backdrop-blur transition-all hover:-translate-y-0.5 max-md:px-3 max-md:text-xs ${
            mode !== "explore"
              ? "border-gold bg-gradient-to-b from-[#ffd97a] to-[#c9921e] text-space"
              : "animate-pulse border-gold/60 bg-space/70 text-gold hover:animate-none hover:border-gold"
          }`}
        >
          {inRun ? "⏸ pause" : "⚔ game"}
        </button>
        <button
          onClick={() => {
            const g = useGame.getState();
            // never abandon a LIVE run in one click — pause into the
            // resume/abandon choice; from any other non-explore state, leave
            if (g.mode === "play") g.pause();
            else if (g.mode !== "explore") g.quit();
          }}
          className={`rounded-xl border px-4 py-2 font-mono text-sm font-bold uppercase tracking-[0.14em] backdrop-blur transition-all hover:-translate-y-0.5 max-md:px-3 max-md:text-xs ${
            mode === "explore"
              ? "border-cyan bg-gradient-to-b from-[#39c7f5] to-[#1e6fff] text-white"
              : "border-white/20 bg-space/70 text-ink-dim hover:border-cyan/70 hover:text-cyan"
          }`}
        >
          ◉ explore
        </button>
      </div>

      {/* controls hint — below the tabs (explore only; the run HUD covers play) */}
      {mode === "explore" && (
        <>
          <p className="absolute left-4 top-14 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim max-md:hidden">
            keyboard:{" "}
            <span className="rounded border border-gold/60 px-1 py-0.5 text-gold">wasd</span> run the
            world
          </p>
          <p className="absolute left-4 top-14 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim md:hidden">
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
          className="pointer-events-auto absolute bottom-4 right-5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim transition-colors hover:text-gold max-md:hidden"
        >
          watch <span className="text-gold">x1 ninja</span> run the world —{" "}
          <span className="text-cyan underline decoration-dotted underline-offset-2">x1.ninja</span>{" "}
          ↗
        </a>
      )}

      <h1
        className={`absolute bottom-6 left-5 text-5xl font-semibold leading-none tracking-tighter max-md:bottom-3 max-md:text-2xl md:text-6xl ${
          mode !== "explore" ? "max-md:hidden" : ""
        }`}
      >
        x1<span className="text-gold">.world</span>
      </h1>
      <p className="absolute bottom-1.5 left-5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim/50 max-md:hidden">
        unofficial fan project · not affiliated with the x1 foundation
      </p>

      {/* discoverability: the E lock is invisible without this */}
      {mode === "explore" && nearId && !selectedId && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-md border border-cyan/40 bg-space/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan backdrop-blur max-md:hidden">
          press <span className="rounded border border-cyan/60 px-1 text-cyan">e</span> to lock
          focus
        </p>
      )}

      {/* sound toggles — split SFX and music so players can keep one on.
          During an active run on mobile this folds into the run ribbon. */}
      <div
        className={`pointer-events-auto absolute bottom-4 right-1/2 translate-x-1/2 flex gap-1 rounded-md border border-white/15 bg-space/70 p-1 backdrop-blur transition-colors hover:border-gold/60 ${
          inRun
            ? "max-md:hidden"
            : "max-md:bottom-auto max-md:right-2 max-md:top-14 max-md:translate-x-0"
        }`}
      >
        <button
          onClick={() => toggleMute()}
          aria-label={mutedUi ? "unmute sfx" : "mute sfx"}
          title={mutedUi ? "unmute sfx" : "mute sfx"}
          className={`rounded px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
            mutedUi ? "text-ink-dim" : "text-gold"
          }`}
        >
          {mutedUi ? "sfx off" : "sfx on"}
        </button>
        <button
          onClick={() => toggleMusicMute()}
          aria-label={musicMutedUi ? "unmute music" : "mute music"}
          title={musicMutedUi ? "unmute music" : "mute music"}
          className={`rounded px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
            musicMutedUi ? "text-ink-dim" : "text-cyan"
          }`}
        >
          {musicMutedUi ? "music off" : "music on"}
        </button>
      </div>

      {mode === "explore" && <FocusHeader />}
      <GameHUD />

      <TouchPad />
    </div>
  );
}
