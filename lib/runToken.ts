/**
 * Server-issued run tokens (SEC-01).
 *
 * A ranked submission must present a token minted at run start. The token
 * binds difficulty + weekly mutator + start time so the POST handler can:
 *   1. reject scores that never started a run on this server
 *   2. recompute score from claimed stats with the server's mutator
 *   3. compare claimed game-time against wall clock since issue
 *
 * Tokens are HMAC-signed (same secret family as leaderboard nonces) and
 * expire after the run clock plus a pause buffer — no server-side store.
 */
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import {
  RUN_SECONDS,
  activeMutator,
  mutatorById,
  type DifficultyId,
} from "@/lib/scoreFormula";

const RAW =
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

const SECRET_OK = !!RAW || process.env.NODE_ENV !== "production";

const RUN_KEY = hmac(
  sha256,
  utf8ToBytes(RAW || "x1world-dev-nonce-key"),
  utf8ToBytes("x1world/run-token/v1"),
);

/** Pause / end-screen buffer beyond the run clock before the token expires. */
const PAUSE_BUFFER_SEC = 15 * 60;

export type RunClaims = {
  v: 1;
  startedAt: number;
  difficulty: DifficultyId;
  mutatorId: string;
  exp: number;
};

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  return bytesToHex(hmac(sha256, RUN_KEY, utf8ToBytes(payload))).slice(0, 32);
}

export function issueRunToken(difficulty: DifficultyId, now = Date.now()): {
  token: string;
  claims: RunClaims;
} | null {
  if (!SECRET_OK) return null;
  if (!["normal", "hard", "cursed"].includes(difficulty)) return null;
  const mutator = activeMutator(new Date(now));
  const ttlSec = RUN_SECONDS * mutator.timeMult + PAUSE_BUFFER_SEC;
  const claims: RunClaims = {
    v: 1,
    startedAt: now,
    difficulty,
    mutatorId: mutator.id,
    exp: now + ttlSec * 1000,
  };
  const body = b64url(utf8ToBytes(JSON.stringify(claims)));
  return { token: `${body}.${sign(body)}`, claims };
}

export function verifyRunToken(
  token: string,
  now = Date.now(),
): { claims: RunClaims; error?: undefined } | { claims?: undefined; error: string } {
  if (!SECRET_OK) return { error: "misconfigured" };
  const [body, sig] = String(token ?? "").split(".");
  if (!body || !sig || sign(body) !== sig) return { error: "invalid_token" };
  const raw = b64urlDecode(body);
  if (!raw) return { error: "invalid_token" };
  let claims: RunClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(raw)) as RunClaims;
  } catch {
    return { error: "invalid_token" };
  }
  if (claims.v !== 1) return { error: "invalid_token" };
  if (!["normal", "hard", "cursed"].includes(claims.difficulty)) return { error: "invalid_token" };
  if (!mutatorById(claims.mutatorId)) return { error: "invalid_mutator" };
  if (!Number.isFinite(claims.startedAt) || !Number.isFinite(claims.exp)) return { error: "invalid_token" };
  if (now > claims.exp) return { error: "token_expired" };
  if (claims.startedAt > now + 5_000) return { error: "token_future" };
  return { claims };
}
