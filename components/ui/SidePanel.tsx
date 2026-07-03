"use client";

import { AnimatePresence, motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { useWorld } from "@/lib/store";

/**
 * The right screen of the console — full-height info pane that swaps as you
 * play. Shows (in priority): clicked/E-selected → walked-up-to → hovered →
 * featured default.
 */
export default function SidePanel() {
  const nearId = useWorld((s) => s.nearId);
  const hoveredId = useWorld((s) => s.hoveredId);
  const selectedId = useWorld((s) => s.selectedId);

  const activeId = selectedId ?? nearId ?? hoveredId;
  const region = regions.find((r) => r.id === activeId) ?? regions[0];
  const isFeatured = activeId === null;

  return (
    <aside className="flex h-full w-[40vw] flex-col border-l border-cyan/20 bg-[rgba(9,13,28,0.92)] backdrop-blur-md max-sm:w-full max-sm:min-h-0 max-sm:flex-1 max-sm:border-l-0 max-sm:border-t">
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
              {isFeatured && (
                <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                  featured
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
