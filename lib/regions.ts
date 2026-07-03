/**
 * The regions of the X1 world — one beacon per ecosystem project.
 *
 * Source of truth: `projects.json` in the repo root (category / project /
 * domain / builder). Add a project there, drop a screenshot at
 * `public/projects/<id>.svg|png` (see scripts/gen-screenshots.js), done.
 *
 * Placement is automatic: a Fibonacci sphere spreads any number of projects
 * evenly around the globe, so the list can grow without hand-placing.
 */
import projects from "@/projects.json";
import siteStatus from "@/lib/site-status.json";

type SiteStatus = Record<
  string,
  {
    ok: boolean;
    note?: string;
    description?: string;
    twitter?: string;
    telegram?: string;
    checkedAt?: string;
  }
>;
const status = siteStatus as SiteStatus;

export type LandmarkKind =
  | "validatorTower"
  | "dexGate"
  | "chartBeacon"
  | "socialBeacon"
  | "gameArcade"
  | "bridgePortal"
  | "explorerFort"
  | "oracleShrine";

export type Region = {
  id: string;
  order: number;
  name: string;
  category: string;
  builder: string;
  domain: string;
  href: string;
  /** Screenshot shown on the proximity card. */
  screenshot: string;
  /** Unit direction on the globe (Fibonacci sphere point). */
  dir: [number, number, number];
  accent: string;
  /** Which low-poly landmark model represents this category. */
  kind: LandmarkKind;
  /** Short generated description (category-based — refine per project later). */
  blurb: string;
  /** Real meta description scraped from the site (empty if none). */
  description: string;
  twitter: string;
  telegram: string;
};

const BLURB_BY_CATEGORY: Record<string, string> = {
  "Core Infra": "Core infrastructure keeping the X1 network running and accessible.",
  Infrastructure: "Infrastructure tooling for operators building on X1.",
  "Validator Dashboard": "Track X1 validator status, performance, and network participation.",
  "DEX / Trading": "Trade and swap on X1 with a native decentralized exchange.",
  "Trading Bot": "Automated trading tools for the X1 ecosystem.",
  "Data / Charts": "Live charts and market data for tokens on X1.",
  "Data / Portfolio": "Portfolio tracking across the X1 ecosystem.",
  "Data / News": "News and updates from around the X1 ecosystem.",
  "Data / Explorer": "Explore blocks, transactions, and accounts on X1.",
  "Data / Oracle": "Oracle data feeds for applications building on X1.",
  "Prediction Markets": "Prediction markets settled on X1.",
  "Social / Community": "Community and social layer of the X1 world.",
  "Messaging / Identity": "Messaging and identity built on X1 rails.",
  Creative: "Creative projects and culture from the X1 community.",
  "Game / Mining": "Games and mining experiences powered by X1.",
  "Games / Charts": "Games and market data in one X1 hub.",
  "NFT Marketplace": "Mint and trade NFTs on X1.",
  "Bridge UI": "Bridge assets in and out of the X1 network.",
  Launchpad: "Launch new tokens and projects on X1.",
  "Meme / Community": "Meme energy and community culture on X1.",
  "Docs / Wiki": "Community knowledge base — everything about X1 in one place.",
};

const KIND_BY_CATEGORY: Record<string, LandmarkKind> = {
  "Core Infra": "validatorTower",
  Infrastructure: "validatorTower",
  "Validator Dashboard": "validatorTower",
  "DEX / Trading": "dexGate",
  "Trading Bot": "dexGate",
  "Data / Charts": "chartBeacon",
  "Data / Portfolio": "chartBeacon",
  "Data / News": "chartBeacon",
  "Data / Explorer": "explorerFort",
  "Data / Oracle": "oracleShrine",
  "Prediction Markets": "oracleShrine",
  "Social / Community": "socialBeacon",
  "Messaging / Identity": "socialBeacon",
  Creative: "socialBeacon",
  "Game / Mining": "gameArcade",
  "Games / Charts": "gameArcade",
  "NFT Marketplace": "gameArcade",
  "Bridge UI": "bridgePortal",
  Launchpad: "bridgePortal",
  "Meme / Community": "socialBeacon",
  "Docs / Wiki": "explorerFort",
};

