import { NextResponse } from "next/server";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base58, base64 } from "@scure/base";
import { nonceValid } from "@/lib/nonce";

/**
 * Global leaderboard, backed by Supabase (PostgREST — no client dependency).
 * Table `public.leaderboard` has RLS enabled with no public policies; only
 * this route's service-role key can touch it. Falls back to in-memory when
 * the env vars are absent so local demos still work.
 */

const SB_URL =
  process.env["NEXT_PUBLIC_x1_world_new_SUPABASE_URL"] ?? process.env.SUPABASE_URL;
const SB_KEY =
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

type Entry = { name: string; wallet: string; score: number; diff: string; at: number };

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

// Stable identity: the wallet when connected, else the browser's device ID.
// The display name is a LABEL, never the key — renames relabel, not duplicate.
function deriveMember(wallet: string, deviceId: unknown): string | null {
  if (wallet) return `w:${wallet}`;
  const d = String(deviceId ?? "");
  return /^[\w-]{8,64}$/.test(d) ? `d:${d}` : null;
}

export async function GET() {
  try {
    if (SB_URL && SB_KEY) {
      const res = await sb(
        "leaderboard?select=name,wallet,score,diff,verified&order=score.desc&limit=25",
      );
      if (!res.ok) throw new Error(`sb ${res.status}`);
      const rows = (await res.json()) as Omit<Entry, "at">[];
      const board = rows.map((r, i) => ({ rank: i + 1, ...r }));
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
      .slice(0, 20);
    const wallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(body.wallet ?? "")) ? String(body.wallet) : "";
    const score = Math.max(0, Math.min(500_000, Math.round(Number(body.score) || 0)));
    const diff = ["normal", "hard", "cursed"].includes(String(body.diff)) ? String(body.diff) : "normal";
    if (!name || score <= 0) return NextResponse.json({ ok: false }, { status: 400 });

    // proof of wallet ownership: ed25519 signature over a server nonce
    let verified = false;
    const b = body as Partial<Entry> & { ts?: string; nonce?: string; sig?: string };
    if (wallet && b.ts && b.nonce && b.sig && nonceValid(b.ts, b.nonce)) {
      try {
        const msg = new TextEncoder().encode(
          `x1.world run · score:${score} · diff:${diff} · ${b.nonce}`,
        );
        verified = ed25519.verify(base64.decode(b.sig), msg, base58.decode(wallet));
      } catch {
        verified = false;
      }
    }

    const member = deriveMember(wallet, (body as { deviceId?: string }).deviceId);
    if (!member) return NextResponse.json({ ok: false }, { status: 400 });
    if (SB_URL && SB_KEY) {
      // keep personal best only: read current, upsert if beaten
      const cur = await sb(`leaderboard?member=eq.${encodeURIComponent(member)}&select=score`);
      const rows = cur.ok ? ((await cur.json()) as { score: number }[]) : [];
      if (rows.length === 0 || rows[0].score < score) {
        await sb("leaderboard?on_conflict=member", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify([
            { member, name, wallet, score, diff, verified, updated_at: new Date().toISOString() },
          ]),
        });
      } else {
        // score didn't beat the best — still honor a rename (label update only)
        await sb(`leaderboard?member=eq.${encodeURIComponent(member)}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
      }
    } else {
      const prev = mem.get(member);
      if (!prev || prev.score < score) mem.set(member, { name, wallet, score, diff, at: Date.now() });
      else mem.set(member, { ...prev, name });
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
    const b = (await req.json()) as {
      wallet?: string;
      deviceId?: string;
      ts?: string;
      nonce?: string;
      sig?: string;
    };
    const wallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(b.wallet ?? "")) ? String(b.wallet) : "";
    let member: string | null = null;
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
      member = `w:${wallet}`;
    } else {
      member = deriveMember("", b.deviceId);
    }
    if (!member) return NextResponse.json({ ok: false }, { status: 400 });
    if (SB_URL && SB_KEY) {
      await sb(`leaderboard?member=eq.${encodeURIComponent(member)}`, { method: "DELETE" });
    } else {
      mem.delete(member);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
