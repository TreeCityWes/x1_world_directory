import { beforeAll, describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base58, base64 } from "@scure/base";

type LeaderboardRoute = typeof import("@/app/api/leaderboard/route");
type RunRoute = typeof import("@/app/api/leaderboard/run/route");
type NonceModule = typeof import("@/lib/nonce");
type ScoreModule = typeof import("@/lib/scoreFormula");
type MsgModule = typeof import("@/lib/leaderboardMessage");

let route: LeaderboardRoute;
let runRoute: RunRoute;
let nonces: NonceModule;
let score: ScoreModule;
let msg: MsgModule;

beforeAll(async () => {
  process.env["NEXT_PUBLIC_x1_world_new_SUPABASE_URL"] = "";
  process.env.SUPABASE_URL = "";
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  route = await import("@/app/api/leaderboard/route");
  runRoute = await import("@/app/api/leaderboard/run/route");
  nonces = await import("@/lib/nonce");
  score = await import("@/lib/scoreFormula");
  msg = await import("@/lib/leaderboardMessage");
});

function jsonRequest(method: "POST" | "DELETE", body: unknown, path = "http://localhost/api/leaderboard") {
  return new Request(path, {
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

  it("rejects a signed score without a run token", async () => {
    const secret = new Uint8Array(32).fill(3);
    const wallet = base58.encode(ed25519.getPublicKey(secret));
    const ts = String(Date.now());
    const nonce = nonces.nonceFor(ts);
    const stats = { t: 10, kills: 1, damage: 10, captured: 0, win: false };
    const expected = score.clampBoardScore(
      score.computeRunScore({
        ...stats,
        difficulty: "hard",
        mutatorScoreMult: score.activeMutator().scoreMult,
        timeMult: score.activeMutator().timeMult,
      }),
    );
    const message = new TextEncoder().encode(
      msg.runSignMessage({
        score: expected,
        diff: "hard",
        stats,
        startedAt: Date.now(),
        nonce,
      }),
    );
    const sig = base64.encode(ed25519.sign(message, secret));
    const submitted = await route.POST(
      jsonRequest("POST", {
        name: "signed",
        wallet,
        score: expected,
        diff: "hard",
        stats,
        ts,
        nonce,
        sig,
      }),
    );
    expect(submitted.status).toBe(401);
    await expect(submitted.json()).resolves.toMatchObject({ error: "invalid_token" });
  });

  it("accepts a wallet-owned score with a run token and permits signed removal", async () => {
    const secret = new Uint8Array(32).fill(7);
    const wallet = base58.encode(ed25519.getPublicKey(secret));

    const minted = await runRoute.POST(
      jsonRequest("POST", { difficulty: "hard" }, "http://localhost/api/leaderboard/run"),
    );
    expect(minted.status).toBe(200);
    const proof = (await minted.json()) as {
      token: string;
      startedAt: number;
      mutatorId: string;
    };

    const mutator = score.mutatorById(proof.mutatorId)!;
    const stats = { t: 2, kills: 5, damage: 400, captured: 1, win: false };
    const expected = score.clampBoardScore(
      score.computeRunScore({
        ...stats,
        difficulty: "hard",
        mutatorScoreMult: mutator.scoreMult,
        timeMult: mutator.timeMult,
      }),
    );

    const ts = String(Date.now());
    const nonce = nonces.nonceFor(ts);
    const message = new TextEncoder().encode(
      msg.runSignMessage({
        score: expected,
        diff: "hard",
        stats,
        startedAt: proof.startedAt,
        nonce,
      }),
    );
    const sig = base64.encode(ed25519.sign(message, secret));

    const submitted = await route.POST(
      jsonRequest("POST", {
        name: "signed",
        wallet,
        score: expected,
        diff: "hard",
        stats,
        runToken: proof.token,
        ts,
        nonce,
        sig,
      }),
    );
    expect(submitted.status).toBe(200);

    // inflated score must fail even with a valid token + signature over the lie
    const inflated = expected + 50_000;
    const lieTs = String(Date.now());
    const lieNonce = nonces.nonceFor(lieTs);
    const lieMsg = new TextEncoder().encode(
      msg.runSignMessage({
        score: inflated,
        diff: "hard",
        stats,
        startedAt: proof.startedAt,
        nonce: lieNonce,
      }),
    );
    const lieSig = base64.encode(ed25519.sign(lieMsg, secret));
    const forged = await route.POST(
      jsonRequest("POST", {
        name: "signed",
        wallet,
        score: inflated,
        diff: "hard",
        stats,
        runToken: proof.token,
        ts: lieTs,
        nonce: lieNonce,
        sig: lieSig,
      }),
    );
    expect(forged.status).toBe(400);
    await expect(forged.json()).resolves.toMatchObject({ error: "score_mismatch" });

    const board = (await (await route.GET(new Request("http://localhost/api/leaderboard"))).json()) as {
      board: { wallet: string; score: number }[];
    };
    expect(board.board).toContainEqual(
      expect.objectContaining({ wallet, score: expected }),
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

  it("keeps separate personal bests per difficulty for the same wallet", async () => {
    const secret = new Uint8Array(32).fill(11);
    const wallet = base58.encode(ed25519.getPublicKey(secret));

    async function postDiff(diff: "hard" | "cursed") {
      const minted = await runRoute.POST(
        jsonRequest("POST", { difficulty: diff }, "http://localhost/api/leaderboard/run"),
      );
      const proof = (await minted.json()) as {
        token: string;
        startedAt: number;
        mutatorId: string;
      };
      const mutator = score.mutatorById(proof.mutatorId)!;
      const stats = {
        t: 2,
        kills: diff === "cursed" ? 20 : 5,
        damage: diff === "cursed" ? 2000 : 400,
        captured: 1,
        win: false,
      };
      const expected = score.clampBoardScore(
        score.computeRunScore({
          ...stats,
          difficulty: diff,
          mutatorScoreMult: mutator.scoreMult,
          timeMult: mutator.timeMult,
        }),
      );
      const ts = String(Date.now());
      const nonce = nonces.nonceFor(ts);
      const message = new TextEncoder().encode(
        msg.runSignMessage({
          score: expected,
          diff,
          stats,
          startedAt: proof.startedAt,
          nonce,
        }),
      );
      const sig = base64.encode(ed25519.sign(message, secret));
      const submitted = await route.POST(
        jsonRequest("POST", {
          name: "multi",
          wallet,
          score: expected,
          diff,
          stats,
          runToken: proof.token,
          ts,
          nonce,
          sig,
        }),
      );
      expect(submitted.status).toBe(200);
      return expected;
    }

    const hardScore = await postDiff("hard");
    const cursedScore = await postDiff("cursed");
    expect(cursedScore).toBeGreaterThan(hardScore);

    const all = (await (
      await route.GET(new Request("http://localhost/api/leaderboard"))
    ).json()) as { board: { wallet: string; score: number; diff: string }[] };
    const mine = all.board.filter((e) => e.wallet === wallet);
    expect(mine).toHaveLength(2);
    expect(mine.map((e) => e.diff).sort()).toEqual(["cursed", "hard"]);

    const hardOnly = (await (
      await route.GET(new Request("http://localhost/api/leaderboard?diff=hard"))
    ).json()) as { board: { wallet: string; diff: string }[] };
    expect(hardOnly.board.filter((e) => e.wallet === wallet)).toEqual([
      expect.objectContaining({ wallet, diff: "hard" }),
    ]);

    expect(route.rankedMember(wallet, "hard")).toBe(`w:${wallet}:hard`);
  });
});
