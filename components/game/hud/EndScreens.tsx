"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { run, useGame } from "@/lib/gameStore";
import { useProfile } from "@/lib/profile";
import { explorerTx, inscribeRun } from "@/lib/inscribe";

const TOTAL_SITES = regions.length;

// what actually got you — crypto death certificates
const DEATH_FLAVOR: Record<string, string> = {
  goblin: "exploited by a bug",
  gremlin: "burned alive by gas fees",
  rug: "it was a rug pull all along",
  "boss:whale": "swallowed whole by THE WHALE",
  "boss:nemesis": "slain by your own shadow",
};

/** Inscribe-on-X1 + view-leaderboard row for the end-of-run screens. */
function InscribeRow({ score }: { score: number }) {
  const wallet = useProfile((s) => s.wallet);
  const name = useProfile((s) => s.name);
  const [st, setSt] = useState<{ k: "idle" | "busy" | "done"; sig?: string; err?: string }>({
    k: "idle",
  });

  const doInscribe = async () => {
    if (st.k !== "idle") return;
    setSt({ k: "busy" });
    const r = await inscribeRun({
      name,
      score,
      diff: run.difficulty,
      captured: run.captured,
      total: TOTAL_SITES,
    });
    setSt(r.sig ? { k: "done", sig: r.sig } : { k: "idle", err: r.error });
  };

  const viewBoard = () => {
    useGame.getState().openMenu();
    document.getElementById("x1-leaderboard")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        {st.k === "done" && st.sig ? (
          <a
            href={explorerTx(st.sig)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[#4ade80]/50 bg-[#4ade80]/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4ade80] transition-colors hover:border-[#4ade80]"
          >
            ⛓ inscribed on x1 — view transaction ↗
          </a>
        ) : (
          <button
            onClick={() => void doInscribe()}
            disabled={st.k === "busy" || !wallet}
            title={wallet ? "write this score to X1 mainnet forever" : "connect your wallet first"}
            className="rounded-md border border-gold/60 bg-gold/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gold transition-all hover:-translate-y-px hover:border-gold hover:shadow-[0_0_16px_rgba(240,199,94,0.35)] disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {st.k === "busy" ? "inscribing…" : "⛓ inscribe score on x1"}
          </button>
        )}
        <button
          onClick={viewBoard}
          className="rounded-md border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-cyan transition-colors hover:border-cyan"
        >
          🏆 view leaderboard
        </button>
      </div>
      {!wallet && st.k === "idle" && !st.err && (
        <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-dim/60">
          connect your wallet to inscribe your score on x1 mainnet
        </p>
      )}
      {st.err && (
        <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#ff8c6b]">
          {st.err}
        </p>
      )}
    </div>
  );
}

/** Pause screen — interruptions never cost the run. */
export function PauseScreen() {
  const hud = useGame((s) => s.hud);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
          ⏸ paused
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
          block {hud.block} · lv {hud.level} · {hud.kills} kills ·{" "}
          <span className="text-cyan">
            {hud.captured}/{TOTAL_SITES} sites
          </span>
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => useGame.getState().resume()}
            className="rounded-xl border-2 border-gold bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-space shadow-[0_0_24px_rgba(240,199,94,0.5)] transition-transform hover:-translate-y-0.5"
          >
            ▶ resume
          </button>
          <button
            onClick={() => useGame.getState().openMenu()}
            className="rounded-xl border border-white/20 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-ink-dim transition-colors hover:border-[#e0563f]/70 hover:text-[#ff8c6b]"
          >
            abandon run
          </button>
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim/60">
          esc or p to resume
        </p>
      </div>
    </motion.div>
  );
}

