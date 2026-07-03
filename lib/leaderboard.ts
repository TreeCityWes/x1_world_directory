"use client";

export type BoardEntry = {
  rank: number;
  name: string;
  wallet: string;
  score: number;
  diff: string;
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

/** fire-and-forget — a lost submission must never affect the game */
export function submitScore(payload: { name: string; wallet: string; score: number; diff: string }) {
  try {
    void fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // offline — fine
  }
}
