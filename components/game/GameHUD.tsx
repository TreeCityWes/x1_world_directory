"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { DIFFICULTIES, UPGRADES, useGame, type DifficultyId } from "@/lib/gameStore";

const TOTAL_SITES = regions.length;

// what actually got you — crypto death certificates
const DEATH_FLAVOR: Record<string, string> = {
  goblin: "exploited by a bug",
  gremlin: "burned alive by gas fees",
  whale: "it was a rug pull all along",
  "boss:whale": "swallowed whole by THE WHALE",
  "boss:nemesis": "slain by your own shadow",
};
const ONBOARD_KEY = "x1world_onboarded";

/**
 * DOM HUD for survival runs: HP/XP bars, run stats, level-up cards, death
 * screen. Mounted over the world pane; only renders outside explore mode.
 */
export default function GameHUD() {
  const mode = useGame((s) => s.mode);
  const hud = useGame((s) => s.hud);
  const choices = useGame((s) => s.choices);
  const pick = useGame((s) => s.pick);
  const start = useGame((s) => s.start);
  const quit = useGame((s) => s.quit);
  const best = useGame((s) => s.best);
  const finalScore = useGame((s) => s.finalScore);
  const deathCause = useGame((s) => s.deathCause);
  const [onboarded, setOnboarded] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(ONBOARD_KEY) === "1",
  );

  if (mode === "explore") return null;
  const dismissOnboard = () => {
    setOnboarded(true);
    localStorage.setItem(ONBOARD_KEY, "1");
  };

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
        <span className="text-gold">block {hud.block}</span>
        <span className="mx-2 text-ink-dim">·</span>lv {hud.level}
        <span className="mx-2 text-ink-dim">·</span>{hud.kills} kills
        <span className="mx-2 text-ink-dim">·</span>
        <span className="text-cyan">
          {hud.captured}/{TOTAL_SITES} sites
        </span>
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

      {/* quit chip */}
      {mode === "play" && (
        <button
          onClick={quit}
          className="pointer-events-auto absolute right-4 top-3 rounded-md border border-white/15 bg-space/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim backdrop-blur transition-colors hover:border-gold/60 hover:text-gold"
        >
          esc — quit run
        </button>
      )}

      {/* run menu — pick your bet (Normal / Hard / Cursed) */}
      <AnimatePresence>
        {mode === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/60 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                🥷 choose your run
              </p>
              <div className="mt-4 flex flex-wrap items-stretch justify-center gap-3 px-4">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id, i) => {
                  const d = DIFFICULTIES[id];
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => start(id)}
                      className={`w-48 rounded-xl border p-4 text-left backdrop-blur-md transition-all hover:-translate-y-1 ${
                        id === "cursed"
                          ? "border-[#a78bfa]/50 bg-[rgba(20,10,32,0.92)] hover:border-[#a78bfa] hover:shadow-[0_0_30px_rgba(167,139,250,0.3)]"
                          : id === "hard"
                            ? "border-[#e0563f]/50 bg-[rgba(28,12,10,0.92)] hover:border-[#e0563f] hover:shadow-[0_0_30px_rgba(224,86,63,0.3)]"
                            : "border-cyan/40 bg-[rgba(9,13,28,0.92)] hover:border-cyan hover:shadow-[0_0_30px_rgba(125,211,252,0.3)]"
                      }`}
                    >
                      <p className="text-lg font-semibold tracking-tight">{d.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">{d.desc}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                        {d.scoreMult}× score
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={quit}
                className="mt-5 rounded-md border border-white/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                back to explore
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* level-up cards */}
      <AnimatePresence>
        {mode === "levelup" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/60 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                level {hud.level} — choose an upgrade
              </p>
              <div className="mt-4 flex flex-wrap items-stretch justify-center gap-3 px-4">
                {choices.map((id, i) => {
                  const u = UPGRADES.find((x) => x.id === id)!;
                  const nextLv = (hud.upgrades[id] ?? 0) + 1;
                  const isEvo = !!u.requires;
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 20, scale: isEvo ? 0.85 : 1 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
                      onClick={() => pick(id)}
                      className={
                        isEvo
                          ? "w-44 animate-pulse rounded-xl border-2 border-gold bg-gradient-to-b from-[rgba(40,30,8,0.95)] to-[rgba(9,13,28,0.95)] p-4 text-left shadow-[0_0_40px_rgba(240,199,94,0.45)] backdrop-blur-md transition-all hover:-translate-y-1 hover:animate-none"
                          : "w-44 rounded-xl border border-cyan/30 bg-[rgba(9,13,28,0.92)] p-4 text-left backdrop-blur-md transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_0_30px_rgba(240,199,94,0.25)]"
                      }
                    >
                      <p
                        className={`font-mono text-[9px] uppercase tracking-[0.2em] ${
                          isEvo ? "text-gold" : "text-cyan"
                        }`}
                      >
                        {isEvo ? "⚡ evolution" : `lv ${nextLv} / ${u.maxLevel}`}
                      </p>
                      <p
                        className={`mt-1.5 text-base font-semibold tracking-tight ${isEvo ? "text-gold" : ""}`}
                      >
                        {u.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">{u.desc(nextLv)}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* victory screen — every ecosystem project captured */}
      <AnimatePresence>
        {mode === "won" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-gold/50 bg-[rgba(9,13,28,0.95)] p-8 text-center shadow-[0_0_60px_rgba(240,199,94,0.25)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                🥷 ecosystem complete — all {TOTAL_SITES} projects captured
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-gold">{finalScore}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                score (incl. 1000 conquest bonus) · best {best}
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
                {Math.floor(hud.time / 60)}m {Math.floor(hud.time % 60)}s · {hud.block} blocks ·{" "}
                {hud.kills} kills
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => start()}
                  className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
                >
                  run it back
                </button>
                <button
                  onClick={quit}
                  className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  explore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* death screen */}
      <AnimatePresence>
        {mode === "dead" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-[rgba(9,13,28,0.95)] p-8 text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#e0563f]">
                {DEATH_FLAVOR[deathCause] ?? "the bear market got you"}
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight">{finalScore}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                score · best {best}
              </p>
              <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
                <p>{hud.block} blocks survived · {hud.kills} kills · {hud.captured} sites</p>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => start()}
                  className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
                >
                  run it back
                </button>
                <button
                  onClick={quit}
                  className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  explore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
