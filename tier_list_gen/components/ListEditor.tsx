"use client";

import { toPng } from "html-to-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { inkForSwatch, TIER_SWATCHES } from "@/lib/defaults";
import { slug } from "@/lib/format";
import { nid } from "@/lib/id";
import type { Placement, Tier } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { AssetTile } from "./AssetTile";

export function ListEditor({ listId }: { listId: string }) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const {
    ready,
    packs,
    lists,
    assetsInPack,
    urlFor,
    updateList,
    deleteList,
    placeAsset,
    syncListAssets,
  } = useWorkspace();
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editingRows, setEditingRows] = useState(false);

  const list = lists.find((item) => item.id === listId);
  const pack = list ? packs.find((item) => item.id === list.packId) : undefined;
  const packId = list?.packId;
  const assets = useMemo(
    () => (packId ? assetsInPack(packId) : []),
    [assetsInPack, packId],
  );

  useEffect(() => {
    if (list) syncListAssets(list);
  }, [list, syncListAssets]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!held || !list) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < list.tiers.length) {
        void placeAsset(list.id, held, list.tiers[index].id);
        setHeld(null);
      }
      if (e.key === "0" || e.key === "Backspace" || e.key === "Escape") {
        if (e.key === "0" || e.key === "Backspace") {
          void placeAsset(list.id, held, "unranked");
        }
        setHeld(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [held, list, placeAsset]);

  const grouped = useMemo(() => {
    if (!list) return { rows: [] as Array<{ tier: Tier; ids: string[] }>, unranked: [] as string[] };
    const used = new Set<string>();
    const rows = list.tiers.map((tier) => {
      const ids = Object.entries(list.placements)
        .filter(([, place]) => place === tier.id)
        .map(([id]) => id);
      ids.forEach((id) => used.add(id));
      return { tier, ids };
    });
    const unranked = assets.map((asset) => asset.id).filter((id) => !used.has(id));
    return { rows, unranked };
  }, [assets, list]);

  if (!ready) return <p className="text-[var(--muted)]">Loading list…</p>;
  if (!list) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-4xl">List not found</h1>
        <Link href="/" className="btn-ghost">
          Back home
        </Link>
      </div>
    );
  }

  const board = list;

  function dropOn(placement: Placement) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/asset-id") || held;
      setOver(null);
      if (id) void placeAsset(board.id, id, placement);
      setHeld(null);
    };
  }

  function tapRow(placement: Placement) {
    if (!held) return;
    void placeAsset(board.id, held, placement);
    setHeld(null);
  }

  async function onExportPng() {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#f6f1e8",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug(board.name)}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  }

  function updateTier(tierId: string, patch: Partial<Tier>) {
    void updateList(board.id, {
      tiers: board.tiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    });
  }

  function addTier() {
    const tier: Tier = {
      id: nid("tier"),
      label: "NEW",
      color: TIER_SWATCHES[board.tiers.length % TIER_SWATCHES.length],
      text: "#1b1208",
    };
    void updateList(board.id, { tiers: [...board.tiers, tier] });
  }

  function removeTier(tierId: string) {
    const placements = { ...board.placements };
    for (const [assetId, place] of Object.entries(placements)) {
      if (place === tierId) placements[assetId] = "unranked";
    }
    void updateList(board.id, {
      tiers: board.tiers.filter((tier) => tier.id !== tierId),
      placements,
    });
  }

  function moveTier(tierId: string, dir: -1 | 1) {
    const index = board.tiers.findIndex((tier) => tier.id === tierId);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= board.tiers.length) return;
    const tiers = [...board.tiers];
    const [row] = tiers.splice(index, 1);
    tiers.splice(next, 0, row);
    void updateList(board.id, { tiers });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--brass)] uppercase">
            Tier list · autosaved
          </p>
          <input
            className="title-input mt-1 w-full"
            value={list.name}
            onChange={(e) => void updateList(list.id, { name: e.target.value })}
          />
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ranking{" "}
            <Link href={`/packs/${list.packId}`} className="text-[var(--brass)] underline-offset-2 hover:underline">
              {pack?.name ?? "library"}
            </Link>
            . Drag tiles, or tap one then tap a row. Keys 1–{list.tiers.length} place a selected tile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => setEditingRows((v) => !v)}>
            {editingRows ? "Done editing rows" : "Edit rows"}
          </button>
          <button type="button" className="btn-primary" disabled={exporting} onClick={() => void onExportPng()}>
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
          <button
            type="button"
            className="btn-ghost text-red-300"
            onClick={() => {
              if (!window.confirm(`Delete “${list.name}”? The library stays.`)) return;
              void deleteList(list.id).then(() => router.push("/"));
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div ref={boardRef} className="overflow-hidden rounded-xl border border-black/10 bg-[#f6f1e8] text-[#1b1208]">
        <div className="border-b border-black/10 px-4 py-3">
          <p className="font-serif text-2xl leading-none">{list.name}</p>
        </div>
        {grouped.rows.map(({ tier, ids }) => (
          <div
            key={tier.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(tier.id);
            }}
            onDragLeave={() => setOver((cur) => (cur === tier.id ? null : cur))}
            onDrop={dropOn(tier.id)}
            onClick={() => tapRow(tier.id)}
            className={`flex min-h-[92px] border-b border-black/10 ${
              over === tier.id ? "bg-black/5" : ""
            }`}
          >
            <div
              className="flex w-16 shrink-0 items-center justify-center border-r border-black/10 font-serif text-3xl sm:w-20"
              style={{ background: tier.color, color: tier.text }}
            >
              {tier.label}
            </div>
            <div className="flex flex-1 flex-wrap content-start gap-2 p-2">
              {ids.map((id) => {
                const asset = assets.find((item) => item.id === id);
                if (!asset) return null;
                return (
                  <AssetTile
                    key={id}
                    name={asset.name}
                    src={urlFor(id)}
                    size="sm"
                    selected={held === id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/asset-id", id);
                      e.dataTransfer.effectAllowed = "move";
                      setHeld(id);
                    }}
                    onClick={() => setHeld((cur) => (cur === id ? null : id))}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {editingRows && (
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Rows</h2>
            <button type="button" className="btn-ghost" onClick={addTier}>
              Add row
            </button>
          </div>
          <ul className="space-y-2">
            {list.tiers.map((tier, index) => (
              <li key={tier.id} className="flex flex-wrap items-center gap-2">
                <input
                  className="field w-24"
                  value={tier.label}
                  onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                />
                <div className="flex flex-wrap gap-1">
                  {TIER_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full border ${
                        tier.color === color ? "border-[var(--ink)]" : "border-transparent"
                      }`}
                      style={{ background: color }}
                      onClick={() => updateTier(tier.id, { color, text: inkForSwatch(color) })}
                      aria-label={`Set ${tier.label} to ${color}`}
                    />
                  ))}
                </div>
                <button type="button" className="btn-ghost" disabled={index === 0} onClick={() => moveTier(tier.id, -1)}>
                  Up
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={index === list.tiers.length - 1}
                  onClick={() => moveTier(tier.id, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-300"
                  disabled={list.tiers.length <= 1}
                  onClick={() => removeTier(tier.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setOver("unranked");
        }}
        onDragLeave={() => setOver((cur) => (cur === "unranked" ? null : cur))}
        onDrop={dropOn("unranked")}
        onClick={() => tapRow("unranked")}
        className={`rounded-xl border border-dashed p-4 ${
          over === "unranked" ? "border-[var(--brass)] bg-[var(--brass-dim)]" : "border-[var(--hairline)]"
        }`}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Unranked</h2>
          <span className="text-sm text-[var(--muted)]">{grouped.unranked.length} left</span>
        </div>
        {grouped.unranked.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {assets.length === 0 ? (
              <>
                This library is empty.{" "}
                <Link href={`/packs/${list.packId}`} className="text-[var(--brass)] underline-offset-2 hover:underline">
                  Upload assets
                </Link>
                .
              </>
            ) : (
              "Every asset is on the board."
            )}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {grouped.unranked.map((id) => {
              const asset = assets.find((item) => item.id === id);
              if (!asset) return null;
              return (
                <AssetTile
                  key={id}
                  name={asset.name}
                  src={urlFor(id)}
                  selected={held === id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/asset-id", id);
                    e.dataTransfer.effectAllowed = "move";
                    setHeld(id);
                  }}
                  onClick={() => setHeld((cur) => (cur === id ? null : id))}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
