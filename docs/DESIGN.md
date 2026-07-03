# x1.world — Design System

Starting palette and motion language. These are **defaults to build on**, not
locked brand law — Fable should refine against the final art direction.

## Palette

The world is blue. Space is deep. Accents glow.

| Token | Hex | Use |
| --- | --- | --- |
| `--space` | `#05070f` | Deep background / outer space |
| `--space-2` | `#0a1024` | Secondary background, gradients |
| `--ocean` | `#1656d6` | The globe's core blue |
| `--ocean-lit` | `#3b82f6` | Lit side of the globe, water |
| `--land` | `#5eead4` → `#22d3ee` | Illustrated landmasses (teal-cyan) |
| `--glow` | `#7dd3fc` | Node/consensus glow, particles |
| `--accent` | `#a78bfa` | Rare highlight (violet), CTAs |
| `--ink` | `#eaf2ff` | Primary text on dark |
| `--ink-dim` | `#8ea3c4` | Secondary text |

Guidance: keep 90% of the frame in blues/space; use violet `--accent`
sparingly so CTAs and "you are here" markers pop.

## Typography

- **Display / headlines:** a characterful geometric or grotesque sans. Candidates
  to trial: *Clash Display*, *General Sans*, *Space Grotesk*, or *Geist* (already
  installed). Large, tight tracking, few words.
- **Body / UI:** `Geist` (installed via next/font) or `Inter`. Small, calm.
- **Mono (stats / addresses / "5 USD/day"):** `Geist Mono` (installed). Use for
  numbers and anything that should feel on-chain.

Type scale (fluid, `clamp()`): 12 · 14 · 16 · 20 · 28 · 40 · 64 · 96.

## Motion language (Linear-grade)

- **Easing:** default `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) for entrances;
  `cubic-bezier(0.65, 0, 0.35, 1)` for camera moves. Never linear, never bounce
  (except one intentional, tiny character-landing squash).
- **Durations:** micro 150–250ms · UI 300–500ms · cinematic camera 800–1400ms.
- **Choreography:** stagger reveals 40–80ms. One thing moves, then the next.
- **Scroll:** Lenis smooth scroll drives GSAP ScrollTrigger timelines. Target a
  locked 60fps; degrade gracefully on low-power devices.
- **The globe:** always subtly alive — a slow idle spin even when the user is
  still, plus gentle atmospheric particle drift.

## 3D art direction

- **Style:** low-poly / stylized, soft gradients, faint rim light and fresnel
  atmosphere around the globe. Bloom on glowing nodes. Subtle film grain.
- **Character:** simple, readable, charming — capsule-with-personality, not a
  detailed human. Think Monument Valley's Ida, or a rounded low-poly astronaut.
  Keep it low-poly so it's cheap to animate walking.
- **Lighting:** one key light (sun) creating a clear lit/dark side on the globe;
  cool fill from space; warm glow from districts.
- **Atmosphere:** additive-blended fresnel shell + drifting particle field for
  depth. This single effect does a lot of the "premium" work.

## Accessibility & performance

- Respect `prefers-reduced-motion`: swap the cinematic auto-motion for gentle
  fades and a static hero; keep the site fully readable without WebGL.
- Provide a lightweight fallback (poster image + copy) if WebGL is unavailable.
- Lazy-load the 3D bundle; keep the initial paint fast. Budget: interactive
  hero under ~2.5s on a mid device.
- All copy must exist as real DOM text for SEO/screen readers, not baked into
  the canvas.

## Layout

- Mostly full-bleed canvas with **floating UI islands** (headline, stat card,
  CTA) that fade in per region. Minimal chrome. No traditional top nav during
  the journey — a small persistent logo + a "skip tour / read docs" affordance.
