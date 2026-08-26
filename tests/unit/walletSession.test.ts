import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Inscribe needs a *live* injected session (publicKey), not just a persisted
 * profile.wallet string — regression for the end-screen "inscribe with no
 * connect" dead end.
 */

const { connect, provider } = vi.hoisted(() => {
  const provider: {
    connect: ReturnType<typeof vi.fn>;
    publicKey?: { toString(): string };
    isPhantom?: boolean;
  } = {
    connect: vi.fn(async () => {
      const key = { toString: () => "LiveKey111111111111111111111111111111111" };
      provider.publicKey = key;
      return { publicKey: key };
    }),
    publicKey: undefined,
    isPhantom: false,
  };
  return { connect: provider.connect, provider };
});

vi.stubGlobal("window", {
  ...globalThis,
  x1wallet: { solana: provider },
});

import {
  ensureWalletSession,
  getLiveWalletAddress,
  isWalletSessionLive,
  useProfile,
} from "@/lib/profile";

afterEach(() => {
  provider.publicKey = undefined;
  connect.mockClear();
  useProfile.setState({ wallet: "", walletError: "", connecting: false });
});

describe("wallet session vs persisted profile", () => {
  it("treats a persisted wallet without a live publicKey as not ready to sign", () => {
    useProfile.setState({ wallet: "Persisted1111111111111111111111111111111" });
    expect(isWalletSessionLive()).toBe(false);
    expect(getLiveWalletAddress()).toBe("");
  });

  it("ensureWalletSession connects and syncs the profile address", async () => {
    useProfile.setState({ wallet: "Persisted1111111111111111111111111111111" });
    const addr = await ensureWalletSession();
    expect(connect).toHaveBeenCalledOnce();
    expect(addr).toBe("LiveKey111111111111111111111111111111111");
    expect(useProfile.getState().wallet).toBe(addr);
    expect(isWalletSessionLive()).toBe(true);
  });

  it("skips connect when the provider already has a live publicKey", async () => {
    provider.publicKey = { toString: () => "AlreadyLive111111111111111111111111111" };
    const addr = await ensureWalletSession();
    expect(connect).not.toHaveBeenCalled();
    expect(addr).toBe("AlreadyLive111111111111111111111111111");
  });
});
