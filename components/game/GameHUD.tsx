"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { RUN_SECONDS, useGame } from "@/lib/gameStore";
import { CaptureFlash, CaptureToast } from "@/components/game/hud/CaptureFX";
import { MenuScreen } from "@/components/game/hud/MenuScreen";
import { LevelUpScreen } from "@/components/game/hud/LevelUpScreen";
import { DeathScreen, PauseScreen, TimeUpScreen, VictoryScreen } from "@/components/game/hud/EndScreens";

const TOTAL_SITES = regions.length;

const ONBOARD_KEY = "x1world_onboarded";

/**
 * DOM HUD for survival runs: HP/XP bars, run stats, level-up cards, death
 * screen. Mounted over the world pane; only renders outside explore mode.
 */
export default function GameHUD() {
  const mode = useGame((s) => s.mode);
  const hud = useGame((s) => s.hud);
  const activeSites = useGame((s) => s.activeSites);
  const bossCard = useGame((s) => s.bossCard);
  const bossCardAt = useGame((s) => s.bossCardAt);
  const [bossCardVisible, setBossCardVisible] = useState(false);
  useEffect(() => {
    if (!bossCardAt) return;
    const show = setTimeout(() => setBossCardVisible(true), 0);
    const hide = setTimeout(() => setBossCardVisible(false), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [bossCardAt]);
  const [onboarded, setOnboarded] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(ONBOARD_KEY) === "1",
  );

  if (mode === "explore") return null;
  const dismissOnboard = () => {
    setOnboarded(true);
    localStorage.setItem(ONBOARD_KEY, "1");
  };

  // time-attack countdown (hud.time refreshes ~4x/s — plenty for mm:ss)
  const remaining = Math.max(0, RUN_SECONDS - hud.time);
  const clock = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
  const lowTime = remaining <= 30;

  return (
    <>
      {/* damage vignette */}
      <AnimatePresence>
        {hud.hit && mode === "play" && (
          <motion.div
            key="hit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute inset-0 z-40"
            style={{ boxShadow: "inset 0 0 90px 30px rgba(224, 60, 47, 0.55)" }}
          />
        )}
      </AnimatePresence>
      {/* bars — bottom center of the world pane (runs only) */}
      {(mode === "play" || mode === "levelup") && (
      <div className="pointer-events-none absolute bottom-16 left-1/2 w-[min(300px,60%)] -translate-x-1/2 space-y-1.5 max-md:bottom-4 max-md:left-3 max-md:w-[42%] max-md:translate-x-0">
        <div className="h-2 overflow-hidden rounded-full border border-white/15 bg-space/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e0563f] to-[#ff8c6b] transition-[width] duration-200"
            style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
          />
        </div>
        <div className="h-1 overflow-hidden rounded-full border border-white/10 bg-space/70">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-200"
            style={{ width: `${Math.min(100, (hud.xp / hud.xpNext) * 100)}%` }}
          />
        </div>
        {hud.shield && (
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-cyan">
            ⛨ shield active
          </p>
        )}
      </div>
      )}

      {/* run stats — under the focus-header slot */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(9,13,28,0.7)] px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur-md max-md:left-2 max-md:top-12 max-md:translate-x-0 max-md:px-2 max-md:py-1 max-md:text-[8px] max-md:tracking-[0.12em]">
        {hud.diff !== "normal" && (
          <>
            <span className={hud.diff === "cursed" ? "text-[#a78bfa]" : "text-[#e0563f]"}>
              {hud.diff}
            </span>
            <span className="mx-2 text-ink-dim">·</span>
          </>
        )}
        <span className={lowTime ? "animate-pulse text-[#ff4d4d]" : "text-cyan"}>⏱ {clock}</span>
        <span className="mx-2 text-ink-dim">·</span>
        <span className="text-gold">block {hud.block}</span>
        <span className="mx-2 text-ink-dim">·</span>lv {hud.level}
        <span className="mx-2 text-ink-dim">·</span>{hud.kills} kills
        <span className="mx-2 text-ink-dim">·</span>
        <span className="text-cyan">
          {hud.captured}/{TOTAL_SITES} sites
        </span>
        {hud.finalBoss && (
          <span className="animate-pulse text-[#ff4d4d]">
            <span className="mx-2 text-ink-dim">·</span>⚔ slay the final boss
          </span>
        )}
      </div>

      {/* first-run onboarding — one line, dismiss once, never again */}
      {mode === "play" && !onboarded && (
        <div className="pointer-events-auto absolute left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-gold/40 bg-[rgba(9,13,28,0.9)] px-4 py-2 backdrop-blur max-md:top-24 max-md:w-[92%] max-md:justify-between max-md:gap-2 max-md:px-3">
          <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.15em] text-gold max-md:text-[9px]">
            capture all {TOTAL_SITES} glowing sites to win — follow the arrows · grab coins to
            level up
          </p>
          <button
            onClick={dismissOnboard}
            aria-label="dismiss"
            className="shrink-0 text-sm text-ink-dim transition-colors hover:text-gold"
          >
            ✕
          </button>
        </div>
      )}

      {mode === "play" && <CaptureToast />}
      {mode === "play" && <CaptureFlash />}

      {/* MOBILE quest ribbon — capture progress + live targets pinned over the
          canvas so phone players don't scroll to the side panel mid-fight */}
      {mode === "play" && onboarded && (
        <div className="pointer-events-none absolute inset-x-2 top-[70px] z-30 hidden rounded-lg border border-white/10 bg-[rgba(9,13,28,0.82)] px-2.5 py-1.5 backdrop-blur max-md:block">
          <div className="flex items-center justify-between font-mono text-[8px] font-bold uppercase tracking-[0.14em]">
            <span className="text-cyan">
              ⚔ {hud.captured}/{TOTAL_SITES} captured
            </span>
            {hud.finalBoss && <span className="animate-pulse text-[#ff4d4d]">slay the boss</span>}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-gold transition-all"
              style={{ width: `${(hud.captured / TOTAL_SITES) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex gap-1.5 overflow-hidden">
            {activeSites.map((id) => {
              const r = regions.find((x) => x.id === id);
              if (!r) return null;
              return (
                <span
                  key={id}
                  className="truncate rounded px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: r.accent, background: `${r.accent}1a` }}
                >
                  ▸ {r.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* boss entrance card — brief danger nameplate */}
      <AnimatePresence>
        {mode === "play" && bossCard && bossCardVisible && (
          <motion.div
            key={bossCardAt}
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="pointer-events-none absolute inset-x-0 top-24 z-40 grid place-items-center max-md:top-32"
          >
            <div
              className="rounded-xl border-2 border-[#ff4d4d]/70 bg-[rgba(28,8,10,0.88)] px-6 py-2.5 text-center backdrop-blur"
              style={{ boxShadow: "0 0 40px rgba(255,77,77,0.35)" }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-[#ff8a8a]">
                ⚠ boss detected
              </p>
              <p className="mt-1 text-xl font-black tracking-[0.06em] text-[#ff4d4d] max-md:text-base">
                {bossCard}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* low health — restrained heartbeat vignette */}
      {mode === "play" && hud.maxHp > 0 && hud.hp / hud.maxHp < 0.25 && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-30"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "inset 0 0 140px 30px rgba(224,60,50,0.45)" }}
        />
      )}

      {/* pause chip */}
      {mode === "play" && (
        <button
          onClick={() => useGame.getState().pause()}
          aria-label="pause"
          title="pause"
          className="pointer-events-auto absolute right-4 top-3 rounded-md border border-white/15 bg-space/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim backdrop-blur transition-colors hover:border-gold/60 hover:text-gold max-md:grid max-md:h-11 max-md:w-11 max-md:place-items-center max-md:p-0 max-md:text-base"
        >
          <span className="max-md:hidden">esc — pause</span>
          <span className="md:hidden">⏸</span>
        </button>
      )}

      {/* pause screen — interruptions never cost the run */}
      <AnimatePresence>{mode === "paused" && <PauseScreen />}</AnimatePresence>

      {/* run menu — pick your bet (Normal / Hard / Cursed) */}
      <AnimatePresence>{mode === "menu" && <MenuScreen />}</AnimatePresence>

      {/* level-up cards */}
      <AnimatePresence>{mode === "levelup" && <LevelUpScreen />}</AnimatePresence>

      {/* victory screen — every ecosystem project captured */}
      <AnimatePresence>{mode === "won" && <VictoryScreen />}</AnimatePresence>

      {/* death screen */}
      <AnimatePresence>{mode === "dead" && <DeathScreen />}</AnimatePresence>

      {/* time-attack bell — the clock ran out. The EXPECTED end for most runs,
          so it's a neutral score bank, not a death card. */}
      <AnimatePresence>{mode === "timeup" && <TimeUpScreen />}</AnimatePresence>
    </>
  );
}
