# x1.world 🌐

An **unofficial, fan-made** interactive explorer for the **X1 ecosystem** — the
SVM-compatible Layer 1 from the X1 Foundation.

A little **ninja** (blue headband, gold katanas — x1.ninja energy) stands on top
of a dark, glowing network-world under a starry sky. **You drive it**: walking
rotates the planet beneath the ninja's feet. Walk up to a glowing beacon and its
project card opens — screenshot, category, builder, and a link out. Every beacon
is a real X1 ecosystem project.

And it's a game: **X1 Ninja Survivors** — a Vampire-Survivors run on the globe.
Pick one of four characters (X1 Ninja, Jack Levin, THEO, CAPY), survive the
crypto bestiary (bugs, gas wisps, rugs, THE WHALE), capture every ecosystem
site, slay the final boss, then inscribe your score on X1 mainnet and climb the
global leaderboard.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

Desktop first: **WASD / arrows** to walk · **drag** to spin · **E** (or click a
beacon) to inspect · **Esc** or walk away to close.

> Heads-up: browsers pause WebGL rendering in hidden tabs — the world only
> animates while the tab is visible.

## Add / edit projects

1. Edit **`projects.json`** in the repo root (category, project, domain, builder).
2. Run `node scripts/check-sites.js` — headless Chromium visits every site,
   captures a real screenshot into `public/projects/`, and writes up/down
   status to `lib/site-status.json`. **Down sites are automatically hidden
   from the globe** (x1.world itself is exempt).
3. `node scripts/gen-screenshots.js` generates placeholder shots for anything
   not yet captured.

Landmarks are placed automatically (Fibonacci sphere), so the list can grow
without any layout work. Re-run the checker whenever you want fresh
screenshots or a health re-check.

## Where things live

- `components/Experience.tsx` — canvas root: stars, lighting, suspense, post
- `components/three/Planet.tsx` — the world, movement/inertia, proximity, beacons
- `components/three/Character.tsx` + `CharacterBody.tsx` — playable characters
  (procedural ninja + GLB bodies for Jack / THEO / CAPY)
- `components/three/Rig.tsx` — camera framing + mouse drift
- `components/ui/` — HUD overlay, side panel console, project card
- `components/game/` — X1 Ninja Survivors: `GameLayer.tsx` (the whole sim),
  `GameHUD.tsx` (menus/cards/toasts), `Mobs.tsx` (procedural enemies),
  `Nemesis.tsx`, `CharacterPreview.tsx` (select-screen turntable)
- `lib/gameStore.ts` — run state, difficulties, upgrades + evolutions, scoring
- `lib/characters.ts` — playable character registry (stats, weapons, colors)
- `lib/leaderboard.ts` + `app/api/leaderboard/` — Supabase global leaderboard
- `lib/inscribe.ts` — inscribe your score on X1 mainnet (SPL memo)
- `lib/profile.ts` — name + wallet connect (X1 Wallet / Backpack; no Phantom)
- `lib/regions.ts` — projects.json → placed regions
- `scripts/` — site checker + GLB pipeline (`strip-models`, `pose-bake`,
  `smooth-model`); the checker needs `npx playwright install chromium` once
  (playwright-core ships without a browser)
- `docs/` — concept, design language, X1 facts, build plan (historical)
- `ninja_game/` — earlier standalone 2D prototype; not built or imported

_Not affiliated with the X1 Foundation. A fan tribute._
