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

**Open audits (read the latest first):**
- `FOLLOWUP-REVIEW.md` — **start here.** Verifies the `0c72ff6`/`ca8efb4` fix
  commits and flags one new regression (telegraphed spawns silently drop
  enemies on full pools — fix this before balancing). Supersedes the others on
  current-tree status.
- `GLM-REVIEW.md`, `GROK-REVIEW.md`, `CODEX-REVIEW.md` — the original three
  passes; historical. GROK §4 is the canonical list of still-open *design*
  decisions (score integrity, finale tuning, site-route solving, mobile HUD).
Check items off as you resolve them; don't let these go stale like `HANDOFF.md`
did.
