"use client";

import { motion } from "framer-motion";
import { UPGRADES, upgradeView, useGame } from "@/lib/gameStore";

// dingbat glyphs (not emoji) so upgrade cards read at a glance
const UPGRADE_ICON: Record<string, string> = {
  damage: "✦",
  firerate: "≫",
  multishot: "⁂",
  speed: "➤",
  magnet: "◎",
  vitality: "✚",
  katana: "⚔",
  arcnode: "↯",
  halo: "◉",
  armor: "⛨",
  lifesteal: "❖",
  regen: "↻",
  crit: "◈",
  bladestorm: "❂",
  tempest: "✺",
  whirlwind: "❋",
  chainreaction: "⌁",
  meltdown: "♨",
};

/** Level-up cards overlay. */
export function LevelUpScreen() {
  const hud = useGame((s) => s.hud);
  const choices = useGame((s) => s.choices);
  const pick = useGame((s) => s.pick);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/60 backdrop-blur-sm max-md:fixed"
    >
      <div className="max-h-full w-full py-6 text-center [padding-bottom:env(safe-area-inset-bottom)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
          level {hud.level} — choose an upgrade
        </p>
        <div className="mt-4 flex flex-wrap items-stretch justify-center gap-3 px-4">
          {choices.map((id, i) => {
            const u = UPGRADES.find((x) => x.id === id)!;
            const view = upgradeView(id);
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
                    ? "w-44 max-md:w-[84%] rounded-xl border border-gold bg-gradient-to-b from-[rgba(40,30,8,0.95)] to-[rgba(9,13,28,0.95)] p-4 text-left shadow-[0_0_20px_rgba(240,199,94,0.3)] transition-all hover:-translate-y-1"
                    : "w-44 max-md:w-[84%] rounded-xl border border-cyan/30 bg-[rgba(9,13,28,0.92)] p-4 text-left transition-all hover:-translate-y-1 hover:border-gold/70"
                }
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                      isEvo ? "text-gold" : "text-cyan"
                    }`}
                  >
                    {isEvo ? "↯ evolution" : `lv ${nextLv} / ${u.maxLevel}`}
                  </p>
                  <span className={`text-xl leading-none ${isEvo ? "text-gold" : "text-cyan"}`}>
                    {UPGRADE_ICON[id] ?? "✦"}
                  </span>
                </div>
                <p
                  className={`mt-1.5 text-base font-semibold tracking-tight ${isEvo ? "text-gold" : ""}`}
                >
                  {view.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-dim">{view.desc(nextLv)}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
