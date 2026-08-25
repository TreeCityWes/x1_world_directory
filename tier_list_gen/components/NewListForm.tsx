"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";

export function NewListForm({ presetPack = "" }: { presetPack?: string }) {
  const router = useRouter();
  const { ready, packs, assetsInPack, createList } = useWorkspace();
  const [name, setName] = useState("");
  const [packId, setPackId] = useState(presetPack);
  const [busy, setBusy] = useState(false);

  if (!ready) return <p className="text-[var(--muted)]">Loading…</p>;

  if (packs.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="font-serif text-5xl">Need a library first</h1>
        <p className="text-[var(--muted)]">
          Upload a set of images, save that library, then you can start ranking.
        </p>
        <Link href="/packs/new" className="btn-primary">
          Create a library
        </Link>
      </div>
    );
  }

  const selected = packId || packs[0].id;
  const count = assetsInPack(selected).length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const list = await createList(name, selected);
    router.push(`/lists/${list.id}`);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--brass)] uppercase">
          New tier list
        </p>
        <h1 className="mt-2 font-serif text-5xl">Start a ranking</h1>
        <p className="mt-3 text-[var(--muted)]">
          Choose a saved library. New uploads to that library show up as unranked on this board.
        </p>
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-[var(--muted)]">Title</span>
        <input
          className="field"
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Best openings"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[var(--muted)]">Asset library</span>
        <select
          className="field"
          value={selected}
          onChange={(e) => setPackId(e.target.value)}
        >
          {packs.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name} ({assetsInPack(pack.id).length} assets)
            </option>
          ))}
        </select>
        {count === 0 && (
          <p className="text-sm text-[var(--muted)]">
            This library is empty.{" "}
            <Link href={`/packs/${selected}`} className="text-[var(--brass)] underline-offset-2 hover:underline">
              Add images
            </Link>{" "}
            first, or create the list and upload later.
          </p>
        )}
      </label>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Create list"}
      </button>
    </form>
  );
}
