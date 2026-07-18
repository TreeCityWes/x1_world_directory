"use client";

import { useEffect, useRef, useState } from "react";
import { shortAddr, useProfile, watchWalletProvider } from "@/lib/profile";
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

  useEffect(() => watchWalletProvider(), []);

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
    <div
      id="x1-profile"
      className="relative overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-br from-[#151d36] to-[#0b1122] px-4 py-3.5"
    >
      <div className="shimmer-line pointer-events-none absolute inset-x-0 top-0 h-px" />
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-gold">
        ★ player one
      </p>
      <div className="mt-2.5 flex items-center gap-3">
        <span
          title={ch.name}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border bg-space text-xl font-black"
          style={{
            borderColor: ch.colors.band,
            color: ch.colors.band,
          }}
        >
          {ch.name.replace(/^X1 /, "")[0]}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => useGame.getState().retrySubmit()}
          placeholder="enter ninja name_"
          maxLength={20}
          className="min-w-0 flex-1 border-b-2 border-gold/25 bg-transparent pb-1 text-lg font-bold tracking-tight text-ink outline-none transition-colors placeholder:font-semibold placeholder:text-ink-dim/40 focus:border-gold"
        />
        {wallet ? (
          <button
            onClick={disconnect}
            title="disconnect"
            className="shrink-0 rounded-lg border border-success/50 bg-success/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-success transition-all hover:-translate-y-px hover:border-danger/70 hover:text-danger-bright"
          >
            ◉ {shortAddr(wallet)}
          </button>
        ) : (
          <button
            onClick={() => void connect().then(() => useGame.getState().retrySubmit())}
            disabled={connecting}
            className="shrink-0 rounded-lg bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-space shadow-[0_2px_0_#8a6414] transition-all hover:-translate-y-px hover:shadow-[0_3px_0_#8a6414] active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {connecting ? "connecting…" : "↯ connect"}
          </button>
        )}
      </div>
      {walletError && (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-danger-bright">
          {walletError}
        </p>
      )}
      <button
        onClick={() => void onRemove()}
        disabled={removeState === "busy"}
        className={`mt-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
          removeState === "armed"
            ? "text-danger-bright"
            : removeState === "done"
              ? "text-success"
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
