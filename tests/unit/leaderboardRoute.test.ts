import { beforeAll, describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base58, base64 } from "@scure/base";

type LeaderboardRoute = typeof import("@/app/api/leaderboard/route");
type NonceModule = typeof import("@/lib/nonce");

let route: LeaderboardRoute;
let nonces: NonceModule;

beforeAll(async () => {
  // Keep route tests on the in-memory adapter even when a developer has live
  // Supabase credentials in .env.local.
  process.env["NEXT_PUBLIC_x1_world_new_SUPABASE_URL"] = "";
  process.env.SUPABASE_URL = "";
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  route = await import("@/app/api/leaderboard/route");
  nonces = await import("@/lib/nonce");
});

function jsonRequest(method: "POST" | "DELETE", body: unknown) {
  return new Request("http://localhost/api/leaderboard", {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.20" },
    body: JSON.stringify(body),
  });
}

describe("leaderboard route", () => {
  it("rejects unsigned guest scores from the ranked board", async () => {
    const response = await route.POST(
      jsonRequest("POST", {
        name: "guest",
        score: 500_000,
        diff: "cursed",
        deviceId: "forged-device-1234",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "wallet_proof_required",
    });
  });

  it("accepts a wallet-owned score and permits signed removal", async () => {
    const secret = new Uint8Array(32).fill(7);
    const wallet = base58.encode(ed25519.getPublicKey(secret));
    const ts = String(Date.now());
    const nonce = nonces.nonceFor(ts);
    const message = new TextEncoder().encode(
      `x1.world run · score:1234 · diff:hard · ${nonce}`,
    );
    const sig = base64.encode(ed25519.sign(message, secret));

    const submitted = await route.POST(
      jsonRequest("POST", { name: "signed", wallet, score: 1234, diff: "hard", ts, nonce, sig }),
    );
    expect(submitted.status).toBe(200);

    const board = (await (await route.GET()).json()) as {
      board: { wallet: string; score: number }[];
    };
    expect(board.board).toContainEqual(
      expect.objectContaining({ wallet, score: 1234 }),
    );

    const removeTs = String(Date.now());
    const removeNonce = nonces.nonceFor(removeTs);
    const removeMessage = new TextEncoder().encode(
      `x1.world · remove my entries · ${removeNonce}`,
    );
    const removeSig = base64.encode(ed25519.sign(removeMessage, secret));
    const removed = await route.DELETE(
      jsonRequest("DELETE", {
        wallet,
        ts: removeTs,
        nonce: removeNonce,
        sig: removeSig,
      }),
    );
    expect(removed.status).toBe(200);
  });
});
