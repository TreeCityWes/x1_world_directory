import { NextResponse } from "next/server";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base58, base64 } from "@scure/base";
import { nonceValid } from "@/lib/nonce";
import { rateLimited } from "@/lib/ratelimit";
import { verifyRunToken } from "@/lib/runToken";
import {
  SCORE_BOARD_CAP,
  clampBoardScore,
  computeRunScore,
  mutatorById,
  statsPlausible,
  type DifficultyId,
  type RunStats,
} from "@/lib/scoreFormula";
import { runSignMessage } from "@/lib/leaderboardMessage";

/**
 * Global leaderboard, backed by Supabase (PostgREST — no client dependency).
 * Table `public.leaderboard` has RLS enabled with no public policies; only
 * this route's service-role key can touch it. Falls back to in-memory when
 * the env vars are absent so local demos still work.
 *
 * Ranked identity is per wallet × difficulty (`w:<pubkey>:<diff>`), so a
 * player keeps separate personal bests on Normal / Hard / Cursed. Legacy
 * rows keyed `w:<pubkey>` (pre–per-diff) are still wiped on self-serve delete.
 */

const SB_URL =
  process.env["NEXT_PUBLIC_x1_world_new_SUPABASE_URL"] ?? process.env.SUPABASE_URL;
const SB_KEY =
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

type Entry = { name: string; wallet: string; score: number; diff: string; at: number; verified?: boolean };

// in-memory fallback store
const mem = (globalThis as unknown as { __x1lb?: Map<string, Entry> }).__x1lb ?? new Map<string, Entry>();
(globalThis as unknown as { __x1lb?: Map<string, Entry> }).__x1lb = mem;

function sb(path: string, init?: RequestInit) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY!,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

/** Primary key for a ranked PB — one row per wallet per difficulty. */
export function rankedMember(wallet: string, diff: DifficultyId): string {
  return `w:${wallet}:${diff}`;
}

function isWalletMemberKey(key: string, wallet: string): boolean {
  return key === `w:${wallet}` || key.startsWith(`w:${wallet}:`);
}

// Guest device IDs are retained only so existing guest rows can still be
// removed by their owners.
function deriveMember(wallet: string, deviceId: unknown): string | null {
  if (wallet) return `w:${wallet}`;
  const d = String(deviceId ?? "");
  return /^[\w-]{8,64}$/.test(d) ? `d:${d}` : null;
}

function clearMemForWallet(wallet: string) {
  for (const key of [...mem.keys()]) {
    if (isWalletMemberKey(key, wallet)) mem.delete(key);
  }
}

