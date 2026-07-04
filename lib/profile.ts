"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Ninja profile — display name + connected wallet. X1 Wallet (wallet.x1.xyz)
 * is the primary target, Backpack also works; Phantom is NOT supported on X1
 * and is explicitly skipped. Standard injected connect/publicKey surface — no
 * wallet-adapter dependency needed.
 */

type InjectedProvider = {
  connect: () => Promise<{ publicKey?: { toString(): string } } | void>;
  disconnect?: () => Promise<void>;
  publicKey?: { toString(): string };
  isPhantom?: boolean;
  signMessage?: (
    msg: Uint8Array,
    encoding?: string,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
};

/** Sign an arbitrary message with the connected wallet → base64, or null. */
export async function signWithWallet(message: string): Promise<string | null> {
  const p = getProvider();
  if (!p?.signMessage) return null;
  try {
    const res = await p.signMessage(new TextEncoder().encode(message), "utf8");
    const sig = res instanceof Uint8Array ? res : res?.signature;
    if (!sig) return null;
    let bin = "";
    for (const byte of sig) bin += String.fromCharCode(byte);
    return btoa(bin);
  } catch {
    return null; // user declined — submit unverified
  }
}

function getProvider(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<
    string,
    ({ solana?: InjectedProvider } & InjectedProvider) | undefined
  >;
  const candidates = [
    // X1 Wallet first — different builds have injected under different names
    w.x1wallet?.solana ?? (w.x1wallet as InjectedProvider | undefined),
    w.x1?.solana ?? (w.x1 as InjectedProvider | undefined),
    w.X1Wallet as InjectedProvider | undefined,
    // Backpack second
    w.backpack?.solana,
    // generic injection last — but never Phantom (X1 doesn't support it)
    w.solana as InjectedProvider | undefined,
  ];
  for (const p of candidates) {
    if (p && typeof p.connect === "function" && !p.isPhantom) return p;
  }
  return null;
}

type ProfileState = {
  name: string;
  wallet: string; // base58 address, "" = not connected
  deviceId: string; // stable anonymous identity for guests (per-browser)
  connecting: boolean;
  walletError: string;
  setName: (n: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      name: "",
      wallet: "",
      deviceId: "",
      connecting: false,
      walletError: "",
      setName: (n) => set({ name: n.slice(0, 20) }),
      connect: async () => {
        const p = getProvider();
        if (!p) {
          set({ walletError: "no supported wallet — get X1 Wallet at wallet.x1.xyz (or Backpack)" });
          return;
        }
        set({ connecting: true, walletError: "" });
        try {
          const res = await p.connect();
          const key = (res && "publicKey" in res && res.publicKey?.toString()) || p.publicKey?.toString() || "";
          if (key) set({ wallet: key });
          else set({ walletError: "wallet did not return an address" });
        } catch {
          set({ walletError: "connection cancelled" });
        } finally {
          set({ connecting: false });
        }
      },
      disconnect: () => {
        void getProvider()?.disconnect?.();
        set({ wallet: "" });
      },
    }),
    {
      name: "x1world_profile",
      partialize: (s) => ({ name: s.name, wallet: s.wallet, deviceId: s.deviceId }),
    },
  ),
);

/** Lazy device ID — minted on first use, persisted with the profile. */
export function getDeviceId(): string {
  const s = useProfile.getState();
  if (s.deviceId) return s.deviceId;
  const id = crypto.randomUUID();
  useProfile.setState({ deviceId: id });
  return id;
}

export const shortAddr = (a: string) => (a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
