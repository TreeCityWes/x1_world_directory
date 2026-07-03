"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Ninja profile — display name + connected SVM wallet. Wallet connect uses
 * whatever standard injected provider is present (X1 Wallet, Backpack,
 * Phantom, Solflare all expose the same connect/publicKey surface). No heavy
 * wallet-adapter dependency needed for "sign in with your address".
 */

type InjectedProvider = {
  connect: () => Promise<{ publicKey?: { toString(): string } } | void>;
  disconnect?: () => Promise<void>;
  publicKey?: { toString(): string };
};

function getProvider(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, { solana?: InjectedProvider } & InjectedProvider>;
  return w.x1wallet?.solana ?? w.backpack?.solana ?? w.phantom?.solana ?? (w.solana as InjectedProvider | undefined) ?? null;
}

type ProfileState = {
  name: string;
  wallet: string; // base58 address, "" = not connected
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
      connecting: false,
      walletError: "",
      setName: (n) => set({ name: n.slice(0, 20) }),
      connect: async () => {
        const p = getProvider();
        if (!p) {
          set({ walletError: "no wallet found — install X1 Wallet, Backpack or Phantom" });
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
    { name: "x1world_profile", partialize: (s) => ({ name: s.name, wallet: s.wallet }) },
  ),
);

export const shortAddr = (a: string) => (a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
