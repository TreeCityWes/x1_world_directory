"use client";

import { getDeviceId, signWithWallet } from "@/lib/profile";
import { runSignMessage } from "@/lib/leaderboardMessage";
import { clampBoardScore, type DifficultyId, type RunStats } from "@/lib/scoreFormula";

export type BoardEntry = {
  rank: number;
  name: string;
  wallet: string;
  score: number;
  diff: string;
  verified?: boolean;
};

export type RunProof = {
  token: string;
  startedAt: number;
  difficulty: DifficultyId;
  mutatorId: string;
};

export { runSignMessage };

/** Mint a server run token when a ranked attempt begins (SEC-01). */
export async function beginRun(difficulty: DifficultyId): Promise<RunProof | null> {
  try {
    const res = await fetch("/api/leaderboard/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      ok?: boolean;
      token?: string;
      startedAt?: number;
      difficulty?: DifficultyId;
      mutatorId?: string;
    };
    if (!j.ok || !j.token || !j.startedAt || !j.difficulty || !j.mutatorId) return null;
    return {
      token: j.token,
      startedAt: j.startedAt,
      difficulty: j.difficulty,
      mutatorId: j.mutatorId,
    };
  } catch {
    return null;
  }
}

export async function fetchBoard(diff?: string): Promise<{ board: BoardEntry[]; persistent: boolean }> {
  try {
    const qs = diff && diff !== "all" ? `?diff=${encodeURIComponent(diff)}` : "";
    const res = await fetch(`/api/leaderboard${qs}`, { cache: "no-store" });
    const j = (await res.json()) as { board: BoardEntry[]; persistent?: boolean };
    return { board: j.board ?? [], persistent: j.persistent ?? false };
  } catch {
    return { board: [], persistent: false };
  }
}

/**
 * Submit a ranked run. Requires a wallet signature AND a server-issued run
 * token from beginRun(). Guests keep local bests but do not write the board.
 */
export async function submitScore(payload: {
  name: string;
  wallet: string;
  score: number;
  diff: string;
  stats: RunStats;
  runToken: string;
  startedAt: number;
}): Promise<boolean> {
  try {
    if (!payload.wallet || !payload.runToken) return false;
    const score = clampBoardScore(payload.score);
    if (score <= 0) return false;
    const nonceRes = await fetch("/api/leaderboard/nonce", { cache: "no-store" });
    if (!nonceRes.ok) return false;
    const { ts, nonce } = (await nonceRes.json()) as { ts?: string; nonce?: string };
    if (!ts || !nonce) return false;
    const msg = runSignMessage({
      score,
      diff: payload.diff,
      stats: payload.stats,
      startedAt: payload.startedAt,
      nonce,
    });
    const sig = await signWithWallet(msg);
    if (!sig) return false;
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        wallet: payload.wallet,
        score,
        diff: payload.diff,
        stats: payload.stats,
        runToken: payload.runToken,
        ts,
        nonce,
        sig,
      }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Self-serve removal: wallet users sign a nonce (only the key holder can
 * wipe that address); guests present their device ID. Not a ban — the next
 * named run re-adds them.
 */
export async function removeMe(wallet: string): Promise<boolean> {
  try {
    let proof: { ts: string; nonce: string; sig: string } | null = null;
    if (wallet) {
      const { ts, nonce } = (await (await fetch("/api/leaderboard/nonce")).json()) as {
        ts: string;
        nonce: string;
      };
      const sig = await signWithWallet(`x1.world · remove my entries · ${nonce}`);
      if (!sig) return false;
      proof = { ts, nonce, sig };
    }
    const res = await fetch("/api/leaderboard", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, deviceId: getDeviceId(), ...proof }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
