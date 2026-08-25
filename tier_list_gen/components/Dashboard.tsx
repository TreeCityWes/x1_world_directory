"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { timeAgo } from "@/lib/format";
import type { PackExport } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { Mosaic } from "./Mosaic";

export function Dashboard() {
  const router = useRouter();
  const { ready, error, packs, lists, assetsInPack, listsForPack, urlFor, importPack } =
    useWorkspace();
  const importRef = useRef<HTMLInputElement>(null);

  if (!ready) return <p className="text-[var(--muted)]">Opening your workspace…</p>;
  if (error) return <p className="text-red-300">{error}</p>;

  async function onImport(file: File) {
    try {
      const payload = JSON.parse(await file.text()) as PackExport;
      const pack = await importPack(payload);
      router.push(`/packs/${pack.id}`);
    } catch {
      window.alert("That file is not a saved asset library.");
    }
  }

  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--brass)] uppercase">
          Local workspace
        </p>
        <h1 className="mt-2 font-serif text-5xl leading-none text-[var(--ink)] sm:text-6xl">
          Make a list. Keep the pieces.
        </h1>
        <p className="mt-4 max-w-xl text-[var(--muted)]">
          Upload images into a reusable library, then rank them on as many boards as you want.
          Everything stays in this browser until you export it.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl">Asset libraries</h2>
            <p className="text-sm text-[var(--muted)]">Saved sets you can reuse on new lists.</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImport(file);
                e.target.value = "";
              }}
            />
            <button type="button" className="btn-ghost" onClick={() => importRef.current?.click()}>
              Import library
            </button>
            <Link href="/packs/new" className="btn-primary">
              New library
            </Link>
          </div>
        </div>

        {packs.length === 0 ? (
          <Empty
            title="No libraries yet"
            body="Start by uploading a set of images — characters, albums, foods, anything you want to rank."
            href="/packs/new"
            cta="Create a library"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => {
              const assets = assetsInPack(pack.id);
              const used = listsForPack(pack.id);
              return (
                <li key={pack.id}>
                  <Link href={`/packs/${pack.id}`} className="card block p-3 hover:border-[var(--brass)]">
                    <Mosaic urls={assets.map((asset) => urlFor(asset.id)).filter(Boolean) as string[]} />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-xl leading-tight">{pack.name}</h3>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {assets.length} asset{assets.length === 1 ? "" : "s"} · {used.length} list
                          {used.length === 1 ? "" : "s"} · {timeAgo(pack.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl">Tier lists</h2>
            <p className="text-sm text-[var(--muted)]">Each list is a ranking of one library.</p>
          </div>
          <Link href="/lists/new" className="btn-primary">
            New list
          </Link>
        </div>

        {lists.length === 0 ? (
          <Empty
            title="No lists yet"
            body="Pick a library and drag items onto S through F — or invent your own rows."
            href="/lists/new"
            cta="Create a tier list"
          />
        ) : (
          <ul className="grid gap-3">
            {lists.map((list) => {
              const pack = packs.find((item) => item.id === list.packId);
              const ranked = Object.values(list.placements).filter((p) => p !== "unranked").length;
              const total = Object.keys(list.placements).length;
              return (
                <li key={list.id}>
                  <Link
                    href={`/lists/${list.id}`}
                    className="card flex items-center justify-between gap-4 px-4 py-4 hover:border-[var(--brass)]"
                  >
                    <div>
                      <h3 className="font-serif text-2xl leading-tight">{list.name}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {pack?.name ?? "Missing library"} · {ranked}/{total} placed ·{" "}
                        {timeAgo(list.updatedAt)}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-[var(--brass)] uppercase">
                      Open
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Empty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="card flex flex-col items-start gap-3 px-5 py-8">
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="max-w-lg text-sm text-[var(--muted)]">{body}</p>
      <Link href={href} className="btn-primary">
        {cta}
      </Link>
    </div>
  );
}
