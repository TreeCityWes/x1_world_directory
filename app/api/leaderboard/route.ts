import { NextResponse } from "next/server";

/**
 * Global leaderboard. Backed by Upstash Redis (set UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN in Vercel — the Upstash marketplace integration
 * provides both). Without them it falls back to in-memory (per-instance,
 * resets on redeploy) so the feature still demos locally.
 */

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type Entry = { name: string; wallet: string; score: number; diff: string; at: number };

// in-memory fallback store
const mem = (globalThis as unknown as { __x1lb?: Map<string, Entry> }).__x1lb ?? new Map<string, Entry>();
(globalThis as unknown as { __x1lb?: Map<string, Entry> }).__x1lb = mem;

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(`${URL_}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

const memberOf = (e: { name: string; wallet: string }) =>
  `${e.name}|${e.wallet ? e.wallet.slice(0, 8) : "guest"}`;

export async function GET() {
  try {
    if (URL_ && TOKEN) {
      const raw = (await redis(["ZRANGE", "lb", 0, 24, "REV", "WITHSCORES"])) as string[];
      const board = [];
      for (let i = 0; i < raw.length; i += 2) {
        const member = raw[i];
        const score = Number(raw[i + 1]);
        const info = (await redis(["HGET", "lb:info", member])) as string | null;
        const meta = info ? (JSON.parse(info) as Partial<Entry>) : {};
        board.push({
          rank: i / 2 + 1,
          name: member.split("|")[0],
          wallet: meta.wallet ?? "",
          score,
          diff: meta.diff ?? "normal",
        });
      }
      return NextResponse.json({ ok: true, board, persistent: true });
    }
    const board = [...mem.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((e, i) => ({ rank: i + 1, name: e.name, wallet: e.wallet, score: e.score, diff: e.diff }));
    return NextResponse.json({ ok: true, board, persistent: false });
  } catch {
    return NextResponse.json({ ok: false, board: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Entry>;
    const name = String(body.name ?? "")
      .replace(/[^\w \-.✨🥷]/g, "")
      .trim()
      .slice(0, 20) || "anon ninja";
    const wallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(body.wallet ?? "")) ? String(body.wallet) : "";
    const score = Math.max(0, Math.min(500_000, Math.round(Number(body.score) || 0)));
    const diff = ["normal", "hard", "cursed"].includes(String(body.diff)) ? String(body.diff) : "normal";
    if (score <= 0) return NextResponse.json({ ok: false }, { status: 400 });

    const member = memberOf({ name, wallet });
    if (URL_ && TOKEN) {
      await redis(["ZADD", "lb", "GT", score, member]); // keep personal best only
      await redis(["HSET", "lb:info", member, JSON.stringify({ wallet, diff, at: Date.now() })]);
    } else {
      const prev = mem.get(member);
      if (!prev || prev.score < score) mem.set(member, { name, wallet, score, diff, at: Date.now() });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
