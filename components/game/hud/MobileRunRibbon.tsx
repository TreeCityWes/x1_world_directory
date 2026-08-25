"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { useGame, effectiveRunSeconds, type DifficultyId } from "@/lib/gameStore";
import {
  isMuted,
  isMusicMuted,
  subscribeMute,
  subscribeMusicMute,
  toggleMute,
  toggleMusicMute,
} from "@/lib/sound";

const TOTAL_SITES = regions.length;

const DIFF_TAG: Record<DifficultyId, { text: string; color: string }> = {
  normal: { text: "N", color: "#7dd3fc" },
  hard: { text: "H", color: "#e0563f" },
  cursed: { text: "C", color: "#e8eefc" },
};

/**
 * Consolidated mobile top chrome for active runs. Replaces the overlapping
 * stats bar, pause chip, mute button, and quest ribbon with a single ribbon
 * that can expand to show active target chips.
 */
export function MobileRunRibbon() {
  const mode = useGame((s) => s.mode);
  const hud = useGame((s) => s.hud);
  const activeSites = useGame((s) => s.activeSites);
  const [expanded, setExpanded] = useState(false);
  const muted = useSyncExternalStore(subscribeMute, isMuted, () => false);
  const musicMuted = useSyncExternalStore(subscribeMusicMute, isMusicMuted, () => false);

  // Only during live run chrome — hide on menu / end screens / explore.
  if (mode !== "play" && mode !== "paused" && mode !== "levelup") return null;

  const remaining = Math.max(0, effectiveRunSeconds() - hud.time);
  const clock = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
  const lowTime = remaining <= 30;
  const diff = DIFF_TAG[hud.diff];

  const flashSite = (id: string) => {
    // transient signal consumed by GameLayer to briefly intensify the arrow
    useGame.setState({ flashSiteId: id });
    setTimeout(() => useGame.setState({ flashSiteId: null }), 900);
  };

  return (
    <div className="pointer-events-auto absolute inset-x-2 top-3 z-40 hidden flex-col gap-1.5 pt-[env(safe-area-inset-top)] max-md:flex">
      {/* main row */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[rgba(9,13,28,0.88)] px-2 py-1.5 backdrop-blur">
        <div className="flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
          <span
            className="grid h-5 w-5 place-items-center rounded border text-[9px]"
            style={{ color: diff.color, borderColor: `${diff.color}50`, background: `${diff.color}14` }}
          >
            {diff.text}
          </span>
          <span className={lowTime ? "text-danger-bright" : "text-cyan"}>{clock}</span>
          <span className="text-ink-dim/60">|</span>
          <span className="text-gold">
            {hud.captured}/{TOTAL_SITES}
          </span>
          <span className="text-ink-dim/60">|</span>
          <span className="text-ink">lv {hud.level}</span>
          <span className="text-ink-dim/60">|</span>
          <span className="text-ink-dim">{hud.kills}k</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label="toggle targets"
            className={`grid h-11 w-11 place-items-center rounded border text-[9px] transition-colors ${
              expanded
                ? "border-cyan/60 bg-cyan/10 text-cyan"
                : "border-white/15 bg-space/60 text-ink-dim hover:text-cyan"
            }`}
          >
            {expanded ? "▲" : "▼"}
          </button>
          <button
            onClick={() => toggleMute()}
            aria-label={muted ? "unmute sfx" : "mute sfx"}
            className={`grid h-11 w-11 place-items-center rounded border text-[9px] transition-colors ${
              muted
                ? "border-white/15 bg-space/60 text-ink-dim"
                : "border-gold/60 bg-gold/10 text-gold"
            }`}
          >
            {muted ? "sfx✕" : "sfx♪"}
          </button>
          <button
            onClick={() => toggleMusicMute()}
            aria-label={musicMuted ? "unmute music" : "mute music"}
            className={`grid h-11 w-11 place-items-center rounded border text-[9px] transition-colors ${
              musicMuted
                ? "border-white/15 bg-space/60 text-ink-dim"
                : "border-cyan/60 bg-cyan/10 text-cyan"
            }`}
          >
            {musicMuted ? "mus✕" : "mus♫"}
          </button>
          <button
            onClick={() => useGame.getState().pause()}
            aria-label="pause"
            className="grid h-11 w-11 place-items-center rounded border border-white/15 bg-space/60 text-ink-dim transition-colors hover:border-gold/60 hover:text-gold"
          >
            ⏸
          </button>
        </div>
      </div>

      {/* expandable targets row */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="rounded-lg border border-white/10 bg-[rgba(9,13,28,0.9)] px-2.5 py-2 backdrop-blur"
          >
            <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim">
              <span className="text-cyan">active targets</span>
              {hud.finalBoss && <span className="text-danger-bright">slay the boss</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeSites.length === 0 && hud.finalBoss && (
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-danger-bright bg-danger/10">
                  ⚔ final boss
                </span>
              )}
              {activeSites.map((id) => {
                const r = regions.find((x) => x.id === id);
                if (!r) return null;
                return (
                  <button
                    key={id}
                    onClick={() => flashSite(id)}
                    className="truncate rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-transform active:scale-95"
                    style={{ color: r.accent, background: `${r.accent}1a` }}
                  >
                    ▸ {r.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-gold transition-all"
                style={{ width: `${(hud.captured / TOTAL_SITES) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
