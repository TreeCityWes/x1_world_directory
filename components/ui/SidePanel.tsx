"use client";

import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { useWorld } from "@/lib/store";
import { UPGRADES, useGame } from "@/lib/gameStore";

/** Right screen during a survival run: live run stats + owned upgrades. */
function GamePanel() {
  const hud = useGame((s) => s.hud);
  const best = useGame((s) => s.best);
  const activeSites = useGame((s) => s.activeSites);
  const owned = Object.entries(hud.upgrades);
  const sites = activeSites
    .map((id) => regions.find((r) => r.id === id))
    .filter((r): r is (typeof regions)[number] => Boolean(r));

  return (
    <aside className="flex h-full w-[40vw] flex-col border-l border-cyan/20 bg-[rgba(9,13,28,0.92)] backdrop-blur-md max-md:w-full max-md:min-h-0 max-md:flex-1 max-md:border-l-0 max-md:border-t">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-5 py-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#e0563f] shadow-[0_0_10px_rgba(224,86,63,0.8)]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink">survival run</p>
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          best {best}
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] uppercase tracking-[0.15em]">
          {[
            ["block", hud.block],
            ["level", hud.level],
            ["kills", hud.kills],
            ["sites", hud.captured],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-space-2/40 px-3 py-2">
              <p className="text-ink-dim/70">{label}</p>
              <p className="mt-0.5 text-xl text-ink">{value}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">upgrades</p>
        <div className="mt-2 space-y-1.5">
          {owned.length === 0 && (
            <p className="text-xs text-ink-dim">collect XN coins to level up</p>
          )}
          {owned.map(([id, lv]) => {
            const u = UPGRADES.find((x) => x.id === id);
            if (!u) return null;
            return (
              <div
                key={id}
                className="flex items-baseline justify-between rounded-md border border-white/8 bg-space-2/30 px-3 py-1.5 text-sm"
              >
                <span>{u.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan">
                  lv {lv}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
          powerup sites
        </p>
        <div className="mt-2 space-y-1.5">
          {sites.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-md border border-white/8 bg-space-2/30 px-3 py-1.5 text-sm"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: r.accent, boxShadow: `0 0 8px ${r.accent}` }}
              />
              {r.name}
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-[9px] uppercase leading-relaxed tracking-[0.15em] text-ink-dim/70">
          survive the blocks · capture glowing sites for powers · shurikens aim where you run
        </p>
      </div>
    </aside>
  );
}

/**
 * The right screen of the console — full-height info pane that swaps as you
 * play. Shows (in priority): clicked/E-selected → walked-up-to → hovered →
 * featured default.
 */
export default function SidePanel() {
  const gameMode = useGame((s) => s.mode);
  const nearId = useWorld((s) => s.nearId);
  const closestId = useWorld((s) => s.closestId);
  const hoveredId = useWorld((s) => s.hoveredId);
  const selectedId = useWorld((s) => s.selectedId);

  if (gameMode !== "explore") return <GamePanel />;

  // clicked/locked → in-range → hovered → whatever is closest to the ninja
  const activeId = selectedId ?? nearId ?? hoveredId ?? closestId;
  const region = regions.find((r) => r.id === activeId) ?? regions[0];
  const isApproaching = activeId !== null && activeId === closestId && nearId === null;

  return (
    <aside className="flex h-full w-[40vw] flex-col border-l border-cyan/20 bg-[rgba(9,13,28,0.92)] backdrop-blur-md max-md:w-full max-md:min-h-0 max-md:flex-1 max-md:border-l-0 max-md:border-t">
      {/* console header */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-5 py-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold shadow-[0_0_10px_rgba(240,199,94,0.8)]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink">
          x1 ecosystem console
        </p>
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          {regions.length} nodes online
        </p>
      </header>

      {/* accent hairline tracks the active project */}
      <div
        className="h-px w-full shrink-0 transition-all duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${region.accent}, transparent)`,
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={region.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- svg/png site captures */}
          <img
            src={region.screenshot}
            alt={`Screenshot of ${region.name}`}
            className="aspect-[8/5] w-full shrink-0 border-b border-white/10 bg-space-2 object-cover object-top"
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 max-sm:p-4">
            {/* category badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: region.accent, boxShadow: `0 0 8px ${region.accent}` }}
              />
              <p
                className="font-mono text-[11px] uppercase tracking-[0.2em]"
                style={{ color: region.accent }}
              >
                {region.category}
              </p>
              {isApproaching && (
                <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                  nearest — walk closer
                </p>
              )}
            </div>

            <h2 className="mt-2.5 text-3xl font-semibold leading-tight tracking-tight max-sm:text-xl">
              {region.name}
            </h2>
            <p className="mt-1 font-mono text-sm text-cyan/90">{region.domain}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-dim max-sm:text-[13px]">
              {region.description || region.blurb}
            </p>

            {/* social links scraped from the site */}
            {(region.twitter || region.telegram) && (
              <div className="mt-3 flex gap-2">
                {region.twitter && (
                  <a
                    href={region.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                  >
                    𝕏 twitter
                  </a>
                )}
                {region.telegram && (
                  <a
                    href={region.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                  >
                    ✈ telegram
                  </a>
                )}
              </div>
            )}

            {/* metadata rows */}
            <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 font-mono text-[11px] uppercase tracking-[0.15em]">
              <div className="flex justify-between gap-3">
                <span className="text-ink-dim/70">builder</span>
                <span className="text-ink">{region.builder}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-dim/70">node</span>
                <span className="text-ink">
                  {String(region.order + 1).padStart(2, "0")} / {regions.length}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-dim/70">status</span>
                <span className="text-[#4ade80]">online</span>
              </div>
            </div>

            <div className="min-h-4 flex-1" />
            <a
              href={region.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block self-start rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a] hover:shadow-[0_0_24px_rgba(240,199,94,0.45)]"
            >
              open site ↗
            </a>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim/70">
              wasd — walk · drag — spin · e — lock · esc — release
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
