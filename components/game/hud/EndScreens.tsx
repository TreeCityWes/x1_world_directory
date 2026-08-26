"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { regions } from "@/lib/regions";
import { winTarget } from "@/lib/finale";
import { run, useGame } from "@/lib/gameStore";
import {
  ensureWalletSession,
  getWalletProvider,
  isWalletSessionLive,
  shortAddr,
  useProfile,
  watchWalletProvider,
} from "@/lib/profile";
import { explorerTx, inscribeRun } from "@/lib/inscribe";
import { winBonus } from "@/lib/scoreFormula";

const TOTAL_SITES = winTarget(regions.length);
const FULL_CLEAR_BONUS = winBonus(TOTAL_SITES);

// what actually got you — crypto death certificates
const DEATH_FLAVOR: Record<string, string> = {
  goblin: "exploited by a bug",
  gremlin: "burned alive by gas fees",
  rug: "it was a rug pull all along",
  "boss:whale": "swallowed whole by THE WHALE",
  "boss:nemesis": "slain by your own shadow",
};

type Tone = "gold" | "cyan" | "danger";

const TONE_CLASS: Record<Tone, { text: string; border: string }> = {
  gold: { text: "text-gold", border: "border-gold/40" },
  cyan: { text: "text-cyan", border: "border-cyan/40" },
  danger: { text: "text-danger", border: "border-danger/40" },
};

type ScoreSubmit = "" | "sending" | "ok" | "fail";

/** Shared card shell for the three end-of-run screens — headline, score
 *  block, best-score line and submit status are identical in structure and
 *  only swap accent color; per-screen stats/tips/actions come in as children. */
