"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { downloadJson, slug } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { AssetTile } from "./AssetTile";
import { UploadDropzone } from "./UploadDropzone";

export function PackEditor({ packId }: { packId: string }) {
  const router = useRouter();
  const {
    ready,
    packs,
    assetsInPack,
    listsForPack,
    urlFor,
    updatePack,
    deletePack,
    addFilesToPack,
    renameAsset,
    deleteAsset,
    exportPack,
  } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const pack = packs.find((item) => item.id === packId);
  const assets = assetsInPack(packId);
  const lists = listsForPack(packId);

  if (!ready) return <p className="text-[var(--muted)]">Loading library…</p>;
  if (!pack) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-4xl">Library not found</h1>
        <Link href="/" className="btn-ghost">
          Back home
        </Link>
      </div>
    );
  }

  const library = pack;

  async function onFiles(files: File[]) {
    setBusy(true);
    const result = await addFilesToPack(packId, files);
    setBusy(false);
    setNote(
      result.skipped
        ? `Added ${result.added}, skipped ${result.skipped} (type or size).`
        : `Saved ${result.added} asset${result.added === 1 ? "" : "s"}.`,
    );
  }

  async function onExport() {
    const payload = await exportPack(packId);
    downloadJson(`${slug(library.name)}.library.json`, payload);
  }

  async function onDelete() {
    const extra =
      lists.length > 0
        ? ` This also deletes ${lists.length} tier list${lists.length === 1 ? "" : "s"} that use it.`
        : "";
    if (!window.confirm(`Delete “${library.name}”?${extra}`)) return;
    await deletePack(packId);
    router.push("/");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--brass)] uppercase">
            Asset library
          </p>
          <input
            className="title-input mt-1 w-full"
            value={pack.name}
            onChange={(e) => void updatePack(packId, { name: e.target.value })}
          />
          <input
            className="mt-2 w-full bg-transparent text-sm text-[var(--muted)] outline-none"
            placeholder="Optional description"
            value={pack.description}
            onChange={(e) => void updatePack(packId, { description: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/lists/new?pack=${packId}`} className="btn-primary">
            New list from this
          </Link>
          <button type="button" className="btn-ghost" onClick={() => void onExport()}>
            Save library file
          </button>
          <button type="button" className="btn-ghost text-red-300" onClick={() => void onDelete()}>
            Delete
          </button>
        </div>
      </div>

      <UploadDropzone onFiles={onFiles} busy={busy} />
      {note && <p className="text-sm text-[var(--muted)]">{note}</p>}

      {lists.length > 0 && (
        <p className="text-sm text-[var(--muted)]">
          Used by{" "}
          {lists.map((list, i) => (
            <span key={list.id}>
              {i > 0 && ", "}
              <Link href={`/lists/${list.id}`} className="text-[var(--brass)] underline-offset-2 hover:underline">
                {list.name}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      {assets.length === 0 ? (
        <p className="text-[var(--muted)]">Nothing here yet. Drop a folder of images to start.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {assets.map((asset) => (
            <li key={asset.id} className="card space-y-2 p-2">
              <AssetTile name={asset.name} src={urlFor(asset.id)} />
              <input
                className="w-full bg-transparent text-sm outline-none"
                value={asset.name}
                onChange={(e) => void renameAsset(asset.id, e.target.value)}
              />
              <button
                type="button"
                className="text-xs text-[var(--muted)] hover:text-red-300"
                onClick={() => {
                  if (window.confirm(`Remove “${asset.name}”?`)) void deleteAsset(asset.id);
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
