import { NextResponse } from "next/server";
import { issueRunToken } from "@/lib/runToken";
import { rateLimited } from "@/lib/ratelimit";
import type { DifficultyId } from "@/lib/scoreFormula";

/**
 * Mint a run token at the start of a ranked attempt (SEC-01).
 * The client must present this token when submitting a score.
 */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "run", 20)) {
      return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { difficulty?: string };
    const difficulty = (["normal", "hard", "cursed"].includes(String(body.difficulty))
      ? String(body.difficulty)
      : "normal") as DifficultyId;
    const issued = issueRunToken(difficulty);
    if (!issued) {
      // Misconfigured production (no HMAC secret) — ranked submits will also
      // fail closed. Return 200 so clients don't log a console network error
      // on every casual start (smoke / guests / local demos).
      return NextResponse.json({ ok: false, error: "unavailable" });
    }
    return NextResponse.json({
      ok: true,
      token: issued.token,
      startedAt: issued.claims.startedAt,
      difficulty: issued.claims.difficulty,
      mutatorId: issued.claims.mutatorId,
      exp: issued.claims.exp,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
