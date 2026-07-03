"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchBoard, type BoardEntry } from "@/lib/leaderboard";
import { shortAddr, useProfile } from "@/lib/profile";
import { useGame } from "@/lib/gameStore";

const RANK_STYLE: Record<number, string> = {
  1: "border-gold/50 bg-gold/10 shadow-[0_0_18px_rgba(240,199,94,0.15)]",
  2: "border-white/25 bg-white/5",
  3: "border-[#cd7f32]/40 bg-[#cd7f32]/10",
};
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const DIFF_COLOR: Record<string, string> = {
  normal: "#7dd3fc",
  hard: "#ff8c6b",
  cursed: "#c4b5fd",
};

/** Global top-25, refreshed when runs end (scores submit on death/win). */
export default function Leaderboard() {
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mode = useGame((s) => s.mode);
  const name = useProfile((s) => s.name);
  const wallet = useProfile((s) => s.wallet);
  const me = `${name}|${wallet ? wallet.slice(0, 8) : "guest"}`;

  useEffect(() => {
    let stale = false;
    // small delay after a run ends so the fresh score lands first
    const t = setTimeout(
      () => {
        void fetchBoard().then(({ board }) => {
          if (!stale) {
            setBoard(board);
            setLoaded(true);
          }
        });
      },
      mode === "dead" || mode === "won" ? 900 : 0,
    );
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [mode]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
          🏆 global leaderboard
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/60">
          top 25 · best run counts
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        {!loaded && <p className="text-xs text-ink-dim">loading…</p>}
        {!name.trim() && (
          <p className="rounded-md border border-gold/30 bg-gold/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
            name your ninja above to compete on the board
          </p>
        )}
        {loaded && board.length === 0 && (
          <p className="text-xs text-ink-dim">no runs yet — be the first ninja on the board</p>
        )}
        {board.map((e, i) => {
          const mine = `${e.name}|${e.wallet ? e.wallet.slice(0, 8) : "guest"}` === me;
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
              <span className="w-6 shrink-0 text-center font-mono text-[11px] text-ink-dim">
                {MEDAL[e.rank] ?? e.rank}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {e.name}
                {mine && <span className="ml-1.5 font-mono text-[9px] uppercase text-cyan">you</span>}
              </span>
              {e.wallet && (
                <span className="shrink-0 font-mono text-[9px] text-ink-dim/60">
                  {shortAddr(e.wallet)}
                </span>
              )}
              <span
                className="shrink-0 font-mono text-[9px] uppercase"
                style={{ color: DIFF_COLOR[e.diff] ?? "#7dd3fc" }}
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
    </div>
  );
}
