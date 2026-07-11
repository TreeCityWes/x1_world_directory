# x1.world — Design System

Starting palette and motion language. These are **defaults to build on**, not
locked brand law — Fable should refine against the final art direction.

## Palette

The world is blue. Space is deep. Accents glow. **Source of truth: `app/globals.css`** (CSS tokens) — keep this table in sync with it.

| Token | Hex | Use |
| --- | --- | --- |
| `--space` | `#04060f` | Deep background / outer space |
| `--space-2` | `#0b1226` | Secondary background, glass panels |
| `--ocean` | `#1656d6` | The globe's core blue (token) — the 3D shell itself is a darker navy `#16234a` |
| `--ocean-lit` | `#3b82f6` | Lit side of the globe, blue fills |
| `--cyan` | `#7dd3fc` | Network/consensus glow, particles, links |
| `--gold` | `#f0c75e` | CTAs, "you are here", score, captures |
| `--gold-deep` | `#c9a13b` | Gold gradients |
| `--ink` | `#e8eefc` | Primary text on dark |
| `--ink-dim` | `#8ea3c4` | Secondary text |
| `--danger` | `#e0563f` | Enemy hits, damage, warnings |
| `--danger-bright` | `#ff7a62` | Danger emphasis (flashes, crit hits) |
| `--success` | `#4ade80` | Confirmations, healing/vitality, positive state |

Guidance: keep ~90% of the frame in blues/space. **Gold is the CTA color**
(open-site buttons, the "game" tab, captures, score). Cyan is the network/glow
color (links, nodes, the rivers between them). Danger (and its brighter variant)
marks enemies, damage, and warnings; success marks confirmations and vitality.
No violet accent in the build — that was an early candidate, since retired:
"cursed" difficulty styling is void/ink (white-on-black), not violet.

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

## HUD/game UI contract (design-softening pass)

Rules established while de-glowing and de-cluttering the game HUD. Follow
these on every new screen; they're load-bearing, not style suggestions.

- **Glow budget: one per screen.** A single glowing element is allowed — the
  primary CTA in menus, or the earned capture/evolution celebration mid-run.
  Everything else is flat: plain borders, no `shadow-[0_0_...]` box-shadows.
  Glow is a reward signal, not decoration; spend it once or it means nothing.
- **Selection state = 2 signals, no more.** An accent-color border plus a
  ~10% tinted fill (e.g. `background: ${accent}1a`). No glow, no gradient
  wash, no "selected" text badge stacked on top. If a card needs a third
  signal to read as selected, the first two aren't doing their job.
- **Icon language: dingbats only.** ⚔ ★ ✦ ◉ ↯ ⛨ ✓ and friends — zero emoji
  anywhere in game/HUD chrome. Leaderboard medals are mono rank numerals
  (`01` `02` `03`), not 🥇🥈🥉.
- **Tokens, not one-off colors.** All semantic reds/greens route through
  `--danger` / `--danger-bright` / `--success`. Violet is retired — "cursed"
  styling is void/ink, not violet (see Palette above). Gold is the only warm
  UI accent; don't introduce a second warm color for emphasis.
- **Type floor.** Nothing renders under 9px. Letter-spacing (`tracking-*`)
  tops out at `0.14em` — beyond that it hurts legibility more than it helps
  hierarchy. Borders are 1px (`border`, not `border-2`). `backdrop-blur` only
  on the outermost overlay layer — stacking it on nested panels is expensive
  and reads muddy.
- **Meaning never rides on CSS animation alone.** `prefers-reduced-motion`
  zeroes CSS animations (`animate-pulse` etc.) on this owner's own machine, so
  anything that only *pulses* to communicate state is invisible to him. Encode
  the state in static color/weight/border too; Framer Motion (JS-driven) is
  fine for decoration since it isn't blanket-disabled the same way.
- **Rendering budget.** Bloom `0.45` / threshold `0.82`. Film grain `0.2`. No
  `toneMapped={false}` white emissives pushed above ~1.4 intensity — that's
  what blows out into the "everything glows" look this pass undid. No
  strobe-rate opacity pulses (roughly >8 Hz) — they read as a rendering bug,
  not a game feel choice.
