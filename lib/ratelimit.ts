/**
 * Best-effort per-instance IP rate limiting. Blunts casual spam; real
 * protection is provider-level (Vercel/edge). Shared by the leaderboard
 * POST/DELETE and the nonce GET.
 */
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, kind: string, max: number, windowMs = 60_000): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // memory backstop
  return false;
}
