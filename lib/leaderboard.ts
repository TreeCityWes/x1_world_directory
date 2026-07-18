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
 * Submit a ranked run. The wallet must sign a server nonce proving control of
 * the address; guests keep local bests but do not write to the global board.
 * The signature proves identity, not that the client-side run is cheat-proof.
 */
export async function submitScore(payload: {
  name: string;
  wallet: string;
  score: number;
  diff: string;
}): Promise<boolean> {
  try {
    if (!payload.wallet) return false;
    const nonceRes = await fetch("/api/leaderboard/nonce", { cache: "no-store" });
    if (!nonceRes.ok) return false;
    const { ts, nonce } = (await nonceRes.json()) as { ts?: string; nonce?: string };
    if (!ts || !nonce) return false;
    const msg = `x1.world run · score:${payload.score} · diff:${payload.diff} · ${nonce}`;
    const sig = await signWithWallet(msg);
    if (!sig) return false;
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, ts, nonce, sig }),
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
