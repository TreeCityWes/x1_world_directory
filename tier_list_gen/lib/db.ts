import type { Asset, AssetPack, TierList } from "./types";

const DB_NAME = "tier_list_gen";
const DB_VERSION = 1;

type BlobRecord = { id: string; blob: Blob };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("packs")) {
        db.createObjectStore("packs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("assets")) {
        const store = db.createObjectStore("assets", { keyPath: "id" });
        store.createIndex("packId", "packId", { unique: false });
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("lists")) {
        db.createObjectStore("lists", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function loadAll(): Promise<{
  packs: AssetPack[];
  assets: Asset[];
  lists: TierList[];
  blobs: Map<string, Blob>;
}> {
  const db = await openDb();
  const tx = db.transaction(["packs", "assets", "lists", "blobs"], "readonly");
  const [packs, assets, lists, blobRows] = await Promise.all([
    reqToPromise(tx.objectStore("packs").getAll()) as Promise<AssetPack[]>,
    reqToPromise(tx.objectStore("assets").getAll()) as Promise<Asset[]>,
    reqToPromise(tx.objectStore("lists").getAll()) as Promise<TierList[]>,
    reqToPromise(tx.objectStore("blobs").getAll()) as Promise<BlobRecord[]>,
  ]);
  await txDone(tx);
  db.close();
  const blobs = new Map<string, Blob>();
  for (const row of blobRows) blobs.set(row.id, row.blob);
  return { packs, assets, lists, blobs };
}

export async function putPack(pack: AssetPack): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("packs", "readwrite");
  tx.objectStore("packs").put(pack);
  await txDone(tx);
  db.close();
}

export async function putList(list: TierList): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").put(list);
  await txDone(tx);
  db.close();
}

export async function putAssetWithBlob(asset: Asset, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["assets", "blobs"], "readwrite");
  tx.objectStore("assets").put(asset);
  tx.objectStore("blobs").put({ id: asset.id, blob });
  await txDone(tx);
  db.close();
}

export async function putAsset(asset: Asset): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("assets", "readwrite");
  tx.objectStore("assets").put(asset);
  await txDone(tx);
  db.close();
}

export async function deleteAssetRecord(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["assets", "blobs"], "readwrite");
  tx.objectStore("assets").delete(id);
  tx.objectStore("blobs").delete(id);
  await txDone(tx);
  db.close();
}

export async function deletePackCascade(packId: string, assetIds: string[], listIds: string[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["packs", "assets", "blobs", "lists"], "readwrite");
  tx.objectStore("packs").delete(packId);
  for (const id of assetIds) {
    tx.objectStore("assets").delete(id);
    tx.objectStore("blobs").delete(id);
  }
  for (const id of listIds) tx.objectStore("lists").delete(id);
  await txDone(tx);
  db.close();
}

export async function deleteListRecord(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").delete(id);
  await txDone(tx);
  db.close();
}
