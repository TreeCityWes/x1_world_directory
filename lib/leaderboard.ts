"use client";

import { getDeviceId, signWithWallet } from "@/lib/profile";

export type BoardEntry = {
  rank: number;
  name: string;
  wallet: string;
  score: number;
  diff: string;
  verified?: boolean;
};

export async function fetchBoard(): Promise<{ board: BoardEntry[]; persistent: boolean }> {
  try {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    const j = (await res.json()) as { board: BoardEntry[]; persistent?: boolean };
    return { board: j.board ?? [], persistent: j.persistent ?? false };
  } catch {
    return { board: [], persistent: false };
  }
}

/**
 * Submit a run. If a wallet is connected we ask it to sign a server nonce so
 * the board can mark the run "verified" (proof the player controls the
 * address — watch-only imports can't produce this). Resolves true when the
 * board acknowledged the score, so the death/win screens can say so.
 */
export async function submitScore(payload: {
  name: string;
  wallet: string;
  score: number;
  diff: string;
}): Promise<boolean> {
  try {
    let proof: { ts: string; nonce: string; sig: string } | null = null;
    if (payload.wallet) {
      try {
        const { ts, nonce } = (await (await fetch("/api/leaderboard/nonce")).json()) as {
          ts: string;
          nonce: string;
        };
        const msg = `x1.world run · score:${payload.score} · diff:${payload.diff} · ${nonce}`;
        const sig = await signWithWallet(msg);
        if (sig) proof = { ts, nonce, sig };
      } catch {
        // wallet declined or can't sign — submit unverified
      }
    }
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, deviceId: getDeviceId(), ...proof }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    // offline — a lost submission must never affect the game
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
      if (!sig) return false; // declined the signature — nothing removed
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
