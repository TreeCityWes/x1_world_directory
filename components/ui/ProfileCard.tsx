"use client";

import { useRef, useState } from "react";
import { shortAddr, useProfile } from "@/lib/profile";
import { removeMe } from "@/lib/leaderboard";
import { useGame } from "@/lib/gameStore";
import { CHARACTERS } from "@/lib/characters";

/** The player card — arcade "enter your name" energy, not a KYC form. */
export default function ProfileCard() {
  const { name, wallet, connecting, walletError, setName, connect, disconnect } = useProfile();
  const charId = useGame((s) => s.character);
  const ch = CHARACTERS[charId];
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
    <div className="relative overflow-hidden rounded-xl border-2 border-gold/40 bg-gradient-to-br from-[#151d36] to-[#0b1122] px-4 py-3.5 shadow-[0_0_28px_rgba(240,199,94,0.1)]">
      <div className="shimmer-line pointer-events-none absolute inset-x-0 top-0 h-px" />
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.32em] text-gold">
        ★ player one
      </p>
      <div className="mt-2.5 flex items-center gap-3">
        <span
          title={ch.name}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 bg-space text-xl font-black"
          style={{
            borderColor: ch.colors.band,
            color: ch.colors.band,
            boxShadow: `0 0 20px ${ch.colors.band}55`,
          }}
        >
          {ch.name.replace(/^X1 /, "")[0]}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="enter ninja name_"
          maxLength={20}
          className="min-w-0 flex-1 border-b-2 border-gold/25 bg-transparent pb-1 text-lg font-bold tracking-tight text-ink outline-none transition-colors placeholder:font-semibold placeholder:text-ink-dim/40 focus:border-gold"
        />
        {wallet ? (
          <button
            onClick={disconnect}
            title="disconnect"
            className="shrink-0 rounded-lg border-2 border-[#4ade80]/50 bg-[#4ade80]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#4ade80] transition-all hover:-translate-y-px hover:border-[#e0563f]/70 hover:text-[#ff8c6b]"
          >
            ◉ {shortAddr(wallet)}
          </button>
        ) : (
          <button
            onClick={() => void connect()}
            disabled={connecting}
            className="shrink-0 rounded-lg bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-space shadow-[0_2px_0_#8a6414] transition-all hover:-translate-y-px hover:shadow-[0_3px_0_#8a6414,0_0_20px_rgba(240,199,94,0.5)] active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {connecting ? "connecting…" : "⚡ connect"}
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
