/**
 * Generates dark placeholder screenshot SVGs in public/projects/ — one per
 * entry in projects.json. Re-run after editing the list:
 *
 *   node scripts/gen-screenshots.js
 *
 * Replace any of them with a real capture (same filename, or switch the
 * extension in lib/regions.ts) whenever you have one.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const projects = JSON.parse(fs.readFileSync(path.join(root, "projects.json"), "utf8"));
const outDir = path.join(root, "public", "projects");
fs.mkdirSync(outDir, { recursive: true });

// keep in sync with lib/regions.ts
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ACCENTS = ["#f0c75e", "#3b82f6", "#7dd3fc", "#a78bfa", "#4ade80", "#fb923c"];
const catAccent = new Map();
const accentFor = (c) => {
  if (!catAccent.has(c)) catAccent.set(c, ACCENTS[catAccent.size % ACCENTS.length]);
  return catAccent.get(c);
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let count = 0;
for (const p of projects) {
  const id = slugify(`${p.project}-${p.domain}`);
  const accent = accentFor(p.category);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#0b1020"/>
  <rect width="800" height="44" fill="#121933"/>
  <circle cx="24" cy="22" r="6" fill="#3a466e"/><circle cx="44" cy="22" r="6" fill="#3a466e"/><circle cx="64" cy="22" r="6" fill="#3a466e"/>
  <rect x="86" y="11" width="480" height="22" rx="11" fill="#0e1530" stroke="#2a3558"/>
  <text x="100" y="26" font-family="monospace" font-size="13" fill="#8ea3c4">${esc(p.domain)}</text>
  <text x="60" y="150" font-family="monospace" font-size="15" letter-spacing="3" fill="${accent}">${esc(p.category.toUpperCase())}</text>
  <text x="60" y="205" font-family="sans-serif" font-size="44" font-weight="bold" fill="#e8eefc">${esc(p.project)}</text>
  <text x="60" y="240" font-family="monospace" font-size="15" fill="#8ea3c4">PLACEHOLDER — REPLACE WITH A REAL CAPTURE</text>
  <path d="M60 295 q 40 -30 80 0 t 80 0 t 80 0 t 80 0 t 80 0" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="60" y="340" width="310" height="100" rx="8" fill="#101a3a" stroke="#263255"/>
  <rect x="400" y="340" width="310" height="100" rx="8" fill="#101a3a" stroke="#263255"/>
  <rect x="60" y="338" width="310" height="2" fill="${accent}" opacity="0.7"/>
  <rect x="400" y="338" width="310" height="2" fill="${accent}" opacity="0.7"/>
</svg>\n`;
  fs.writeFileSync(path.join(outDir, `${id}.svg`), svg);
  count++;
}
console.log(`wrote ${count} placeholder screenshots to public/projects/`);
