"use client";

import { useRef, useState } from "react";
import { shortAddr, useProfile } from "@/lib/profile";
import { removeMe } from "@/lib/leaderboard";

/** Compact ninja identity: editable name + one-tap wallet connect. */
export default function ProfileCard() {
  const { name, wallet, connecting, walletError, setName, connect, disconnect } = useProfile();
  const [removeState, setRemoveState] = useState<"idle" | "armed" | "busy" | "done">("idle");
  const disarm = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onRemove = async () => {
    if (removeState === "idle") {
      setRemoveState("armed");
      if (disarm.current) clearTimeout(disarm.current);
      disarm.current = setTimeout(() => setRemoveState("idle"), 4000);
      return;
    }
    if (removeState !== "armed") return;
    setRemoveState("busy");
    const ok = await removeMe(wallet);
    setRemoveState(ok ? "done" : "idle");
    if (ok) setTimeout(() => setRemoveState("idle"), 5000);
  };

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
      <button
        onClick={() => void onRemove()}
        disabled={removeState === "busy"}
        className={`mt-2 font-mono text-[8px] uppercase tracking-[0.12em] transition-colors ${
          removeState === "armed"
            ? "text-[#ff8c6b]"
            : removeState === "done"
              ? "text-[#4ade80]"
              : "text-ink-dim/50 hover:text-ink-dim"
        }`}
      >
        {removeState === "armed"
          ? "tap again to remove — your next named run re-adds you"
          : removeState === "busy"
            ? "removing…"
            : removeState === "done"
              ? "✓ removed from the board"
              : "remove my scores from the leaderboard"}
      </button>
    </div>
  );
}
