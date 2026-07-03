"use client";

import { shortAddr, useProfile } from "@/lib/profile";

/** Compact ninja identity: editable name + one-tap wallet connect. */
export default function ProfileCard() {
  const { name, wallet, connecting, walletError, setName, connect, disconnect } = useProfile();

  return (
    <div className="relative overflow-hidden rounded-lg border border-cyan/25 bg-gradient-to-br from-space-2/60 to-space/40 px-4 py-3">
      {/* animated sheen */}
      <div className="shimmer-line pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/40 bg-space text-lg shadow-[0_0_14px_rgba(240,199,94,0.25)]">
          🥷
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="name your ninja…"
          maxLength={20}
          className="min-w-0 flex-1 border-b border-white/10 bg-transparent pb-0.5 text-sm font-medium text-ink outline-none transition-colors placeholder:text-ink-dim/50 focus:border-gold/60"
        />
        {wallet ? (
          <button
            onClick={disconnect}
            title="disconnect"
            className="shrink-0 rounded-md border border-[#4ade80]/40 bg-[#4ade80]/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4ade80] transition-colors hover:border-[#e0563f]/60 hover:text-[#ff8c6b]"
          >
            ◉ {shortAddr(wallet)}
          </button>
        ) : (
          <button
            onClick={() => void connect()}
            disabled={connecting}
            className="shrink-0 rounded-md bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-space transition-all hover:-translate-y-px hover:shadow-[0_0_16px_rgba(240,199,94,0.5)] disabled:opacity-60"
          >
            {connecting ? "connecting…" : "connect wallet"}
          </button>
        )}
      </div>
      {walletError && (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#ff8c6b]">
          {walletError}
        </p>
      )}
    </div>
  );
}
