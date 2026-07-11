"use client";

import { motion } from "framer-motion";
import { CHARACTERS, CHARACTER_ORDER, type WeaponKind } from "@/lib/characters";
import CharacterPreview from "@/components/game/CharacterPreview";
import { useGame } from "@/lib/gameStore";
import { sfx } from "@/lib/sound";

// weapon glyph per kind — the roster card's emblem
const WEAPON_GLYPH: Record<WeaponKind, string> = {
  shuriken: "✦",
  xcoin: "◎",
  pulse: "⌁",
  slash: "⚔",
};

/** One labeled stat bar in the character dossier. */
function StatBar({ label, v, accent }: { label: string; v: number; accent: string }) {
  const pct = Math.round(Math.min(1, v / 1.6) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right font-mono text-[8px] uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
      <span className="w-8 shrink-0 font-mono text-[8px] tabular-nums text-ink-dim">
        {Math.round(v * 100)}%
      </span>
    </div>
  );
}

/** Fighting-game style select: roster row + live 3D turntable + full dossier. */
export function CharacterSelect() {
  const selected = useGame((s) => s.character);
  const setCharacter = useGame((s) => s.setCharacter);
  const ch = CHARACTERS[selected];
  const accent = ch.colors.band;

  return (
    <div className="mx-auto mt-3 w-full max-w-3xl px-4 text-left">
      {/* roster: CHARACTERS, not tabs — tall cards with the class fantasy
          readable in two seconds (archetype + hook + best-for) */}
      <div className="grid grid-cols-5 gap-2 max-md:grid-cols-2">
        {CHARACTER_ORDER.map((id) => {
          const c = CHARACTERS[id];
          const sel = id === selected;
          return (
            <motion.button
              key={id}
              whileHover={c.unlocked ? { y: -4 } : undefined}
              whileTap={c.unlocked ? { scale: 0.94 } : undefined}
              onClick={() => {
                if (!c.unlocked || sel) return;
                sfx.ui();
                setCharacter(id);
              }}
              disabled={!c.unlocked}
              className={`flex flex-col rounded-xl border-2 px-2.5 pb-2.5 pt-2 text-left backdrop-blur-md transition-colors ${
                sel
                  ? ""
                  : c.unlocked
                    ? "border-white/15 bg-space/80 hover:border-white/40"
                    : "border-white/10 bg-space/60 opacity-40"
              }`}
              style={
                sel
                  ? {
                      borderColor: c.colors.band,
                      boxShadow: `0 0 26px ${c.colors.band}55`,
                      background: `linear-gradient(160deg, ${c.colors.band}2e, rgba(9,13,28,0.92))`,
                    }
                  : undefined
              }
            >
              {/* emblem: weapon glyph in the identity color */}
              <span
                className="grid h-10 w-full place-items-center rounded-lg text-2xl leading-none"
                style={{
                  color: c.unlocked ? c.colors.band : "#4b5563",
                  background: `radial-gradient(ellipse 80% 90% at 50% 50%, ${
                    c.unlocked ? c.colors.band : "#4b5563"
                  }22, transparent 75%)`,
                  textShadow: c.unlocked ? `0 0 12px ${c.colors.band}88` : undefined,
                }}
              >
                {c.unlocked ? WEAPON_GLYPH[c.weapon.kind] : "🔒"}
              </span>
              <p className="mt-1.5 truncate text-sm font-bold leading-tight">{c.name}</p>
              <p
                className="truncate font-mono text-[8px] uppercase tracking-[0.12em]"
                style={{ color: c.unlocked ? c.colors.band : "#6b7280" }}
              >
                {c.unlocked ? c.archetype : "coming soon"}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-ink-dim">{c.hook}</p>
              <p className="mt-auto pt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-ink-dim/70">
                {sel ? (
                  <span style={{ color: c.colors.band }}>▸ selected</span>
                ) : (
                  <>best for: {c.bestFor}</>
                )}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* dossier: live 3D preview + stats + weapon + signature */}
      <div className="mt-2 grid grid-cols-[240px_1fr] gap-2 max-md:grid-cols-1">
        <div
          className="relative overflow-hidden rounded-2xl border-2 backdrop-blur-md"
          style={{
            borderColor: `${accent}66`,
            // dark suits vanish on flat near-black — an accent-lit well,
            // OVERSIZED past the card edges so it reads as stage lighting
            // instead of a printed circle
            background: `radial-gradient(ellipse 150% 110% at 50% 28%, ${accent}42 0%, ${accent}1c 48%, rgba(14,20,40,0.9) 90%)`,
          }}
        >
          <div className="h-56 max-md:h-44">
            <CharacterPreview charId={selected} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(5,8,18,0.92)] to-transparent px-3 pb-2.5 pt-8">
            <p className="text-lg font-bold leading-none">{ch.name}</p>
            <p
              className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              {ch.title}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-white/10 bg-space/85 px-4 py-3 backdrop-blur-md">
          {/* hierarchy: the REASON to pick them first — stats last */}
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-ink-dim/70">
            ability
          </p>
          <p className="mt-0.5 text-sm font-bold leading-tight" style={{ color: accent }}>
            ⚔ {ch.weapon.name}
          </p>
          <p className="mt-0.5 text-xs text-ink-dim">{ch.weapon.desc}</p>
          <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em] text-ink-dim/70">
            passive
          </p>
          <p className="mt-0.5 text-xs font-semibold" style={{ color: accent }}>
            ★ {ch.passive}
          </p>
          <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em] text-ink-dim/70">
            stats
          </p>
          <div className="mt-1 space-y-1">
            <StatBar label="vitality" v={ch.hp} accent="#4ade80" />
            <StatBar label="damage" v={ch.dmg} accent="#ff8c6b" />
            <StatBar label="speed" v={ch.speed} accent="#7dd3fc" />
            <StatBar label="fire rate" v={Math.max(0.2, 2 - ch.cooldown)} accent="#f0c75e" />
            <StatBar label="fortune" v={ch.luck} accent="#c084fc" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-dim/80">{ch.playstyle}</p>
        </div>
      </div>
    </div>
  );
}
