import { NextResponse } from "next/server";
import { nonceFor } from "@/lib/nonce";
import { rateLimited } from "@/lib/ratelimit";

export async function GET(req: Request) {
  // challenge farming / DoS guard — a client needs at most one per submit
  if (rateLimited(req, "nonce", 30)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const ts = String(Date.now());
  return NextResponse.json({ ts, nonce: nonceFor(ts) });
}