/** Optional hand-written blurb on a projects.json entry. */
function customBlurb(p: unknown): string | undefined {
  return typeof p === "object" && p !== null && "blurb" in p
    ? String((p as { blurb: unknown }).blurb)
    : undefined;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// gold / blue / cyan / violet / green / amber — cycled per category
const ACCENTS = ["#f0c75e", "#3b82f6", "#7dd3fc", "#a78bfa", "#4ade80", "#fb923c"];

const categoryAccent = new Map<string, string>();
function accentFor(category: string) {
  if (!categoryAccent.has(category)) {
    categoryAccent.set(category, ACCENTS[categoryAccent.size % ACCENTS.length]);
  }
  return categoryAccent.get(category)!;
}

// Evenly distribute N points on a sphere (golden-angle spiral).
function fibonacciDir(i: number, n: number): [number, number, number] {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * 2.399963229728653; // golden angle in radians
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

// Sites confirmed DOWN by scripts/check-sites.js are hidden from the globe.
// (No status entry yet = assumed up, with the placeholder screenshot.)
// x1.world is exempt — it's THIS site ("you are here"), not deployed yet.
const live = projects.filter((p) => {
  if (p.domain === "x1.world") return true;
  const s = status[slugify(`${p.project}-${p.domain}`)];
  return !s || s.ok;
});

export const regions: Region[] = live.map((p, i) => {
  const id = slugify(`${p.project}-${p.domain}`);
  const href = p.domain.startsWith("http")
    ? p.domain
    : `https://${p.domain}`;
  const s = status[id];
  const checked = s?.ok === true;
  return {
    id,
    order: i,
    name: p.project,
    category: p.category,
    builder: p.builder,
    domain: p.domain,
    href,
    // real capture once the checker has run; generated placeholder until then
    screenshot: checked ? `/projects/${id}.png` : `/projects/${id}.svg`,
    dir: fibonacciDir(i, live.length),
    accent: accentFor(p.category),
    kind: KIND_BY_CATEGORY[p.category] ?? "validatorTower",
    blurb:
      customBlurb(p) ??
      (p.domain === "x1.world"
        ? "You are here. The interactive X1 ecosystem world you're exploring right now."
        : BLURB_BY_CATEGORY[p.category] ?? `Part of the growing X1 ecosystem — ${p.category}.`),
    // a hand-written blurb in projects.json beats the scraped description
    description: customBlurb(p) ?? s?.description ?? "",
    twitter: s?.twitter ?? "",
    telegram: s?.telegram ?? "",
  };
});

/** Every project (including offline ones) for the ecosystem directory table. */
export type DirectoryEntry = {
  id: string;
  name: string;
  category: string;
  builder: string;
  domain: string;
  href: string;
  screenshot: string;
  accent: string;
  ok: boolean;
  description: string;
  twitter: string;
  telegram: string;
  note: string;
};

export const directory: DirectoryEntry[] = projects.map((p) => {
  const id = slugify(`${p.project}-${p.domain}`);
  const s = status[id];
  const ok = p.domain === "x1.world" ? true : !s || s.ok;
  return {
    id,
    name: p.project,
    category: p.category,
    builder: p.builder,
    domain: p.domain,
    href: p.domain.startsWith("http") ? p.domain : `https://${p.domain}`,
    screenshot: s?.ok ? `/projects/${id}.png` : `/projects/${id}.svg`,
    accent: accentFor(p.category),
    ok,
    description:
      customBlurb(p) ||
      s?.description ||
      (p.domain === "x1.world"
        ? "You are here — the interactive X1 ecosystem world."
        : BLURB_BY_CATEGORY[p.category] ?? p.category),
    twitter: s?.twitter ?? "",
    telegram: s?.telegram ?? "",
    note: s?.note ?? "unchecked",
  };
});
