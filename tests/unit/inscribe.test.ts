import { describe, expect, it } from "vitest";
import { BOARD_TAG, mapInscribeError, scoreMemo } from "@/lib/inscribe";
import { PublicKey } from "@solana/web3.js";

describe("inscribe helpers", () => {
  it("maps wallet and chain failures to something a player can act on", () => {
    expect(mapInscribeError({ message: "User rejected the request" })).toBe("inscription cancelled");
    expect(mapInscribeError({ message: "Attempt to debit an account but found no record of a prior credit" })).toBe(
      "need a little XNT in this wallet for the network fee",
    );
    expect(mapInscribeError({ message: "Transaction simulation failed: Blockhash not found" })).toBe(
      "took too long to approve — try again",
    );
    expect(mapInscribeError({ message: "Failed to fetch" })).toBe("couldn't reach X1 — try again");
    expect(mapInscribeError({ message: "a very long ".repeat(40) }).endsWith("…")).toBe(true);
  });

  it("keeps the memo prefix stable so an indexer can match runs", () => {
    expect(scoreMemo({ name: "wes", score: 1234, diff: "hard", captured: 12, total: 50 })).toBe(
      "x1.world ninja run — wes scored 1234 (hard) · 12/50 sites captured · x1.world",
    );
  });

  it("uses a real pubkey as the board tag so the memo tx can include it", () => {
    expect(new PublicKey(BOARD_TAG).toBase58()).toBe(BOARD_TAG);
  });
});
