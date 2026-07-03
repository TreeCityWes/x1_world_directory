import { NextResponse } from "next/server";
import { nonceFor } from "@/lib/nonce";

export async function GET() {
  const ts = String(Date.now());
  return NextResponse.json({ ts, nonce: nonceFor(ts) });
}
