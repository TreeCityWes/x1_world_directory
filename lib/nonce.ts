import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/** Stateless signing nonce: HMAC(ts) with a server secret, valid 5 minutes. */
const RAW =
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

// Fail closed in production: without a real secret, no nonce ever validates,
// so scores stay unverified and wallet DELETE is refused — never sign
// challenges with a public constant on a live deployment (SEC-03).
const SECRET_OK = !!RAW || process.env.NODE_ENV !== "production";

// Derive a DISTINCT key so the raw service-role key is never used directly as
// the HMAC secret (SEC-05). Dev falls back to a non-public derived key.
const NONCE_KEY = hmac(
  sha256,
  utf8ToBytes(RAW || "x1world-dev-nonce-key"),
  utf8ToBytes("x1world/nonce/v1"),
);

export function nonceFor(ts: string) {
  return bytesToHex(hmac(sha256, NONCE_KEY, utf8ToBytes(`x1world-nonce:${ts}`))).slice(0, 32);
}

export function nonceValid(ts: string, nonce: string) {
  if (!SECRET_OK) return false; // misconfigured production → verification off
  const age = Date.now() - Number(ts);
  return Number.isFinite(age) && age >= 0 && age < 5 * 60_000 && nonceFor(ts) === nonce;
}
