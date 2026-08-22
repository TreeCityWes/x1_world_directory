import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/ratelimit";

/**
 * Broadcast a wallet-signed inscription to X1 mainnet. The browser can
 * already talk to the RPC (CORS is open), but some wallets / extensions
 * intercept or fail that send; this relay keeps the cluster on X1.
 */

const X1_RPC = "https://rpc.mainnet.x1.xyz";
const MAX_B64 = 2400; // ~1232-byte Solana packet + base64 overhead

export async function POST(req: Request) {
  if (rateLimited(req, "inscribe", 8)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  try {
    const body = (await req.json()) as { tx?: unknown };
    const tx = typeof body.tx === "string" ? body.tx.trim() : "";
    if (!tx || tx.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(tx)) {
      return NextResponse.json({ error: "invalid transaction" }, { status: 400 });
    }
    const res = await fetch(X1_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [tx, { encoding: "base64", preflightCommitment: "confirmed" }],
      }),
    });
    const j = (await res.json()) as {
      result?: string;
      error?: { message?: string };
    };
    if (j.error?.message) {
      return NextResponse.json({ error: j.error.message }, { status: 400 });
    }
    if (!j.result) {
      return NextResponse.json({ error: "rpc did not return a signature" }, { status: 502 });
    }
    return NextResponse.json({ sig: j.result });
  } catch {
    return NextResponse.json({ error: "couldn't reach X1 — try again" }, { status: 502 });
  }
}
