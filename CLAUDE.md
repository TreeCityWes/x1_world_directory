@AGENTS.md

# x1.world

Unofficial, fan-made marketing experience for **X1** (the SVM-compatible Layer 1
from the X1 Foundation / Jack Levin). We own the `x1.world` domain.

**Read `docs/` before building anything:**

- `docs/CONCEPT.md` — the vision: a walkable blue globe where the player drives a
  little character around a small planet; each region is a real X1 ecosystem
  project that shows a proximity card. Reference sketch: `x1world-sketch.png`.
- `docs/DESIGN.md` — palette, type, motion language, 3D art direction.
- `docs/X1-FACTS.md` — accurate facts about X1 for copy (verify before shipping).
- `docs/BUILD-PLAN.md` — stack, folder structure, phased build order, open decisions.

**Status:** SHIPPED and live. Two modes share one canvas:

1. **Explore** — the walkable globe: 50+ real X1 ecosystem projects as beacons,
   proximity cards, project directory below the fold (`components/three/*`,
   `components/ui/*`, `lib/regions.ts`).
2. **X1 Ninja Survivors** (the default landing mode) — a Vampire-Survivors run
   on the globe: 4 playable characters (`lib/characters.ts`), capture all sites
   + slay the final boss to win, Supabase leaderboard + inscribe-score-on-X1
   (`components/game/*`, `lib/gameStore.ts`, `lib/leaderboard.ts`,
   `lib/inscribe.ts`, `lib/profile.ts`).

`ninja_game/` is an EARLIER standalone 2D prototype — not imported or built by
the Next.js app. Treat the embedded 3D game as the product.

**Stack:** Next.js (App Router, TS, Tailwind v4) · three · @react-three/fiber ·
@react-three/drei · zustand · framer-motion. (gsap/lenis were planned but never
installed — ignore mentions in older docs.)

**Gotcha:** this is a newer Next.js — `ssr: false` dynamic imports must live in a
Client Component (see `components/ExperienceLoader.tsx`). Check
`node_modules/next/dist/docs/` before assuming old APIs.

**Open audit:** read `GLM-REVIEW.md` (repo root) before making non-trivial
changes. It's a live punch-list of doc drift, the `ninja_game/` vs embedded-game
split, and game-mechanics/balance findings (pause, i-frames, win-condition
coupling, scoring, etc.). Check items off as you resolve them; don't let it go
stale like `HANDOFF.md` did.
