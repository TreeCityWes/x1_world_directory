import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Inscribe needs a *live* session this page load — not just a persisted
 * profile.wallet. Also: connect() may return publicKey without setting
 * provider.publicKey immediately (common); session must still go live.
 */

const { connect, provider } = vi.hoisted(() => {
  const provider: {
    connect: ReturnType<typeof vi.fn>;
    publicKey?: { toString(): string } | null;
    isPhantom?: boolean;
  } = {
    connect: vi.fn(async () => {
      const key = { toString: () => "LiveKey111111111111111111111111111111111" };
      // Simulate wallets that only return the key in the response.
      return { publicKey: key };
    }),
    publicKey: null,
    isPhantom: false,
  };
  return { connect: provider.connect, provider };
});

vi.stubGlobal("window", {
  ...globalThis,
  x1wallet: { solana: provider },
});

import {
  __resetWalletSessionForTests,
  ensureWalletSession,
  getLiveWalletAddress,
  isWalletSessionLive,
  useProfile,
} from "@/lib/profile";

afterEach(() => {
  provider.publicKey = null;
  connect.mockClear();
  connect.mockImplementation(async () => {
    const key = { toString: () => "LiveKey111111111111111111111111111111111" };
    return { publicKey: key };
  });
  __resetWalletSessionForTests();
  useProfile.setState({ wallet: "", walletError: "", connecting: false });
});

describe("wallet session vs persisted profile", () => {
  it("treats a persisted wallet without a live session as not ready to sign", () => {
    useProfile.setState({ wallet: "Persisted1111111111111111111111111111111" });
    expect(isWalletSessionLive()).toBe(false);
    expect(getLiveWalletAddress()).toBe("");
  });

  it("ensureWalletSession goes live even when provider.publicKey stays unset", async () => {
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

  it("accepts Phantom as a usable injected provider", async () => {
    // Drop x1, install only Phantom on window.solana
    const phantom = {
      isPhantom: true,
      publicKey: null as { toString(): string } | null,
      connect: vi.fn(async () => {
        const key = { toString: () => "PhantomKey1111111111111111111111111111" };
        phantom.publicKey = key;
        return { publicKey: key };
      }),
    };
    (window as unknown as { x1wallet?: unknown; solana?: unknown }).x1wallet = undefined;
    (window as unknown as { solana?: unknown }).solana = phantom;
    __resetWalletSessionForTests();

    const { getWalletProvider } = await import("@/lib/profile");
    expect(getWalletProvider()?.isPhantom).toBe(true);

    useProfile.setState({ wallet: "", walletError: "" });
    await useProfile.getState().connect();
    expect(useProfile.getState().wallet).toBe("PhantomKey1111111111111111111111111111");
    expect(isWalletSessionLive()).toBe(true);

    // restore for other tests
    (window as unknown as { x1wallet?: unknown }).x1wallet = { solana: provider };
    (window as unknown as { solana?: unknown }).solana = undefined;
  });
});