function renameMemForWallet(wallet: string, name: string) {
  for (const [key, entry] of mem) {
    if (isWalletMemberKey(key, wallet)) mem.set(key, { ...entry, name });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const diffFilter = searchParams.get("diff");
    const filterDiff = diffFilter && diffFilter !== "all" ? diffFilter : null;

    if (SB_URL && SB_KEY) {
      let query = "leaderboard?select=name,wallet,score,diff,verified&verified=eq.true&order=score.desc&limit=25";
      if (filterDiff) query += `&diff=eq.${encodeURIComponent(filterDiff)}`;
      const res = await sb(query);
      if (!res.ok) throw new Error(`sb ${res.status}`);
      const rows = (await res.json()) as Omit<Entry, "at">[];
      const board = rows.map((r, i) => ({ rank: i + 1, ...r }));
      return NextResponse.json({ ok: true, board, persistent: true });
    }
    const board = [...mem.values()]
      .filter((e) => e.verified)
      .filter((e) => (filterDiff ? e.diff === filterDiff : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((e, i) => ({ rank: i + 1, name: e.name, wallet: e.wallet, score: e.score, diff: e.diff, verified: true }));
    return NextResponse.json({ ok: true, board, persistent: false });
  } catch {
    return NextResponse.json({ ok: false, board: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (rateLimited(req, "post", 12)) {
      return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
    }
    const body = (await req.json()) as Partial<Entry> & {
      ts?: string;
      nonce?: string;
      sig?: string;
      runToken?: string;
      stats?: Partial<RunStats>;
    };
    const name = String(body.name ?? "")
      .replace(/[^\w \-.✨🥷]/g, "")
      .trim()
      .slice(0, 20);
    const wallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(body.wallet ?? "")) ? String(body.wallet) : "";
    const claimedScore = Math.round(Number(body.score) || 0);
    const diff = (["normal", "hard", "cursed"].includes(String(body.diff))
      ? String(body.diff)
      : "normal") as DifficultyId;
    if (!name || claimedScore <= 0) return NextResponse.json({ ok: false }, { status: 400 });

    // Ranked submissions require proof of wallet ownership + a server-issued
    // run token. The signature binds identity; the token + stats recompute
    // bind the score to a started run (SEC-01). Still not a full server sim.
    if (!(wallet && body.ts && body.nonce && body.sig && nonceValid(body.ts, body.nonce))) {
      return NextResponse.json({ ok: false, error: "wallet_proof_required" }, { status: 401 });
    }

    const tokenCheck = verifyRunToken(String(body.runToken ?? ""));
    if (!tokenCheck.claims) {
      return NextResponse.json({ ok: false, error: tokenCheck.error ?? "run_token_required" }, { status: 401 });
    }
    const claims = tokenCheck.claims;
    if (claims.difficulty !== diff) {
      return NextResponse.json({ ok: false, error: "difficulty_mismatch" }, { status: 400 });
    }
    const mutator = mutatorById(claims.mutatorId);
    if (!mutator) {
      return NextResponse.json({ ok: false, error: "invalid_mutator" }, { status: 400 });
    }

    const stats: RunStats = {
      t: Number(body.stats?.t) || 0,
      kills: Math.round(Number(body.stats?.kills) || 0),
      damage: Number(body.stats?.damage) || 0,
      captured: Math.round(Number(body.stats?.captured) || 0),
      win: !!body.stats?.win,
    };
    const wallElapsedSec = (Date.now() - claims.startedAt) / 1000;
    const bad = statsPlausible(stats, { timeMult: mutator.timeMult, wallElapsedSec });
    if (bad) {
      return NextResponse.json({ ok: false, error: bad }, { status: 400 });
    }

    const expected = clampBoardScore(
      computeRunScore({
        ...stats,
        difficulty: diff,
        mutatorScoreMult: mutator.scoreMult,
        timeMult: mutator.timeMult,
      }),
    );
    const score = clampBoardScore(claimedScore);
    // accept only exact formula match (after board clamp) — no inflation
    if (score !== expected || score > SCORE_BOARD_CAP) {
      return NextResponse.json({ ok: false, error: "score_mismatch" }, { status: 400 });
    }

    const msg = new TextEncoder().encode(
      runSignMessage({
        score,
        diff,
        stats,
        startedAt: claims.startedAt,
        nonce: body.nonce,
      }),
    );
    let verified = false;
    try {
      verified = ed25519.verify(base64.decode(body.sig), msg, base58.decode(wallet));
    } catch {
      verified = false;
    }
    if (!verified) {
      return NextResponse.json({ ok: false, error: "invalid_wallet_proof" }, { status: 401 });
    }

    const member = rankedMember(wallet, diff);
    if (SB_URL && SB_KEY) {
      const row = {
        member,
        name,
        wallet,
        score,
        diff,
        verified: true,
        updated_at: new Date().toISOString(),
      };

      // Insert without replacing, then promote only when the stored score is
      // lower. The predicate prevents concurrent submissions lowering a best.
      const inserted = await sb("leaderboard?on_conflict=member", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify([row]),
      });
      if (!inserted.ok) throw new Error(`sb insert ${inserted.status}`);

      const promoted = await sb(
        `leaderboard?member=eq.${encodeURIComponent(member)}&score=lt.${score}`,
        { method: "PATCH", body: JSON.stringify(row) },
      );
      if (!promoted.ok) throw new Error(`sb promote ${promoted.status}`);

      // A lower run may still rename across every difficulty row for this wallet.
      const renamed = await sb(`leaderboard?wallet=eq.${encodeURIComponent(wallet)}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!renamed.ok) throw new Error(`sb rename ${renamed.status}`);
    } else {
      const prev = mem.get(member);
      if (!prev || prev.score < score) mem.set(member, { name, wallet, score, diff, at: Date.now(), verified: true });
      renameMemForWallet(wallet, name);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/**
 * Self-serve removal. Guests prove ownership by knowing their device ID
 * (it never leaves their browser otherwise); wallet users sign a nonce.
 * Deletion is not a ban — the next named run re-adds them.
 */
export async function DELETE(req: Request) {
  try {
    if (rateLimited(req, "del", 5)) {
      return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
    }
    const b = (await req.json()) as {
      wallet?: string;
      deviceId?: string;
      ts?: string;
      nonce?: string;
      sig?: string;
    };
    const wallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(b.wallet ?? "")) ? String(b.wallet) : "";
    if (wallet) {
      if (!(b.ts && b.nonce && b.sig && nonceValid(b.ts, b.nonce))) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
      const msg = new TextEncoder().encode(`x1.world · remove my entries · ${b.nonce}`);
      let proven = false;
      try {
        proven = ed25519.verify(base64.decode(b.sig), msg, base58.decode(wallet));
      } catch {
        proven = false;
      }
      if (!proven) return NextResponse.json({ ok: false }, { status: 401 });
      if (SB_URL && SB_KEY) {
        // wipe every difficulty (+ any legacy w:<wallet> row) for this address
        const res = await sb(`leaderboard?wallet=eq.${encodeURIComponent(wallet)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`sb delete ${res.status}`);
      } else {
        clearMemForWallet(wallet);
      }
      return NextResponse.json({ ok: true });
    }

    const member = deriveMember("", b.deviceId);
    if (!member) return NextResponse.json({ ok: false }, { status: 400 });
    if (SB_URL && SB_KEY) {
      const res = await sb(`leaderboard?member=eq.${encodeURIComponent(member)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`sb delete ${res.status}`);
    } else {
      mem.delete(member);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
