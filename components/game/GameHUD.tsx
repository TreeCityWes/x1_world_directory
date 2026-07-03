"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UPGRADES, useGame } from "@/lib/gameStore";

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

  if (mode === "explore") return null;

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
      {/* bars — bottom center of the world pane */}
      <div className="pointer-events-none absolute bottom-16 left-1/2 w-[min(300px,60%)] -translate-x-1/2 space-y-1.5">
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

      {/* run stats — under the focus-header slot */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(9,13,28,0.7)] px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur-md">
        <span className="text-gold">block {hud.block}</span>
        <span className="mx-2 text-ink-dim">·</span>lv {hud.level}
        <span className="mx-2 text-ink-dim">·</span>{hud.kills} kills
        <span className="mx-2 text-ink-dim">·</span>
        <span className="text-cyan">{hud.captured} sites</span>
      </div>

      {/* quit chip */}
      {mode === "play" && (
        <button
          onClick={quit}
          className="pointer-events-auto absolute right-4 top-3 rounded-md border border-white/15 bg-space/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim backdrop-blur transition-colors hover:border-gold/60 hover:text-gold"
        >
          esc — quit run
        </button>
      )}

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
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => pick(id)}
                      className="w-44 rounded-xl border border-cyan/30 bg-[rgba(9,13,28,0.92)] p-4 text-left backdrop-blur-md transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_0_30px_rgba(240,199,94,0.25)]"
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan">
                        lv {nextLv} / {u.maxLevel}
                      </p>
                      <p className="mt-1.5 text-base font-semibold tracking-tight">{u.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">{u.desc(nextLv)}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
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
                the bear market got you
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
                  onClick={start}
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
