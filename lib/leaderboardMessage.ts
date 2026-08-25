import type { RunStats } from "@/lib/scoreFormula";

/** Canonical signed message for a ranked run — shared by client + API. */
export function runSignMessage(opts: {
  score: number;
  diff: string;
  stats: RunStats;
  startedAt: number;
  nonce: string;
}): string {
  const { score, diff, stats, startedAt, nonce } = opts;
  return (
    `x1.world run · score:${score} · diff:${diff}` +
    ` · t:${Math.round(stats.t)} · k:${stats.kills} · d:${Math.round(stats.damage)}` +
    ` · c:${stats.captured} · w:${stats.win ? 1 : 0} · rt:${startedAt} · ${nonce}`
  );
}
