"use client";

import { useMemo, useState } from "react";
import { directory, type DirectoryEntry } from "@/lib/regions";

type SortKey = "name" | "category" | "builder" | "ok";

/**
 * The ecosystem directory — every X1 project (online and offline) in one
 * sortable, searchable table with live screenshots. Sits below the console.
 */
export default function Directory() {
  const [sortKey, setSortKey] = useState<SortKey>("ok");
  const [asc, setAsc] = useState(false);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? directory.filter((d) =>
          [d.name, d.category, d.builder, d.domain, d.description]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : directory;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === "boolean"
          ? Number(va) - Number(vb as boolean)
          : String(va).localeCompare(String(vb));
      return asc ? cmp : -cmp;
    });
  }, [sortKey, asc, query]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key !== "ok");
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (asc ? " ↑" : " ↓") : "");

  return (
    <section id="directory" className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            ecosystem directory
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Every project in the X1 world
          </h2>
          <p className="mt-1.5 text-sm text-ink-dim">
            Checked automatically with headless Chromium — screenshots, status, and links stay
            fresh.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search projects…"
          className="w-56 rounded-md border border-white/15 bg-space-2/60 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-dim/60 focus:border-gold/60 focus:outline-none"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-space-2/50 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
              <th className="px-4 py-3 font-medium">preview</th>
              <th
                className="cursor-pointer px-4 py-3 font-medium transition-colors hover:text-gold"
                onClick={() => onSort("name")}
              >
                project{arrow("name")}
              </th>
              <th
                className="cursor-pointer px-4 py-3 font-medium transition-colors hover:text-gold"
                onClick={() => onSort("category")}
              >
                category{arrow("category")}
              </th>
              <th className="px-4 py-3 font-medium">description</th>
              <th
                className="cursor-pointer px-4 py-3 font-medium transition-colors hover:text-gold"
                onClick={() => onSort("builder")}
              >
                builder{arrow("builder")}
              </th>
              <th
                className="cursor-pointer px-4 py-3 font-medium transition-colors hover:text-gold"
                onClick={() => onSort("ok")}
              >
                status{arrow("ok")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <Row key={d.id} d={d} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim/70">
        unofficial fan tribute · not affiliated with x1 foundation ·{" "}
        <a href="https://docs.x1.xyz" className="underline decoration-dotted hover:text-gold">
          docs.x1.xyz
        </a>
      </p>
    </section>
  );
}

function Row({ d }: { d: DirectoryEntry }) {
  return (
    <tr className="border-b border-white/5 transition-colors last:border-0 hover:bg-space-2/40">
      <td className="px-4 py-3">
        <a href={d.href} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- svg/png site captures */}
          <img
            src={d.screenshot}
            alt={`${d.name} preview`}
            loading="lazy"
            className="aspect-[8/5] w-28 rounded-md border border-white/10 object-cover object-top transition-transform hover:scale-[1.7] hover:border-gold/50"
          />
        </a>
      </td>
      <td className="px-4 py-3">
        <a
          href={d.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ink hover:text-gold"
        >
          {d.name}
        </a>
        <p className="mt-0.5 font-mono text-[11px] text-ink-dim">{d.domain}</p>
        <div className="mt-1 flex gap-2 font-mono text-[10px]">
          {d.twitter && (
            <a
              href={d.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-dim hover:text-cyan"
            >
              𝕏
            </a>
          )}
          {d.telegram && (
            <a
              href={d.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-dim hover:text-cyan"
            >
              ✈
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: d.accent }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: d.accent }}
          />
          {d.category}
        </span>
      </td>
      <td className="max-w-72 px-4 py-3 text-[13px] leading-snug text-ink-dim">
        <span className="line-clamp-2">{d.description}</span>
      </td>
      <td className="px-4 py-3 text-[13px] text-ink-dim">{d.builder}</td>
      <td className="px-4 py-3">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
            d.ok ? "text-[#4ade80]" : "text-[#f87171]"
          }`}
        >
          {d.ok ? "● online" : "○ offline"}
        </span>
      </td>
    </tr>
  );
}
