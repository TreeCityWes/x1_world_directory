"use client";

import { getWalletProvider } from "@/lib/profile";

/**
 * Inscribe a run on X1 itself: a Memo-program transaction on X1 mainnet
 * carrying the score, signed and paid (dust) by the player's wallet. The
 * result is a permanent, timestamped, on-chain record — viewable on the
 * explorer forever. web3.js is imported lazily so the game bundle never
 * carries it.
 */

const X1_RPC = "https://rpc.mainnet.x1.xyz";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const explorerTx = (sig: string) => `https://explorer.x1.xyz/tx/${sig}`;

type TxProvider = {
  publicKey?: { toString(): string };
  signAndSendTransaction?: (tx: unknown) => Promise<{ signature?: string } | string>;
  signTransaction?: (tx: unknown) => Promise<{ serialize(): Uint8Array }>;
};

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
    const memo = `x1.world ninja run — ${o.name || "anon ninja"} scored ${o.score} (${o.diff}) · ${o.captured}/${o.total} sites captured · x1.world`;
    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        programId: new PublicKey(MEMO_PROGRAM),
        data: Buffer.from(memo, "utf8"),
      }),
    );
    tx.feePayer = payer;
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;

    if (p.signAndSendTransaction) {
      const r = await p.signAndSendTransaction(tx);
      const sig = typeof r === "string" ? r : r?.signature;
      return sig ? { sig } : { error: "wallet did not return a signature" };
    }
    if (p.signTransaction) {
      const signed = await p.signTransaction(tx);
      const sig = await conn.sendRawTransaction(Buffer.from(signed.serialize()));
      return { sig };
    }
    return { error: "this wallet can't sign transactions" };
  } catch {
    return { error: "inscription cancelled" };
  }
}
