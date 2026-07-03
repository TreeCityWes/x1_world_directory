import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

/** Stateless signing nonce: HMAC(ts) with a server secret, valid 5 minutes. */
const SECRET =
  process.env["x1_world_new_SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "dev-secret";

export function nonceFor(ts: string) {
  return bytesToHex(hmac(sha256, SECRET, `x1world-nonce:${ts}`)).slice(0, 32);
}

export function nonceValid(ts: string, nonce: string) {
  const age = Date.now() - Number(ts);
  return Number.isFinite(age) && age >= 0 && age < 5 * 60_000 && nonceFor(ts) === nonce;
}
