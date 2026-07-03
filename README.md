# x1.world 🌐

An **unofficial, fan-made** interactive explorer for the **X1 ecosystem** — the
SVM-compatible Layer 1 from the X1 Foundation.

A little **ninja** (blue headband, gold katanas — x1.ninja energy) stands on top
of a dark, glowing network-world under a starry sky. **You drive it**: walking
rotates the planet beneath the ninja's feet. Walk up to a glowing beacon and its
project card opens — screenshot, category, builder, and a link out. Every beacon
is a real X1 ecosystem project.

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

- `components/Experience.tsx` — canvas root: stars, lighting, suspense
- `components/three/Planet.tsx` — the world, movement/inertia, proximity, beacons
- `components/three/Character.tsx` — the ninja (bob, facing, scarf, katanas)
- `components/three/Rig.tsx` — camera framing + mouse drift
- `components/ui/` — HUD overlay + project card (framer-motion)
- `lib/regions.ts` — projects.json → placed regions
- `docs/` — concept, design language, X1 facts, build plan

_Not affiliated with the X1 Foundation. A fan tribute._
