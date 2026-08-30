"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Ninja profile — display name + connected wallet.
 *
 * Prefer X1 Wallet / Backpack when present. Phantom (and other Solana
 * injectors) are accepted as a fallback: we only need `signTransaction`, then
 * we broadcast the signed bytes ourselves to the X1 RPC (see `lib/inscribe.ts`).
 * Blocking Phantom made connect impossible for most players.
 */

type InjectedProvider = {
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString(): string } } | void>;
  disconnect?: () => Promise<void>;
  publicKey?: { toString(): string } | null;
  isPhantom?: boolean;
  isBackpack?: boolean;
  isX1?: boolean;
  isX1Wallet?: boolean;
  signMessage?: (
    msg: Uint8Array,
    encoding?: string,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  signAndSendTransaction?: (tx: unknown, opts?: unknown) => Promise<unknown>;
  on?: (
    event: "accountChanged" | "disconnect" | "connect",
    handler: (key?: { toString(): string } | null) => void,
  ) => void;
  off?: (
    event: "accountChanged" | "disconnect" | "connect",
    handler: (key?: { toString(): string } | null) => void,
  ) => void;
};

/** Address from the last successful `connect()` in this page load. */
let liveSessionAddress = "";

function setLiveSession(addr: string) {
  liveSessionAddress = addr;
}

function clearLiveSession() {
  liveSessionAddress = "";
}

function isUsableProvider(p: unknown): p is InjectedProvider {
  return Boolean(p && typeof (p as InjectedProvider).connect === "function");
}

function providerRank(p: InjectedProvider): number {
  // Higher = preferred. Native X1 first, then Backpack, then anything else
  // (incl. Phantom) — we relay signed txs to X1 ourselves.
  if (p.isX1 || p.isX1Wallet) return 100;
  if (p.isBackpack) return 80;
  if (p.isPhantom) return 10;
  return 40;
}

function collectInjectedProviders(): InjectedProvider[] {
  if (typeof window === "undefined") return [];
  const w = window as unknown as Record<string, unknown>;
  const found: InjectedProvider[] = [];
  const push = (raw: unknown) => {
    if (!isUsableProvider(raw)) return;
    if (!found.includes(raw)) found.push(raw);
  };

  const asBag = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const o = raw as Record<string, unknown>;
    push(o.solana);
    push(raw);
    // Multi-wallet injectors (Phantom + others) expose `.providers`
    const list = o.providers;
    if (Array.isArray(list)) for (const item of list) push(item);
  };

  asBag(w.x1wallet);
  asBag(w.x1);
  asBag(w.X1Wallet);
  asBag(w.x1Wallet);
  asBag(w.backpack);
  asBag((w.phantom as { solana?: unknown } | undefined)?.solana);
  asBag(w.phantom);
  asBag(w.solana);
  asBag((w as { solana?: { providers?: unknown[] } }).solana);

  return found;
}

function getProvider(): InjectedProvider | null {
  const list = collectInjectedProviders();
  if (list.length === 0) return null;
  list.sort((a, b) => providerRank(b) - providerRank(a));
  return list[0] ?? null;
}

/** The raw injected provider — for transaction flows (inscribe). */
export function getWalletProvider() {
  return getProvider();
}

/** Live session pubkey (provider or this-page connect result). */
export function getLiveWalletAddress(): string {
  const p = getProvider();
  const fromProvider = p?.publicKey?.toString() ?? "";
  return fromProvider || liveSessionAddress;
}

/**
 * True when we can sign in this page load. A persisted localStorage wallet
 * alone is NOT enough.
 */
export function isWalletSessionLive(): boolean {
  return Boolean(getLiveWalletAddress());
}

/**
 * Ensure the injected wallet is connected for signing. Syncs the persisted
 * profile address on success. Returns the live address, or "" on failure.
 */
export async function ensureWalletSession(): Promise<string> {
  const live = getLiveWalletAddress();
  if (live) {
    useProfile.setState({ wallet: live, walletError: "" });
    return live;
  }
  await useProfile.getState().connect();
  return getLiveWalletAddress();
}

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

function extractConnectKey(
  res: { publicKey?: { toString(): string } } | void,
  p: InjectedProvider,
): string {
  const fromRes =
    res && typeof res === "object" && res.publicKey ? res.publicKey.toString() : "";
  const fromProvider = p.publicKey?.toString() ?? "";
  return fromRes || fromProvider;
}

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
          set({
            walletError:
              "no wallet detected — install X1 Wallet (wallet.x1.xyz), Backpack, or Phantom, then refresh",
          });
          return;
        }
        set({ connecting: true, walletError: "" });
        try {
          // Explicit user gesture — never onlyIfTrusted (that silently fails
          // for first-time / untrusted origins).
          const res = await p.connect();
          const key = extractConnectKey(res, p);
          if (!key) {
            set({ walletError: "wallet did not return an address — unlock it and try again" });
            clearLiveSession();
            return;
          }
          // Some wallets only return the key in the connect() response and
          // leave `provider.publicKey` unset until a tick later — keep our
          // own session so the UI can advance to inscribe.
          setLiveSession(key);
          if (!p.publicKey && res && typeof res === "object" && res.publicKey) {
            try {
              (p as { publicKey?: { toString(): string } }).publicKey = res.publicKey;
            } catch {
              // readonly — session string is enough for UI; inscribe re-reads provider
            }
          }
          set({ wallet: key, walletError: "" });
        } catch (err) {
          clearLiveSession();
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "";
          const lower = msg.toLowerCase();
          if (/\b(user reject|rejected|denied|cancelled|canceled|4001)\b/.test(lower)) {
            set({ walletError: "connection cancelled" });
          } else if (msg) {
            set({ walletError: msg.slice(0, 120) });
          } else {
            set({ walletError: "connection cancelled" });
          }
        } finally {
          set({ connecting: false });
        }
      },
      disconnect: () => {
        void getProvider()?.disconnect?.();
        clearLiveSession();
        set({ wallet: "", walletError: "" });
      },
    }),
    {
      name: "x1world_profile",
      partialize: (s) => ({ name: s.name, wallet: s.wallet, deviceId: s.deviceId }),
    },
  ),
);

/** Keep the displayed account aligned with wallet-side changes. */
export function watchWalletProvider() {
  const p = getProvider();
  if (!p?.on) return () => undefined;
  const accountChanged = (key?: { toString(): string } | null) => {
    const addr = key?.toString() ?? "";
    if (addr) setLiveSession(addr);
    else clearLiveSession();
    useProfile.setState({ wallet: addr, walletError: "" });
  };
  const disconnected = () => {
    clearLiveSession();
    useProfile.setState({ wallet: "", walletError: "" });
  };
  p.on("accountChanged", accountChanged);
  p.on("disconnect", disconnected);
  if (p.publicKey) accountChanged(p.publicKey);
  return () => {
    p.off?.("accountChanged", accountChanged);
    p.off?.("disconnect", disconnected);
  };
}

/** Lazy device ID — minted on first use, persisted with the profile. */
export function getDeviceId(): string {
  const s = useProfile.getState();
  if (s.deviceId) return s.deviceId;
  const id = crypto.randomUUID();
  useProfile.setState({ deviceId: id });
  return id;
}

export const shortAddr = (a: string) => (a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

/** Test helper — reset module session between unit tests. */
export function __resetWalletSessionForTests() {
  clearLiveSession();
}
