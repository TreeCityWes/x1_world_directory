"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchBoard, type BoardEntry } from "@/lib/leaderboard";
import { shortAddr, useProfile } from "@/lib/profile";
import { useGame } from "@/lib/gameStore";

const RANK_STYLE: Record<number, string> = {
  1: "border-gold/50 bg-gold/10",
  2: "border-white/25 bg-white/5",
  3: "border-[#cd7f32]/40 bg-[#cd7f32]/10",
};
const RANK_NUM_COLOR: Record<number, string> = {
  1: "var(--gold)",
  2: "#c0c7d4",
  3: "#c9926b",
};
const DIFF_COLOR: Record<string, string> = {
  normal: "var(--cyan)",
  hard: "var(--danger-bright)",
  cursed: "var(--ink)",
};

const DIFF_TABS = ["all", "hard", "cursed"] as const;
type DiffTab = (typeof DIFF_TABS)[number];

/** Global top-25, refreshed when runs end (scores submit on death/win). */
export default function Leaderboard() {
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<DiffTab>("all");
  const mode = useGame((s) => s.mode);
  const name = useProfile((s) => s.name);
  const wallet = useProfile((s) => s.wallet);

  useEffect(() => {
    let stale = false;
    // small delay after a run ends so the fresh score lands first
    const t = setTimeout(
      () => {
        void fetchBoard(filter).then(({ board }) => {
          if (!stale) {
            setBoard(board);
            setLoaded(true);
          }
        });
      },
      mode === "dead" || mode === "won" || mode === "timeup" ? 900 : 0,
    );
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [mode, filter]);

  return (
    <div id="x1-leaderboard">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
          ★ global leaderboard
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim/60">
          top 25 · best run counts
        </span>
      </div>

      <div className="mt-2 flex gap-1">
        {DIFF_TABS.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`rounded border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-colors ${
              filter === d
                ? "border-gold/70 bg-gold/10 text-gold"
                : "border-white/10 bg-space/50 text-ink-dim hover:border-white/25 hover:text-ink"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mt-2 space-y-1.5">
        {!loaded && <p className="text-xs text-ink-dim">loading…</p>}
        {!name.trim() && (
          <p className="rounded-md border border-gold/30 bg-gold/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
            name your ninja above to compete on the board
          </p>
        )}
        {!!name.trim() && !wallet && (
          <p className="rounded-md border border-cyan/30 bg-cyan/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">
            connect a wallet to submit ranked scores
          </p>
        )}
        {loaded && board.length === 0 && (
          <p className="text-xs text-ink-dim">no runs yet — be the first ninja on the board</p>
        )}
        {board.map((e, i) => {
          const mine = wallet ? e.wallet === wallet : !e.wallet && !!name && e.name === name;
          return (
            <motion.div
              key={`${e.rank}-${e.name}`}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.25, ease: "easeOut" }}
              className={`flex items-center gap-2.5 rounded-md border px-3 py-1.5 text-sm ${
                RANK_STYLE[e.rank] ?? "border-white/8 bg-space-2/30"
              } ${mine ? "ring-1 ring-cyan/60" : ""}`}
            >
              <span
                className={`w-6 shrink-0 text-center font-mono text-[11px] ${
                  RANK_NUM_COLOR[e.rank] ? "" : "text-ink-dim"
                }`}
                style={RANK_NUM_COLOR[e.rank] ? { color: RANK_NUM_COLOR[e.rank] } : undefined}
              >
                {String(e.rank).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {e.name}
                {mine && <span className="ml-1.5 font-mono text-[9px] uppercase text-cyan">you</span>}
              </span>
              {e.wallet && (
                <span
                  className="shrink-0 font-mono text-[9px] text-ink-dim/60"
                  title={e.verified ? "wallet ownership proven by signature" : "unverified wallet"}
                >
                  {e.verified && <span className="mr-0.5 text-success">✓</span>}
                  {shortAddr(e.wallet)}
                </span>
              )}
              <span
                className="shrink-0 font-mono text-[9px] uppercase"
                style={{ color: DIFF_COLOR[e.diff] ?? "var(--cyan)" }}
              >
                {e.diff}
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums text-gold">
                {e.score.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim/40">
        ranked entries require wallet proof — remove yourself anytime from your profile
      </p>
    </div>
  );
}
