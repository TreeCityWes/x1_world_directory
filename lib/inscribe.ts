"use client";

import { getWalletProvider } from "@/lib/profile";

/**
 * Inscribe a run on X1 itself: a Memo-program transaction on X1 mainnet
 * carrying the score, signed by the player's wallet. We broadcast via the
 * X1 RPC (not the wallet's default cluster) so a wallet left on Solana
 * cannot silently drop or mis-route the record.
 *
 * A dedicated leaderboard program is the right next step (PDA per wallet,
 * best-score-only writes, getProgramAccounts). Memo is the live path because
 * it needs no deployer key; the board tag below makes these txs indexable
 * the moment that program (or an indexer) ships.
 */

export const X1_RPC = "https://rpc.mainnet.x1.xyz";
export const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
/** Well-known readonly account included in every score memo so we can
 *  `getSignaturesForAddress` this key later — no custom program required. */
export const BOARD_TAG = "X1Wor1dNinjaBoard11111111111111111111111111";
export const explorerTx = (sig: string) => `https://explorer.x1.xyz/tx/${sig}`;

const MIN_FEE_LAMPORTS = 10_000;

type TxProvider = {
  publicKey?: { toString(): string };
  signAndSendTransaction?: (tx: unknown, opts?: unknown) => Promise<{ signature?: string } | string>;
  signTransaction?: (tx: unknown) => Promise<{ serialize(): Uint8Array } | Uint8Array>;
};

export function mapInscribeError(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");
  const m = raw.toLowerCase();
  if (!m || m === "undefined" || m === "null") return "inscription failed — try again";
  if (/\b(user reject|rejected|denied|cancelled|canceled|declined)\b/.test(m)) {
    return "inscription cancelled";
  }
  if (/\b(insufficient|0x1\b|no funds|not enough)\b/.test(m) || /Attempt to debit an account/.test(raw)) {
    return "need a little XNT in this wallet for the network fee";
  }
  if (/\b(blockhash|expired|lastValidBlockHeight|block height)\b/.test(m)) {
    return "took too long to approve — try again";
  }
  if (/\b(network|fetch|cors|429|timeout|timed out|failed to fetch|503|502)\b/.test(m)) {
    return "couldn't reach X1 — try again";
  }
  if (/\b(wrong network|cluster|mainnet-beta|solana)\b/.test(m)) {
    return "switch your wallet to X1 mainnet and try again";
  }
  return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
}

export function scoreMemo(o: {
  name: string;
  score: number;
  diff: string;
  captured: number;
  total: number;
}) {
  return `x1.world ninja run — ${o.name || "anon ninja"} scored ${o.score} (${o.diff}) · ${o.captured}/${o.total} sites captured · x1.world`;
}

function extractSig(r: unknown): string | undefined {
  if (typeof r === "string" && r.length > 40) return r;
  if (r && typeof r === "object" && "signature" in r) {
    const s = (r as { signature?: unknown }).signature;
    if (typeof s === "string" && s.length > 40) return s;
  }
  return undefined;
}

function toBytes(signed: unknown): Uint8Array {
  if (signed instanceof Uint8Array) return signed;
  if (signed && typeof (signed as { serialize?: () => unknown }).serialize === "function") {
    const s = (signed as { serialize: () => unknown }).serialize();
    if (s instanceof Uint8Array) return s;
    if (Array.isArray(s)) return Uint8Array.from(s);
    if (s && typeof s === "object" && "length" in s) return Uint8Array.from(s as ArrayLike<number>);
  }
  throw new Error("wallet did not return a signed transaction");
}

async function relayRawTx(rawB64: string): Promise<string> {
  const res = await fetch("/api/inscribe/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx: rawB64 }),
  });
  const j = (await res.json()) as { sig?: string; error?: string };
  if (!res.ok || !j.sig) throw new Error(j.error || "relay failed");
  return j.sig;
}

export async function inscribeRun(o: {
  name: string;
  score: number;
  diff: string;
  captured: number;
  total: number;
}): Promise<{ sig?: string; error?: string }> {
  const p = getWalletProvider() as TxProvider | null;
  if (!p?.publicKey) return { error: "connect your wallet to inscribe" };
  try {
    const { Connection, PublicKey, Transaction, TransactionInstruction } = await import(
      "@solana/web3.js"
    );
    const { Buffer } = await import("buffer");
    const conn = new Connection(X1_RPC, "confirmed");
    const payer = new PublicKey(p.publicKey.toString());

    try {
      const bal = await conn.getBalance(payer, "confirmed");
      if (bal < MIN_FEE_LAMPORTS) {
        return { error: "need a little XNT in this wallet for the network fee" };
      }
    } catch {
      // RPC hiccup — still attempt the sign so a flaky balance check
      // cannot block an otherwise valid inscription.
    }

    const memo = scoreMemo(o);
    const ix = new TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: new PublicKey(BOARD_TAG), isSigner: false, isWritable: false },
      ],
      programId: new PublicKey(MEMO_PROGRAM),
      data: Buffer.from(memo, "utf8"),
    });

    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: payer,
      blockhash,
      lastValidBlockHeight,
    }).add(ix);

    // Prefer sign-only: we submit on X1 ourselves. signAndSendTransaction
    // uses the wallet's selected cluster (often Solana), which is why so
    // many inscriptions never show up on explorer.x1.xyz.
    if (p.signTransaction) {
      const signed = await p.signTransaction(tx);
      const raw = toBytes(signed);
      const rawB64 = Buffer.from(raw).toString("base64");
      let sig: string;
      try {
        sig = await conn.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed" });
      } catch (sendErr) {
        try {
          sig = await relayRawTx(rawB64);
        } catch {
          throw sendErr;
        }
      }
      try {
        await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      } catch {
        // landed or still confirming — explorer link is still useful
      }
      return { sig };
    }

    if (p.signAndSendTransaction) {
      let r: unknown;
      try {
        r = await p.signAndSendTransaction(tx);
      } catch {
        r = await p.signAndSendTransaction({ transaction: tx });
      }
      const sig = extractSig(r);
      if (!sig) return { error: "wallet did not return a signature" };
      try {
        await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      } catch {
        return {
          error: "wallet may have sent this off X1 — switch to X1 mainnet and try again",
        };
      }
      return { sig };
    }

    return { error: "this wallet can't sign transactions" };
  } catch (err) {
    return { error: mapInscribeError(err) };
  }
}
