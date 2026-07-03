# x1.world — Build Plan & Handoff

This is the technical brief for building the experience described in
`CONCEPT.md`, styled per `DESIGN.md`, with facts from `X1-FACTS.md`.

The scaffold is **ready**. This doc is written so **Fable** (or any dev) can pick
up and start building the scene immediately.

## Stack (installed & pinned in package.json)

| Concern | Library | Role |
| --- | --- | --- |
| Framework | **Next.js** (App Router, TS) | Routing, SSR shell, fast dev |
| 3D | **three** | Core WebGL engine |
| 3D/React | **@react-three/fiber** | Declarative Three.js in React |
| 3D helpers | **@react-three/drei** | Camera, loaders, controls, shaders |
| Scroll motion | **gsap** (ScrollTrigger) | Choreograph the on-rails journey |
| Smooth scroll | **lenis** | Buttery scroll that drives ScrollTrigger |
| UI motion | **framer-motion** | DOM overlays, headline/stat reveals |
| Styling | **Tailwind CSS v4** | Utility styling for DOM UI |
| Fonts | next/font (Geist, Geist Mono) | Installed; swap display face later |

> **Rive** was named in the original vision but is **not yet installed** — add
> `@rive-app/react-canvas` only if/when you want vector-animated UI accents.

## Directory layout (created)

```
app/
  layout.tsx        # root shell, fonts, metadata (set)
  page.tsx          # renders <Experience/> (currently a stub scene)
  globals.css       # design tokens + Tailwind (blue/space theme set)
components/
  Experience.tsx    # client entry: <Canvas> + overlays (STUB — build here)
  three/
    Globe.tsx       # STUB: the blue ecosystem-map sphere + landmark towers
    Character.tsx   # STUB: the player-driven explorer on top of the world
    Rig.tsx         # STUB: camera that follows the character
  ui/
    Overlay.tsx     # STUB: HUD (wordmark, hint text, "take the tour")
    Card.tsx        # TODO: proximity project card (screenshot + copy + link)
lib/
  regions.ts        # data: the real ecosystem projects + screenshots
  useControls.ts    # TODO: keyboard/mouse movement input
  useLenis.ts       # STUB: smooth-scroll helper (optional; free-explore is primary)
docs/               # CONCEPT / DESIGN / X1-FACTS / BUILD-PLAN (this file)
```

The `three/`, `ui/`, and `lib/` files are **intentionally minimal stubs** so the
dev server runs and the structure is obvious. Real implementation is Fable's job.

## Suggested build order (phased)

**Phase 0 — foundation (DONE by scaffold)**
- Next.js + all libs installed, dev server runs, theme tokens + fonts in place,
  a placeholder Canvas renders a spinning sphere so WebGL is confirmed working.

**Phase 1 — the world exists**
- Real `Globe.tsx`: sphere with a stylized ecosystem-map material (start with a
  gradient + fresnel atmosphere; upgrade to an illustrated equirectangular
  texture or procedural districts later). Slow idle spin.
- Lighting: one key "sun", cool space fill, faint rim.
- Particle/atmosphere shell for depth.

**Phase 2 — the explorer (player-driven)**
- `Character.tsx`: low-poly figure that stays on **top** of the globe. Keep the
  character roughly fixed at the top; **walking rotates the globe underneath**
  (cheaper and reads perfectly as "walking around a small planet").
- `useControls.ts`: WASD / arrow keys → globe rotation velocity; optional
  click/tap-to-walk. On touch, a small on-screen joystick. Add a walk cycle (or
  slide + bob for MVP) that plays while moving.
- `Rig.tsx`: camera eases to follow the character (orbit-behind or high-and-back).

**Phase 3 — landmarks + proximity cards**
- `Globe.tsx`: add a **tower/landmark** at each region's lat/lng from `regions.ts`.
- Per-frame **proximity check**: when the character is within range of a tower,
  fire an "active region" event (debounce at the boundary so it doesn't flicker).
- `Card.tsx`: framer-motion card that animates in with the project's screenshot,
  name, one line, and a link out. Dismisses when the character walks away.
- Capture screenshots into `public/screens/<id>.png` (see regions.ts paths).

**Phase 4 — HUD + story beats**
- `Overlay.tsx`: persistent `x1.world` wordmark, a subtle movement hint
  ("use WASD / drag to explore"), and an optional **"take the tour"** button that
  auto-walks the character between landmarks.
- Intro title beat on arrival; a "whole planet" pullback as a finale/idle state.
- `useLenis.ts` is optional here — only add scroll smoothing if you introduce a
  scrolling section below the canvas. Free-explore is the primary interaction.

**Phase 5 — polish**
- Post-processing (bloom on nodes, subtle grain, vignette) via drei/postprocessing.
- `prefers-reduced-motion` + no-WebGL fallback (poster + copy).
- Performance pass: lazy-load 3D, instancing for nodes, mobile tuning, 60fps.
- Optional Phase 6: free-explore mode (drag-spin + WASD), Rive UI accents, audio.

## Key technical notes

- **Everything 3D is client-side.** `Experience.tsx` is a Client Component and
  should be dynamically imported with `ssr: false` from `page.tsx` to avoid SSR
  WebGL errors.
- **Character-on-sphere math:** place at spherical coords, orient so its "up" is
  the surface normal (`object.up = normal; object.lookAt(...)` or quaternion from
  normal). Keep the walk as globe-rotation for MVP.
- **Scroll ↔ 3D bridge:** don't animate React state per frame. Drive Three
  objects imperatively inside `useFrame` / GSAP, reading a shared scroll-progress
  ref. Keep React re-renders out of the hot path.
- **Real DOM copy:** headlines/stats live in the DOM overlay (SEO + a11y), not
  painted into the canvas.

## Open decisions (for the user / Fable to settle)

1. ~~Control scheme~~ — **decided: free-explore** (player walks the character;
   proximity cards). Optional auto-tour on top. Decide touch controls (joystick
   vs tap-to-walk).
2. Final region set — confirm each ecosystem site (x1val.online, x1valhq.xyz,
   xdex.xyz, x1.ninja, fortiblox.com), what it is, and that you want to feature
   it (see X1-FACTS / CONCEPT).
3. Globe surface: illustrated texture (commission art) vs. procedural/shader.
4. Character design & whether it has a proper rigged walk animation.
5. Display typeface (Geist for now; consider Clash Display / General Sans).
6. Hosting/deploy target (Vercel is the natural fit for Next.js).

## Run it

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
```
