"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { effectiveRunSeconds, useGame } from "@/lib/gameStore";
import { CaptureFlash, CaptureToast } from "@/components/game/hud/CaptureFX";
import { MenuScreen } from "@/components/game/hud/MenuScreen";
import { LevelUpScreen } from "@/components/game/hud/LevelUpScreen";
import { DeathScreen, PauseScreen, TimeUpScreen, VictoryScreen } from "@/components/game/hud/EndScreens";
import { MobileRunRibbon } from "@/components/game/hud/MobileRunRibbon";
import { TutorialOverlay } from "@/components/game/hud/TutorialOverlay";

const TOTAL_SITES = regions.length;

/**
 * DOM HUD for survival runs: HP/XP bars, run stats, level-up cards, death
 * screen. Mounted over the world pane; only renders outside explore mode.
 */
export default function GameHUD() {
  const mode = useGame((s) => s.mode);
  const hud = useGame((s) => s.hud);
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

  if (mode === "explore") return null;
  const remaining = Math.max(0, effectiveRunSeconds() - hud.time);
  const clock = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
  const lowTime = remaining <= 30;

  return (
    <>
      <TutorialOverlay />
      <MobileRunRibbon />

      {/* damage vignette */}
      <AnimatePresence>
        {hud.hit && mode === "play" && (
          <motion.div
            key="hit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.08 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="pointer-events-none absolute inset-0 z-40"
            style={{ boxShadow: "inset 0 0 70px 22px rgba(224, 86, 63, 0.32)" }}
          />
        )}
      </AnimatePresence>
      {/* bars — bottom center of the world pane (runs only) */}
      {(mode === "play" || mode === "levelup") && (
      <div className="pointer-events-none absolute bottom-16 left-1/2 w-[min(300px,60%)] -translate-x-1/2 space-y-1.5 max-md:bottom-4 max-md:left-3 max-md:w-[42%] max-md:translate-x-0">
        <div className="h-2 overflow-hidden rounded-full border border-white/15 bg-space/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e0563f] to-[#ff7a62] transition-[width] duration-200"
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

      {/* run stats — desktop only. Mobile uses the consolidated run ribbon. */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 truncate rounded-lg border border-white/10 bg-[rgba(9,13,28,0.7)] px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur-md max-md:hidden">
        {hud.diff !== "normal" && (
          <span className="max-md:hidden">
            <span className={hud.diff === "cursed" ? "text-ink" : "text-danger"}>
              {hud.diff}
            </span>
            <span className="mx-2 text-ink-dim">·</span>
          </span>
        )}
        <span className={lowTime ? "text-danger-bright font-bold" : "text-cyan"}>⏱ {clock}</span>
        <span className="mx-2 text-ink-dim max-md:mx-1">·</span>
        <span className="text-gold max-md:hidden">block {hud.block}</span>
        <span className="mx-2 text-ink-dim max-md:hidden">·</span>lv {hud.level}
        <span className="mx-2 text-ink-dim max-md:mx-1">·</span>{hud.kills} kills
        <span className="mx-2 text-ink-dim max-md:mx-1">·</span>
        <span className="text-cyan">
          {hud.captured}/{TOTAL_SITES} sites
        </span>
        {hud.finalBoss && (
          <span className="text-danger-bright font-bold max-md:hidden">
            <span className="mx-2 text-ink-dim">·</span>⚔ slay the final boss
          </span>
        )}
      </div>

      {mode === "play" && <CaptureToast />}
      {mode === "play" && <CaptureFlash />}

      {/* boss entrance card — brief danger nameplate */}
      <AnimatePresence>
        {mode === "play" && bossCard && bossCardVisible && (
          <motion.div
            key={bossCardAt}
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="pointer-events-none absolute inset-x-0 top-24 z-40 grid place-items-center"
          >
            <div
              className="rounded-xl border border-danger-bright/70 bg-[rgba(28,8,10,0.88)] px-6 py-2.5 text-center backdrop-blur"
              style={{ boxShadow: "0 0 22px rgba(255, 122, 98, 0.22)" }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-danger-bright">
                boss detected
              </p>
              <p className="mt-1 text-xl font-black tracking-[0.06em] text-danger-bright max-md:text-base">
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
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "inset 0 0 140px 30px rgba(224,86,63,0.45)" }}
        />
      )}

      {/* pause chip — desktop only. Mobile uses the run ribbon. */}
      {mode === "play" && (
        <button
          onClick={() => useGame.getState().pause()}
          aria-label="pause"
          title="pause"
          className="pointer-events-auto absolute right-4 top-3 rounded-md border border-white/15 bg-space/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim backdrop-blur transition-colors hover:border-gold/60 hover:text-gold max-md:hidden"
        >
          esc — pause
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
