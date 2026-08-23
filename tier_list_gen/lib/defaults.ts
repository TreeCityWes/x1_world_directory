import { nid } from "./id";
import type { Tier } from "./types";

export const DEFAULT_TIER_PRESETS: Array<Omit<Tier, "id">> = [
  { label: "S", color: "#ff7f7f", text: "#1b0b0b" },
  { label: "A", color: "#ffbf7f", text: "#1b1008" },
  { label: "B", color: "#ffdf7f", text: "#1b1608" },
  { label: "C", color: "#ffff7f", text: "#1a1a08" },
  { label: "D", color: "#bfff7f", text: "#0c1808" },
  { label: "F", color: "#bf7fff", text: "#12081a" },
];

export const TIER_SWATCHES = [
  "#ff7f7f",
  "#ffbf7f",
  "#ffdf7f",
  "#ffff7f",
  "#bfff7f",
  "#7fff7f",
  "#7fffff",
  "#7fbfff",
  "#bf7fff",
  "#ff7fff",
  "#d4d4d4",
  "#f4efe6",
];

export function makeDefaultTiers(): Tier[] {
  return DEFAULT_TIER_PRESETS.map((tier) => ({ ...tier, id: nid("tier") }));
}

export function inkForSwatch(color: string): string {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return "#1b1208";
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 150 ? "#1b1208" : "#f6f0e6";
}

export const MAX_ASSET_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
