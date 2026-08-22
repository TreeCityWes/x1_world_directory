"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DIFFICULTIES, useGame, getPb, activeMutator, type DifficultyId } from "@/lib/gameStore";
import { CHARACTERS } from "@/lib/characters";
import { sfx } from "@/lib/sound";
import { CharacterSelect } from "@/components/game/hud/CharacterSelect";

/** Run menu — pick your character, pick your bet (Normal / Hard / Cursed). */
export function MenuScreen() {
  const character = useGame((s) => s.character);
  const start = useGame((s) => s.start);
  const quit = useGame((s) => s.quit);
  const storePb = useGame((s) => s.pb);
  const mutator = activeMutator();
  // difficulty is a SELECTION now, committed by the big start button
  const [diff, setDiff] = useState<DifficultyId>("normal");

  // keep the store's per-character/difficulty PB in sync with the menu selection
  useEffect(() => {
    useGame.setState({ pb: getPb(character, diff) });
  }, [character, diff]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/60 backdrop-blur-sm max-md:fixed"
    >
      <div className="max-h-full overflow-y-auto py-4 text-center max-md:w-full max-md:pb-36">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
          select your character
        </p>
        <CharacterSelect />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-gold max-md:hidden">
          choose your run
        </p>
        <div className="mt-3 flex flex-wrap items-stretch justify-center gap-3 px-4 max-md:hidden">
          {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id, i) => {
            const d = DIFFICULTIES[id];
            const selDiff = id === diff;
            const tone =
              id === "cursed" ? "#e8eefc" : id === "hard" ? "#e0563f" : "#7dd3fc";
            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (selDiff) return;
                  sfx.ui();
                  setDiff(id);
                }}
                className="relative w-44 rounded-xl border bg-space-2/90 p-3.5 text-left transition-colors"
                style={{
                  borderColor: selDiff ? tone : `${tone}44`,
                  background: selDiff ? `${tone}14` : undefined,
                }}
              >
                <p className="font-display text-lg font-bold tracking-tight">{d.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-dim">{d.desc}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  {d.scoreMult}× score
                </p>
              </motion.button>
            );
          })}
        </div>
        {/* weekly mutator chip — the current ISO-week twist */}
        {mutator.id !== "none" && (
          <div className="mt-3 hidden rounded-lg border border-cyan/20 bg-cyan/5 px-4 py-2 md:block">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan">
              weekly mutator
            </p>
            <p className="text-sm font-semibold tracking-tight text-ink">{mutator.name}</p>
            <p className="text-[11px] text-ink-dim">{mutator.desc}</p>
          </div>
        )}
        {/* the CTA — the screen finally ends in a button, not a shrug */}
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-dim max-md:hidden">
          selected: <span className="text-ink">{CHARACTERS[character].name}</span> ·{" "}
          <span className="text-ink">{DIFFICULTIES[diff].name}</span>
          {storePb > 0 && (
            <span className="ml-2 text-gold">★ pb {storePb.toLocaleString()}</span>
          )}
        </p>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            sfx.ui();
            start(diff);
          }}
          className="mt-2 rounded-xl border border-gold bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-10 py-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-space shadow-[0_0_20px_rgba(240,199,94,0.35)] max-md:hidden"
        >
          ▶ start {DIFFICULTIES[diff].name} run
        </motion.button>
        <div className="max-md:hidden">
          <button
            onClick={quit}
            className="mt-4 rounded-md border border-white/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
          >
            back to explore
          </button>
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-[rgba(5,8,18,0.96)] px-3 pt-2.5 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-white/15">
          {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => {
            const selectedDiff = id === diff;
            const tone = id === "cursed" ? "#e8eefc" : id === "hard" ? "#e0563f" : "#7dd3fc";
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (selectedDiff) return;
                  sfx.ui();
                  setDiff(id);
                }}
                aria-pressed={selectedDiff}
                className="h-9 border-r border-white/10 bg-space-2/80 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink-dim last:border-r-0"
                style={
                  selectedDiff
                    ? { color: tone, background: `${tone}1f`, boxShadow: `inset 0 0 0 1px ${tone}` }
                    : undefined
                }
              >
                {DIFFICULTIES[id].name}
              </button>
            );
          })}
        </div>
        {mutator.id !== "none" && (
          <div className="mt-2 rounded-md border border-cyan/20 bg-cyan/5 px-3 py-1.5 md:hidden">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">weekly mutator</p>
            <p className="text-xs font-semibold text-ink">{mutator.name}</p>
            <p className="text-[10px] text-ink-dim">{mutator.desc}</p>
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={quit}
            aria-label="back to explore"
            title="back to explore"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-white/20 bg-space-2 text-lg text-ink-dim"
          >
            ←
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <button
              type="button"
              onClick={() => {
                sfx.ui();
                start(diff);
              }}
              className="h-12 min-w-0 flex-1 rounded-md border border-gold bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-space shadow-[0_0_20px_rgba(240,199,94,0.35)]"
            >
              ▶ start {DIFFICULTIES[diff].name} run
            </button>
            {storePb > 0 && (
              <p className="mt-0.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-gold">
                ★ pb {storePb.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
