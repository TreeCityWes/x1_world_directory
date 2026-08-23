"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  deleteAssetRecord,
  deleteListRecord,
  deletePackCascade,
  loadAll,
  putAsset,
  putAssetWithBlob,
  putList,
  putPack,
} from "./db";
import { ACCEPTED_IMAGE_TYPES, MAX_ASSET_BYTES, makeDefaultTiers } from "./defaults";
import { nid } from "./id";
import type { Asset, AssetPack, PackExport, Placement, TierList } from "./types";

type WorkspaceValue = {
  ready: boolean;
  error: string | null;
  packs: AssetPack[];
  assets: Asset[];
  lists: TierList[];
  urlFor: (assetId: string) => string | undefined;
  assetsInPack: (packId: string) => Asset[];
  listsForPack: (packId: string) => TierList[];
  createPack: (name: string, description?: string) => Promise<AssetPack>;
  updatePack: (id: string, patch: Partial<Pick<AssetPack, "name" | "description">>) => Promise<void>;
  deletePack: (id: string) => Promise<void>;
  addFilesToPack: (packId: string, files: File[]) => Promise<{ added: number; skipped: number }>;
  renameAsset: (id: string, name: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importPack: (payload: PackExport) => Promise<AssetPack>;
  exportPack: (packId: string) => Promise<PackExport>;
  createList: (name: string, packId: string) => Promise<TierList>;
  updateList: (id: string, patch: Partial<Pick<TierList, "name" | "tiers" | "placements">>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  placeAsset: (listId: string, assetId: string, placement: Placement) => Promise<void>;
  syncListAssets: (list: TierList) => TierList;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

function fileStem(name: string): string {
  return name.replace(/\.[^/.]+$/, "").trim() || "Untitled";
}

function revokeAll(urls: Map<string, string>) {
  for (const url of urls.values()) URL.revokeObjectURL(url);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<AssetPack[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [lists, setLists] = useState<TierList[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const urlsRef = useRef(urls);

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then((data) => {
        if (cancelled) return;
        const nextUrls = new Map<string, string>();
        for (const [id, blob] of data.blobs) {
          nextUrls.set(id, URL.createObjectURL(blob));
        }
        setPacks(data.packs.sort((a, b) => b.updatedAt - a.updatedAt));
        setAssets(data.assets);
        setLists(data.lists.sort((a, b) => b.updatedAt - a.updatedAt));
        setUrls(nextUrls);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not open local storage.");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  useEffect(() => {
    return () => revokeAll(urlsRef.current);
  }, []);

  const urlFor = useCallback((assetId: string) => urls.get(assetId), [urls]);

  const assetsInPack = useCallback(
    (packId: string) =>
      assets
        .filter((asset) => asset.packId === packId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [assets],
  );

  const listsForPack = useCallback(
    (packId: string) => lists.filter((list) => list.packId === packId),
    [lists],
  );

  const touchPack = useCallback(async (id: string) => {
    const now = Date.now();
    let next: AssetPack | undefined;
    setPacks((prev) =>
      prev
        .map((pack) => {
          if (pack.id !== id) return pack;
          next = { ...pack, updatedAt: now };
          return next;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );
    if (next) await putPack(next);
  }, []);

  const createPack = useCallback(async (name: string, description = "") => {
    const now = Date.now();
    const pack: AssetPack = {
      id: nid("pack"),
      name: name.trim() || "Untitled library",
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await putPack(pack);
    setPacks((prev) => [pack, ...prev]);
    return pack;
  }, []);

  const updatePack = useCallback(
    async (id: string, patch: Partial<Pick<AssetPack, "name" | "description">>) => {
      let next: AssetPack | undefined;
      setPacks((prev) =>
        prev
          .map((pack) => {
            if (pack.id !== id) return pack;
            next = { ...pack, ...patch, updatedAt: Date.now() };
            return next;
          })
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
      if (next) await putPack(next);
    },
    [],
  );

  const deletePack = useCallback(
    async (id: string) => {
      const assetIds = assets.filter((asset) => asset.packId === id).map((asset) => asset.id);
      const listIds = lists.filter((list) => list.packId === id).map((list) => list.id);
      await deletePackCascade(id, assetIds, listIds);
      setPacks((prev) => prev.filter((pack) => pack.id !== id));
      setAssets((prev) => prev.filter((asset) => asset.packId !== id));
      setLists((prev) => prev.filter((list) => list.packId !== id));
      setUrls((prev) => {
        const next = new Map(prev);
        for (const assetId of assetIds) {
          const url = next.get(assetId);
          if (url) URL.revokeObjectURL(url);
          next.delete(assetId);
        }
        return next;
      });
    },
    [assets, lists],
  );

  const addFilesToPack = useCallback(
    async (packId: string, files: File[]) => {
      let added = 0;
      let skipped = 0;
      const created: Asset[] = [];
      const newUrls: Array<[string, string]> = [];

      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_ASSET_BYTES) {
          skipped += 1;
          continue;
        }
        const asset: Asset = {
          id: nid("asset"),
          packId,
          name: fileStem(file.name),
          mimeType: file.type,
          createdAt: Date.now(),
        };
        await putAssetWithBlob(asset, file);
        created.push(asset);
        newUrls.push([asset.id, URL.createObjectURL(file)]);
        added += 1;
      }

      if (created.length === 0) return { added, skipped };

      setAssets((prev) => [...prev, ...created]);
      setUrls((prev) => {
        const next = new Map(prev);
        for (const [id, url] of newUrls) next.set(id, url);
        return next;
      });
      setLists((prev) =>
        prev.map((list) => {
          if (list.packId !== packId) return list;
          const placements = { ...list.placements };
          for (const asset of created) placements[asset.id] = "unranked";
          const next = { ...list, placements, updatedAt: Date.now() };
          void putList(next);
          return next;
        }),
      );
      await touchPack(packId);
      return { added, skipped };
    },
    [touchPack],
  );

  const renameAsset = useCallback(async (id: string, name: string) => {
    let next: Asset | undefined;
    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.id !== id) return asset;
        next = { ...asset, name: name.trim() || asset.name };
        return next;
      }),
    );
    if (next) {
      await putAsset(next);
      await touchPack(next.packId);
    }
  }, [touchPack]);

  const deleteAsset = useCallback(async (id: string) => {
    const asset = assets.find((item) => item.id === id);
    await deleteAssetRecord(id);
    setAssets((prev) => prev.filter((item) => item.id !== id));
    setLists((prev) =>
      prev.map((list) => {
        if (!(id in list.placements)) return list;
        const placements = { ...list.placements };
        delete placements[id];
        const next = { ...list, placements, updatedAt: Date.now() };
        void putList(next);
        return next;
      }),
    );
    setUrls((prev) => {
      const next = new Map(prev);
      const url = next.get(id);
      if (url) URL.revokeObjectURL(url);
      next.delete(id);
      return next;
    });
    if (asset) await touchPack(asset.packId);
  }, [assets, touchPack]);

  const exportPack = useCallback(
    async (packId: string) => {
      const pack = packs.find((item) => item.id === packId);
      if (!pack) throw new Error("Library not found.");
      const packAssets = assetsInPack(packId);
      const exported: PackExport["assets"] = [];
      for (const asset of packAssets) {
        const url = urls.get(asset.id);
        if (!url) continue;
        const res = await fetch(url);
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        exported.push({ name: asset.name, mimeType: asset.mimeType, dataUrl });
      }
      return {
        version: 1 as const,
        kind: "asset-pack" as const,
        pack: { name: pack.name, description: pack.description },
        assets: exported,
      };
    },
    [assetsInPack, packs, urls],
  );

  const importPack = useCallback(async (payload: PackExport) => {
    if (payload.kind !== "asset-pack" || payload.version !== 1) {
      throw new Error("Not a valid library file.");
    }
    const pack = await createPack(payload.pack.name, payload.pack.description);
    const files = payload.assets
      .map((item) => dataUrlToFile(item.dataUrl, item.name, item.mimeType))
      .filter((file): file is File => file !== null);
    await addFilesToPack(pack.id, files);
    return pack;
  }, [addFilesToPack, createPack]);

  const createList = useCallback(
    async (name: string, packId: string) => {
      const now = Date.now();
      const placements: Record<string, Placement> = {};
      for (const asset of assets.filter((item) => item.packId === packId)) {
        placements[asset.id] = "unranked";
      }
      const list: TierList = {
        id: nid("list"),
        name: name.trim() || "Untitled tier list",
        packId,
        tiers: makeDefaultTiers(),
        placements,
        createdAt: now,
        updatedAt: now,
      };
      await putList(list);
      setLists((prev) => [list, ...prev]);
      return list;
    },
    [assets],
  );

  const updateList = useCallback(
    async (id: string, patch: Partial<Pick<TierList, "name" | "tiers" | "placements">>) => {
      let next: TierList | undefined;
      setLists((prev) =>
        prev
          .map((list) => {
            if (list.id !== id) return list;
            next = { ...list, ...patch, updatedAt: Date.now() };
            return next;
          })
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
      if (next) await putList(next);
    },
    [],
  );

  const deleteList = useCallback(async (id: string) => {
    await deleteListRecord(id);
    setLists((prev) => prev.filter((list) => list.id !== id));
  }, []);

  const placeAsset = useCallback(
    async (listId: string, assetId: string, placement: Placement) => {
      let next: TierList | undefined;
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          next = {
            ...list,
            placements: { ...list.placements, [assetId]: placement },
            updatedAt: Date.now(),
          };
          return next;
        }),
      );
      if (next) await putList(next);
    },
    [],
  );

  const syncListAssets = useCallback(
    (list: TierList) => {
      const packAssetIds = new Set(
        assets.filter((asset) => asset.packId === list.packId).map((asset) => asset.id),
      );
      const placements = { ...list.placements };
      let changed = false;
      for (const id of packAssetIds) {
        if (!(id in placements)) {
          placements[id] = "unranked";
          changed = true;
        }
      }
      for (const id of Object.keys(placements)) {
        if (!packAssetIds.has(id)) {
          delete placements[id];
          changed = true;
        }
      }
      if (!changed) return list;
      const next = { ...list, placements, updatedAt: Date.now() };
      void putList(next);
      setLists((prev) => prev.map((item) => (item.id === list.id ? next : item)));
      return next;
    },
    [assets],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      ready,
      error,
      packs,
      assets,
      lists,
      urlFor,
      assetsInPack,
      listsForPack,
      createPack,
      updatePack,
      deletePack,
      addFilesToPack,
      renameAsset,
      deleteAsset,
      importPack,
      exportPack,
      createList,
      updateList,
      deleteList,
      placeAsset,
      syncListAssets,
    }),
    [
      ready,
      error,
      packs,
      assets,
      lists,
      urlFor,
      assetsInPack,
      listsForPack,
      createPack,
      updatePack,
      deletePack,
      addFilesToPack,
      renameAsset,
      deleteAsset,
      importPack,
      exportPack,
      createList,
      updateList,
      deleteList,
      placeAsset,
      syncListAssets,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToFile(dataUrl: string, name: string, mimeType: string): File | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mimeType || match[1] });
}
