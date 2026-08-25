"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchBoard, type BoardEntry } from "@/lib/leaderboard";
import { shortAddr, useProfile } from "@/lib/profile";
import { useGame } from "@/lib/gameStore";
import {
  DIFFICULTY_SCORE_MULT,
  normalizedScore,
  type DifficultyId,
} from "@/lib/scoreFormula";

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

const DIFF_TABS = ["normal", "hard", "cursed", "all"] as const;
type DiffTab = (typeof DIFF_TABS)[number];

function isDiffTab(d: string): d is Exclude<DiffTab, "all"> {
  return d === "normal" || d === "hard" || d === "cursed";
}

/** Prefer the just-finished run's difficulty on end screens; else last played. */
function defaultDiffTab(
  mode: string,
  finalDiff: DifficultyId,
  runDiff: string,
): DiffTab {
  const endScreen = mode === "dead" || mode === "won" || mode === "timeup";
  const preferred = endScreen ? finalDiff : runDiff || finalDiff;
  return isDiffTab(preferred) ? preferred : "normal";
}

/** Rank the mixed board by skill-normalized score; keep raw score on the entry. */
function rankBoardNormalized(entries: BoardEntry[]): BoardEntry[] {
  return [...entries]
    .sort((a, b) => {
      const na = normalizedScore(a.score, a.diff);
      const nb = normalizedScore(b.score, b.diff);
      if (nb !== na) return nb - na;
      return b.score - a.score;
    })
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Global top-25, refreshed when runs end (scores submit on death/win). */
export default function Leaderboard() {
  const mode = useGame((s) => s.mode);
  const finalDiff = useGame((s) => s.finalDiff);
  const runDiff = useGame((s) => s.hud.diff);
  const [filter, setFilter] = useState<DiffTab>(() =>
    defaultDiffTab(mode, finalDiff, runDiff),
  );
  const [userPicked, setUserPicked] = useState(false);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const name = useProfile((s) => s.name);
  const wallet = useProfile((s) => s.wallet);

  // Keep the default tab in sync with the last / just-finished run until the
  // player picks a tab themselves — avoids always landing on "all".
  useEffect(() => {
    if (userPicked) return;
    setFilter(defaultDiffTab(mode, finalDiff, runDiff));
  }, [mode, finalDiff, runDiff, userPicked]);

  useEffect(() => {
    let stale = false;
    // small delay after a run ends so the fresh score lands first
    const t = setTimeout(
      () => {
        void fetchBoard(filter).then(({ board: rows }) => {
          if (stale) return;
          const next =
            filter === "all" ? rankBoardNormalized(rows) : rows;
          setBoard(next);
          setLoaded(true);
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
          top 25 · {filter === "all" ? "norm rank" : "best run counts"}
        </span>
      </div>

      <div className="mt-2 flex gap-1">
        {DIFF_TABS.map((d) => (
          <button
            key={d}
            onClick={() => {
              setUserPicked(true);
              setFilter(d);
            }}
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
          const norm =
            filter === "all" ? Math.round(normalizedScore(e.score, e.diff)) : null;
          const showNorm =
            norm != null &&
            (DIFFICULTY_SCORE_MULT[e.diff as DifficultyId] ?? 1) !== 1;
          return (
            <motion.div
              key={`${e.rank}-${e.name}-${e.diff}-${e.wallet}`}
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
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm tabular-nums text-gold">
                  {e.score.toLocaleString()}
                </span>
                {showNorm && (
                  <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-ink-dim/50">
                    norm {norm!.toLocaleString()}
                  </span>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim/40">
        ranked entries require wallet proof — remove yourself anytime from your profile
        {filter === "all" ? " · all board ranked by difficulty-normalized score" : ""}
      </p>
    </div>
  );
}
