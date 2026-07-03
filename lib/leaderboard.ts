"use client";

import { signWithWallet } from "@/lib/profile";

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
 * Fire-and-forget submit. If a wallet is connected we ask it to sign a
 * server nonce so the board can mark the run "verified" (proof the player
 * controls the address — watch-only imports can't produce this).
 */
export function submitScore(payload: { name: string; wallet: string; score: number; diff: string }) {
  void (async () => {
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
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...proof }),
        keepalive: true,
      });
    } catch {
      // offline — a lost submission must never affect the game
    }
  })();
}