function RunSummaryCard({
  tone,
  headline,
  flavor,
  score,
  scoreLabel = "score",
  best,
  pb,
  newPb,
  scoreSubmit,
  children,
}: {
  tone: Tone;
  headline: string;
  flavor?: string;
  score: number;
  scoreLabel?: string;
  best: number;
  pb: number;
  newPb: boolean;
  scoreSubmit: ScoreSubmit;
  children: ReactNode;
}) {
  const t = TONE_CLASS[tone];

  return (
    <motion.div
      initial={{ scale: 0.9, y: 16 }}
      animate={{ scale: 1, y: 0 }}
      className={`rounded-2xl border ${t.border} bg-space-2/95 p-8 text-center max-md:mx-3 max-md:my-4 max-md:p-5`}
    >
      <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${t.text}`}>{headline}</p>
      {flavor && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">{flavor}</p>
      )}
      <p className="mt-3 font-display text-5xl font-bold tracking-tight max-md:text-4xl">{score}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
        {scoreLabel} · best {best}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
        pb {pb.toLocaleString()}
        {newPb && (
          <span className="ml-1.5 text-gold">★ new personal best</span>
        )}
      </p>
      {scoreSubmit === "sending" && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan">
          ◉ posting to leaderboard…
        </p>
      )}
      {scoreSubmit === "ok" && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-success">
          ✓ recorded on the global leaderboard
        </p>
      )}
      {scoreSubmit === "fail" && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-danger-bright">
          ! leaderboard unreachable — score kept locally
        </p>
      )}
      {score > 500000 && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim/70">
          board entries cap at 500,000
        </p>
      )}
      {children}
    </motion.div>
  );
}

/** Run-it-back + leave — identical on every end screen.
 *  "leave" opens the menu (keeps finalScore for claim/inscribe) instead of
 *  dumping straight into explore where ProfileCard + InscribeRow unmount. */
function EndButtonRow({ onRunItBack }: { onRunItBack: () => void }) {
  const openMenu = useGame((s) => s.openMenu);

  return (
    <div className="mt-6 flex justify-center gap-3">
      <button
        onClick={onRunItBack}
        className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
      >
        run it back
      </button>
      <button
        onClick={openMenu}
        className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
      >
        menu
      </button>
    </div>
  );
}

/** Inscribe-on-X1 + view-leaderboard row for the end-of-run screens.
 *  Uses a *live* wallet session (injected publicKey), not just the persisted
 *  address — a stale localStorage wallet used to show "inscribe" with no way
 *  to reconnect, and "edit profile" / board fallbacks called openMenu() which
 *  dismissed the score card. */
export function InscribeRow({ score }: { score: number }) {
  const wallet = useProfile((s) => s.wallet);
  const name = useProfile((s) => s.name);
  const connecting = useProfile((s) => s.connecting);
  const walletError = useProfile((s) => s.walletError);
  const finalDiff = useGame((s) => s.finalDiff);
  const finalStats = useGame((s) => s.finalStats);
  const [draftName, setDraftName] = useState(name);
  const [editingName, setEditingName] = useState(false);
  const [live, setLive] = useState(false);
  const [st, setSt] = useState<{ k: "idle" | "busy" | "done"; sig?: string; err?: string }>({
    k: "idle",
  });

  useEffect(() => {
    const sync = () => setLive(isWalletSessionLive());
    sync();
    const unwatch = watchWalletProvider();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(sync, 1500);
    return () => {
      unwatch();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, []);

  const applyName = () => {
    const trimmed = draftName.trim().slice(0, 20);
    useProfile.setState({ name: trimmed });
    setEditingName(false);
    if (trimmed && (live || wallet)) useGame.getState().retrySubmit();
  };

  const doConnect = async () => {
    setSt((s) => ({ ...s, err: undefined }));
    const addr = await ensureWalletSession();
    setLive(isWalletSessionLive());
    if (addr) useGame.getState().retrySubmit();
  };

  const doInscribe = async () => {
    if (st.k !== "idle") return;
    setSt({ k: "busy" });
    const addr = await ensureWalletSession();
    setLive(isWalletSessionLive());
    if (!addr || !isWalletSessionLive()) {
      setSt({
        k: "idle",
        err: getWalletProvider()
          ? "approve the wallet connection, then try again"
          : "connect an X1 Wallet (or Backpack) to inscribe — Phantom is not supported on X1",
      });
      return;
    }
    useGame.getState().retrySubmit();
    // Prefer the ended-run snapshot — `run` is reset by openMenu().
    const diff = finalDiff || run.difficulty;
    const captured = finalStats?.captured ?? run.captured;
    const r = await inscribeRun({
      name: useProfile.getState().name,
      score,
      diff,
      captured,
      total: TOTAL_SITES,
    });
    setSt(r.sig ? { k: "done", sig: r.sig } : { k: "idle", err: r.error });
  };

  const viewBoard = () => {
    // Never openMenu() from here — that dismisses the end card. Scroll only.
    document.getElementById("x1-leaderboard")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const needsConnect = !live;
  const needsName = live && !name.trim();
  const canInscribe = live && !!name.trim();

  return (
    <div className="mt-4">
      {needsConnect ? (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={applyName}
              onKeyDown={(e) => e.key === "Enter" && applyName()}
              placeholder="ninja name"
              maxLength={20}
              className="w-32 rounded-md border border-white/15 bg-space/70 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink placeholder:text-ink-dim/50 focus:border-gold/60 focus:outline-none"
            />
            <button
              onClick={() => void doConnect()}
              disabled={connecting}
              title="connect to inscribe on x1 and post your score to the board"
              className="rounded-md border border-gold/60 bg-gold/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gold transition-all hover:-translate-y-px hover:border-gold disabled:opacity-45 disabled:hover:translate-y-0"
            >
              {connecting
                ? "connecting…"
                : wallet
                  ? "↯ reconnect wallet"
                  : "↯ connect wallet"}
            </button>
            <button
              onClick={viewBoard}
              className="rounded-md border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan transition-colors hover:border-cyan"
            >
              ★ view leaderboard
            </button>
          </div>
          {!walletError && (
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim/60">
              {wallet
                ? `saved ${shortAddr(wallet)} — reconnect to sign on x1 (phantom not supported)`
                : "name + wallet needed to rank · connect x1 wallet or backpack to inscribe"}
            </p>
          )}
        </>
      ) : needsName || editingName ? (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={applyName}
              onKeyDown={(e) => e.key === "Enter" && applyName()}
              placeholder="ninja name"
              maxLength={20}
              autoFocus={editingName}
              className="w-40 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-gold placeholder:text-gold/40 focus:border-gold focus:outline-none"
            />
            <button
              onClick={applyName}
              className="rounded-md border border-gold/60 bg-gold/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gold transition-all hover:-translate-y-px hover:border-gold"
            >
              save & post
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim/60">
            set a name to post this score to the global leaderboard
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {st.k === "done" && st.sig ? (
              <a
                href={explorerTx(st.sig)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-success/50 bg-success/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success transition-colors hover:border-success"
              >
                inscribed on x1 — view transaction ↗
              </a>
            ) : (
              <button
                onClick={() => void doInscribe()}
                disabled={st.k === "busy" || !canInscribe}
                title="write this score to X1 mainnet forever (tiny XNT fee)"
                className="rounded-md border border-gold/60 bg-gold/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gold transition-all hover:-translate-y-px hover:border-gold disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {st.k === "busy" ? "inscribing…" : "inscribe score on x1"}
              </button>
            )}
            <button
              onClick={viewBoard}
              className="rounded-md border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan transition-colors hover:border-cyan"
            >
              ★ view leaderboard
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim/60">
            posting as {name}
            {wallet ? ` · ${shortAddr(wallet)}` : ""} ·{" "}
            <button
              onClick={() => {
                setDraftName(name);
                setEditingName(true);
              }}
              className="underline hover:text-gold"
            >
              edit name
            </button>
          </p>
        </>
      )}
      {walletError && !live && (
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-danger-bright">
          {!getWalletProvider() ? (
            <>
              no supported wallet — get{" "}
              <a
                href="https://wallet.x1.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-gold"
              >
                X1 Wallet
              </a>{" "}
              at wallet.x1.xyz (or Backpack). Phantom does not support X1.
            </>
          ) : (
            walletError
          )}
        </p>
      )}
      {st.err && (
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-danger-bright">
          {st.err}
        </p>
      )}
    </div>
  );
}

/** Pause screen — interruptions never cost the run. */
export function PauseScreen() {
  const hud = useGame((s) => s.hud);
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">paused</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
          block {hud.block} · lv {hud.level} · {hud.kills} kills ·{" "}
          <span className="text-cyan">
            {hud.captured}/{TOTAL_SITES} sites
          </span>
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => useGame.getState().resume()}
            className="rounded-xl border border-gold bg-gold px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-space transition-transform hover:-translate-y-0.5 hover:bg-[#ffd97a]"
          >
            resume
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-xl border border-white/20 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-ink-dim transition-colors hover:border-danger/70 hover:text-danger-bright"
            >
              abandon run
            </button>
          ) : (
            <button
              onClick={() => useGame.getState().openMenu()}
              className="rounded-xl border border-danger/70 bg-danger/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-danger-bright transition-colors hover:bg-danger/20"
            >
              confirm abandon
            </button>
          )}
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-dim/60">
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
  const best = useGame((s) => s.best);
  const pb = useGame((s) => s.pb);
  const newPb = useGame((s) => s.newPb);
  const finalScore = useGame((s) => s.finalScore);
  const scoreSubmit = useGame((s) => s.scoreSubmit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <RunSummaryCard
        tone="gold"
        headline={`ecosystem complete — all ${TOTAL_SITES} projects captured`}
        score={finalScore}
        scoreLabel={`score (incl. ${FULL_CLEAR_BONUS} conquest bonus)`}
        best={best}
        pb={pb}
        newPb={newPb}
        scoreSubmit={scoreSubmit}
      >
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
          {Math.floor(hud.time / 60)}m {Math.floor(hud.time % 60)}s · {hud.block} blocks ·{" "}
          {hud.kills} kills
        </p>
        <InscribeRow score={finalScore} />
        <EndButtonRow onRunItBack={() => start()} />
      </RunSummaryCard>
    </motion.div>
  );
}

/** Death screen. */
export function DeathScreen() {
  const hud = useGame((s) => s.hud);
  const start = useGame((s) => s.start);
  const best = useGame((s) => s.best);
  const pb = useGame((s) => s.pb);
  const newPb = useGame((s) => s.newPb);
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
      <RunSummaryCard
        tone="danger"
        headline={DEATH_FLAVOR[deathCause] ?? "the bear market got you"}
        score={finalScore}
        best={best}
        pb={pb}
        newPb={newPb}
        scoreSubmit={scoreSubmit}
      >
        <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
          <p>{hud.block} blocks survived · {hud.kills} kills · {hud.captured} sites</p>
        </div>
        <InscribeRow score={finalScore} />
        <EndButtonRow onRunItBack={() => start()} />
      </RunSummaryCard>
    </motion.div>
  );
}

/** Time-attack bell — the clock ran out. The EXPECTED end for most runs,
 *  so it's a neutral score bank, not a death card. */
export function TimeUpScreen() {
  const hud = useGame((s) => s.hud);
  const start = useGame((s) => s.start);
  const best = useGame((s) => s.best);
  const pb = useGame((s) => s.pb);
  const newPb = useGame((s) => s.newPb);
  const finalScore = useGame((s) => s.finalScore);
  const scoreSubmit = useGame((s) => s.scoreSubmit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/70 backdrop-blur-sm max-md:fixed"
    >
      <RunSummaryCard
        tone="cyan"
        headline="time's up — the bell rings"
        score={finalScore}
        best={best}
        pb={pb}
        newPb={newPb}
        scoreSubmit={scoreSubmit}
      >
        <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
          <p>{hud.block} blocks · {hud.kills} kills · {hud.captured}/{TOTAL_SITES} sites</p>
          <p className="text-ink-dim/70">
            capture every site + slay the boss before the bell for +{FULL_CLEAR_BONUS}
          </p>
        </div>
        <InscribeRow score={finalScore} />
        <EndButtonRow onRunItBack={() => start()} />
      </RunSummaryCard>
    </motion.div>
  );
}
