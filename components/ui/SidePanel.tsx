"use client";

import { AnimatePresence, motion } from "framer-motion";
import { POWER_LABEL, regions } from "@/lib/regions";
import { useWorld } from "@/lib/store";
import { UPGRADES, scoreOf, upgradeView, useGame } from "@/lib/gameStore";
import ProfileCard from "@/components/ui/ProfileCard";
import Leaderboard from "@/components/ui/Leaderboard";

/** Right screen during a survival run: capture progress + targets + build. */
function GamePanel() {
  const hud = useGame((s) => s.hud);
  const best = useGame((s) => s.best);
  const capturedIds = useGame((s) => s.capturedIds);
  const activeSites = useGame((s) => s.activeSites);
  const owned = Object.entries(hud.upgrades);
  const total = regions.length;
  const sites = activeSites
    .map((id) => regions.find((r) => r.id === id))
    .filter((r): r is (typeof regions)[number] => Boolean(r));

  return (
    <aside className="flex h-full w-[40vw] flex-col border-l border-cyan/20 bg-[rgba(9,13,28,0.92)] backdrop-blur-md max-md:h-auto max-md:w-full max-md:border-l-0 max-md:border-t">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-5 py-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#e0563f] shadow-[0_0_10px_rgba(224,86,63,0.8)]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink">survival run</p>
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          best {best}
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 max-md:overflow-visible [&>*]:shrink-0">
        {/* who's running */}
        <ProfileCard />

        {/* the quest: capture every ecosystem project */}
        <div className="relative mt-3 overflow-hidden rounded-xl border-2 border-gold/40 bg-gradient-to-br from-[#1c1608] to-[#0b1122] px-4 py-3.5">
          <div className="shimmer-line pointer-events-none absolute inset-x-0 top-0 h-px" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-bold tracking-tight text-gold">
              ⚔️ Capture the Ecosystem
            </span>
            <span className="font-mono text-xl font-bold tabular-nums text-gold">
              {hud.captured}
              <span className="text-xs font-semibold text-ink-dim"> /{total}</span>
            </span>
          </div>
          <div className="mt-2.5 h-3 overflow-hidden rounded-full border border-gold/25 bg-space/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-deep via-gold to-[#ffe08a] shadow-[0_0_12px_rgba(240,199,94,0.7)] transition-[width] duration-500"
              style={{ width: `${Math.max(2, (hud.captured / total) * 100)}%` }}
            />
          </div>
        </div>

        {sites.length > 0 && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            current targets
          </p>
        )}
        <div className="mt-2 space-y-2">
          <AnimatePresence>
            {sites.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-space-2/30 p-2 transition-colors hover:border-gold/40"
                style={{ boxShadow: `inset 2px 0 0 ${r.accent}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- site captures */}
                <img
                  src={r.screenshot.replace("/projects/", "/projects/thumbs/").replace(/\.(png|svg)$/, ".jpg")}
                  alt={r.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = r.screenshot;
                  }}
                  className="aspect-[8/5] w-20 shrink-0 rounded border border-white/10 object-cover object-top"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p
                    className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.15em]"
                    style={{ color: r.accent }}
                  >
                    ⚡ {POWER_LABEL[r.kind] ?? r.category}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 font-mono text-[11px] uppercase tracking-[0.15em] max-sm:grid-cols-2">
          {[
            ["score", scoreOf().toLocaleString()],
            ["block", hud.block],
            ["level", hud.level],
            ["kills", hud.kills],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2 ${
                i === 0
                  ? "border-gold/40 bg-gold/5 shadow-[inset_0_0_18px_rgba(240,199,94,0.06)]"
                  : "border-white/10 bg-space-2/40"
              }`}
            >
              <p className="text-ink-dim/70">{label}</p>
              <p className={`mt-0.5 text-xl tabular-nums ${i === 0 ? "text-gold" : "text-ink"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">upgrades</p>
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
                <span>{upgradeView(id).name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan">
                  lv {lv}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <Leaderboard />
        </div>

        {/* the conquest board: every project as an LED — dim until captured */}
        <div className="mt-auto pt-5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              ecosystem grid
            </p>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/60">
              {hud.captured} lit · {total - hud.captured} dark
            </span>
          </div>
          <div className="mt-2 grid grid-cols-8 gap-1.5 max-md:grid-cols-6">
            {regions.map((r) => {
              const lit = capturedIds.includes(r.id);
              return (
                <motion.div
                  key={r.id}
                  title={r.name}
                  animate={lit ? { scale: [1, 1.28, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="relative aspect-[8/5] overflow-hidden rounded-[4px] transition-shadow duration-300"
                  style={
                    lit
                      ? { border: `1px solid ${r.accent}`, boxShadow: `0 0 10px ${r.accent}88` }
                      : { border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbs */}
                  <img
                    src={r.screenshot.replace("/projects/", "/projects/thumbs/").replace(/\.(png|svg)$/, ".jpg")}
                    alt={r.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = r.screenshot;
                    }}
                    className={`h-full w-full object-cover object-top transition-all duration-500 ${
                      lit ? "opacity-100" : "opacity-45 grayscale"
                    }`}
                  />
                </motion.div>
              );
            })}
          </div>
          <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.15em] text-ink-dim/70">
            capture all {total} projects to win · glowing sites grant powers · your weapon aims
            where you run
          </p>
        </div>
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
    <aside className="flex h-full w-[40vw] flex-col border-l border-cyan/20 bg-[rgba(9,13,28,0.92)] backdrop-blur-md max-md:h-auto max-md:w-full max-md:border-l-0 max-md:border-t">
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
        className="shimmer-line h-px w-full shrink-0 transition-all duration-300"
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
          { }
          <div className="group shrink-0 overflow-hidden border-b border-white/10 bg-space-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- site captures */}
            <img
              src={region.screenshot}
              alt={`Screenshot of ${region.name}`}
              className="aspect-[8/5] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 max-md:overflow-visible max-sm:p-4">
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
