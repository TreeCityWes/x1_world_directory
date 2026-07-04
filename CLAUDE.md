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

**Status:** scaffolding + design docs are done. The 3D scene is intentionally a
placeholder stub (spinning blue sphere) — the real experience is still to be
built (handoff to Fable). Files marked `STUB`/`TODO` are the seams to build into.

**Stack:** Next.js (App Router, TS, Tailwind v4) · three · @react-three/fiber ·
@react-three/drei · gsap · lenis · framer-motion.

**Gotcha:** this is a newer Next.js — `ssr: false` dynamic imports must live in a
Client Component (see `components/ExperienceLoader.tsx`). Check
`node_modules/next/dist/docs/` before assuming old APIs.

**Open audit:** read `GLM-REVIEW.md` (repo root) before making non-trivial
changes. It's a live punch-list of doc drift, the `ninja_game/` vs embedded-game
split, and game-mechanics/balance findings (pause, i-frames, win-condition
coupling, scoring, etc.). Check items off as you resolve them; don't let it go
stale like `HANDOFF.md` did.