/** Victory screen — every ecosystem project captured. */
export function VictoryScreen() {
  const hud = useGame((s) => s.hud);
  const start = useGame((s) => s.start);
  const quit = useGame((s) => s.quit);
  const best = useGame((s) => s.best);
  const finalScore = useGame((s) => s.finalScore);
  const scoreSubmit = useGame((s) => s.scoreSubmit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <motion.div
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="rounded-2xl border border-gold/50 bg-[rgba(9,13,28,0.95)] p-8 text-center shadow-[0_0_60px_rgba(240,199,94,0.25)] max-md:mx-3 max-md:my-4 max-md:p-5"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
          🥷 ecosystem complete — all {TOTAL_SITES} projects captured
        </p>
        <p className="mt-3 text-5xl font-semibold tracking-tight text-gold max-md:text-4xl">{finalScore}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          score (incl. 1000 conquest bonus) · best {best}
        </p>
        {scoreSubmit === "ok" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#4ade80]">
            ✓ recorded on the global leaderboard
          </p>
        )}
        {scoreSubmit === "fail" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#ff8c6b]">
            ⚠ leaderboard unreachable — score kept locally
          </p>
        )}
        {finalScore > 500000 && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/70">
            board entries cap at 500,000
          </p>
        )}
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
          {Math.floor(hud.time / 60)}m {Math.floor(hud.time % 60)}s · {hud.block} blocks ·{" "}
          {hud.kills} kills
        </p>
        <InscribeRow score={finalScore} />
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => start()}
            className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
          >
            run it back
          </button>
          <button
            onClick={quit}
            className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
          >
            explore
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Death screen. */
export function DeathScreen() {
  const hud = useGame((s) => s.hud);
  const start = useGame((s) => s.start);
  const quit = useGame((s) => s.quit);
  const best = useGame((s) => s.best);
  const finalScore = useGame((s) => s.finalScore);
  const deathCause = useGame((s) => s.deathCause);
  const scoreSubmit = useGame((s) => s.scoreSubmit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <motion.div
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-[rgba(9,13,28,0.95)] p-8 text-center max-md:mx-3 max-md:my-4 max-md:p-5"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#e0563f]">
          {DEATH_FLAVOR[deathCause] ?? "the bear market got you"}
        </p>
        <p className="mt-3 text-5xl font-semibold tracking-tight max-md:text-4xl">{finalScore}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          score · best {best}
        </p>
        {scoreSubmit === "ok" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#4ade80]">
            ✓ recorded on the global leaderboard
          </p>
        )}
        {scoreSubmit === "fail" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#ff8c6b]">
            ⚠ leaderboard unreachable — score kept locally
          </p>
        )}
        {finalScore > 500000 && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/70">
            board entries cap at 500,000
          </p>
        )}
        <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
          <p>{hud.block} blocks survived · {hud.kills} kills · {hud.captured} sites</p>
        </div>
        <InscribeRow score={finalScore} />
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => start()}
            className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
          >
            run it back
          </button>
          <button
            onClick={quit}
            className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
          >
            explore
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Time-attack bell — the clock ran out. The EXPECTED end for most runs,
 *  so it's a neutral score bank, not a death card. */
export function TimeUpScreen() {
  const hud = useGame((s) => s.hud);
  const start = useGame((s) => s.start);
  const quit = useGame((s) => s.quit);
  const best = useGame((s) => s.best);
  const finalScore = useGame((s) => s.finalScore);
  const scoreSubmit = useGame((s) => s.scoreSubmit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <motion.div
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="rounded-2xl border border-cyan/40 bg-[rgba(9,13,28,0.95)] p-8 text-center shadow-[0_0_50px_rgba(57,199,245,0.2)] max-md:mx-3 max-md:my-4 max-md:p-5"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan">
          ⏱ time&apos;s up — the bell rings
        </p>
        <p className="mt-3 text-5xl font-semibold tracking-tight max-md:text-4xl">{finalScore}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          score · best {best}
        </p>
        {scoreSubmit === "ok" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#4ade80]">
            ✓ recorded on the global leaderboard
          </p>
        )}
        {scoreSubmit === "fail" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#ff8c6b]">
            ⚠ leaderboard unreachable — score kept locally
          </p>
        )}
        {finalScore > 500000 && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/70">
            board entries cap at 500,000
          </p>
        )}
        <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
          <p>{hud.block} blocks · {hud.kills} kills · {hud.captured}/{TOTAL_SITES} sites</p>
          <p className="text-ink-dim/70">capture every site + slay the boss before the bell for +1000</p>
        </div>
        <InscribeRow score={finalScore} />
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => start()}
            className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
          >
            run it back
          </button>
          <button
            onClick={quit}
            className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
          >
            explore
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
