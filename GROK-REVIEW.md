# x1.world — Review (Grok, 2026-07-04)

> Summary audit. Deep appendices: **`GROK-REVIEW-DEEP.md`**. Cross-check
> `GLM-REVIEW.md` and `CODEX-REVIEW.md`.
>
> Priority: **P1** = correctness / player-hostile · **P2** = balance / juice ·
> **P3** = consistency / polish · **P4** = docs / tooling

---

## Audit processing log (2026-07-04)

Three waves processed. Full per-ID log: **`GROK-REVIEW-DEEP.md` § Loop resolution log**.

| Commit | Scope |
| --- | --- |
| `0c72ff6` | Codex + GLM: pause, i-frames, planet freeze, linear scoring, rug rename, rate limit, doc truth |
| `ca8efb4` | Grok quick wins: fort shield `Math.max`, boss retry, OG/metadata, safe-area joystick |
| `c57e3ec` | Loop batch 1 — P1 combat: telegraph hatch retry, pending 12→40, `pick()` validation, shield VFX all chars, idle CAPY aim |
| `2013539` | Loop batch 2 — P2 balance: Cursed weakens damage, all ready evos offered, dead `fx` fields removed; COMBAT-05 skipped (keep it hard) |
| `67cbc96` | Owner touch: center-screen capture bonus flash (power granted) |
| `35c7988` | Loop batch 3 — security: nonce fail-closed, derived HMAC key, nonce GET rate limit, wallet squatting closed |
| `a557d96` | Loop batch 4 — perf: idle GasWisp gated, `LOW_GPU` sphere tessellation, texture cache cap |
| `2f9071c` | Register sync — resolution log through `a557d96` |

**Verified:** pause headless; capture flash live ("SITE CAPTURED" + power label).

### Taken (register closed)

All items above plus: telegraph rings no longer clear without a spawn payoff; unsigned wallet POSTs become guest entries; `sfx.boss` only on successful spawn.

### Intentionally not done (documented)

| Item | Disposition |
| --- | --- |
| COMBAT-05 secondary-DPS scaling | **Rejected** — buffing halo/arc/katana makes the game easier; owner guardrail "keep it hard" |
| COMBAT-01 boss ground-ring telegraph | **By design** — full-screen nameplate is the boss tell |
| Win-target decoupling | **Deferred** — build-time constant; revisit past ~70 projects |
| SEC-01 run-token anti-cheat | **Deferred** — needs real design |
| `ninja_game/` archival | **Owner call** |
| Finale player-power key | **Design session** |
| Difficulty-normalized rankings | **Design session** |
| Music bed | **Design session** |
| Daily seed / weekly mutator | **Design session** |
| Mobile run ribbon | **Design session** |
| PERF-02 lazy GLB per char | **Deferred** — Suspense/invisible-character risk |

---

## Scope

The shipped product is a **dual-mode console**:

1. **Explore** — walk a Fibonacci-sphere globe of ~55 live X1 projects; proximity
   cards in the right panel; directory below the fold.
2. **X1 Ninja Survivors** (default landing) — Vampire-Survivors on the same globe:
   capture every site, survive the horde, slay the final Nemesis, leaderboard +
   optional on-chain inscription.

A standalone `ninja_game/` prototype still sits in the repo but is not built or
imported. Treat the embedded 3D game as the product.

---

## What's genuinely strong (protect these)

- **Explore-as-power-up pool** — real ecosystem projects become permanent run buffs
  via `KIND_BY_CATEGORY`. Clever marketing mechanic that also drives discovery.
- **Evolution system** — `requires: [a,b]` pairs injected as golden cards is
  textbook VS design; per-character `UPGRADE_FLAVOR` keeps fantasy coherent.
- **Planet-as-arena math** — ninja fixed at pole, world rotates; chase camera
  with frozen touch reference frame solves mobile swoop bugs elegantly.
- **Combat fairness basics** — discrete bite cooldowns, global 0.4s i-frames,
  knockback gate, spawn telegraphs (0.7s warning rings), pause overlay.
- **Live ecosystem ops** — `check-sites.js` + auto screenshots + offline filtering
  keeps the globe honest.
- **On-chain inscription** — memo tx on X1 mainnet is a shareable, on-brand hook
  most marketing sites don't have.

---

## 1. Design & UX

### Product narrative & mode hierarchy

- **[P2] Game-first landing diverges from `CONCEPT.md`.** Default mode is `menu`
  (survivors), not explore. Metadata now sells both (`ca8efb4`), but the explore
  journey (arrival drift, guided tour, horizon pullback) is largely unbuilt. Decide
  explicitly which mode is the hero and align first-run onboarding to match.
- **[P3] No arrival cinematic or guided tour.** `CONCEPT.md` Phase 4 items
  (intro title beat, "take the tour" auto-walk, whole-planet finale) never shipped.
  Even a lightweight 3-beat overlay ("walk → discover → play") would close the gap
  without GSAP/Lenis.
- **[P3] Fan-made disclaimer is buried.** `CONCEPT.md` and `X1-FACTS.md` ask for a
  persistent footer note on the experience itself; it only appears in
  `Directory.tsx`. Add a subtle line under the wordmark or in the explore panel
  header.
- ~~**[P3] OG / metadata under-sells the game.**~~ **Fixed `ca8efb4`** —
  `app/layout.tsx` title/description mention Survivors, fighters, THE WHALE,
  inscribe-on-X1. Regenerate `/og.png` via `scripts/gen-og.js` if the image still
  frames explore-only.

### Console layout & mobile

- **[P2] Mobile survival layout splits attention.** `Experience.tsx` gives the
  canvas `62vh`; `SidePanel` (capture targets, ecosystem grid, leaderboard) stacks
  below. During a run, arrows and site names are on the globe, but the quest
  progress board requires scrolling away from the fight. Consider a collapsible
  run drawer, or pin "current targets + capture count" as a slim strip over the
  canvas on `max-md`.
- **[P3] Top chrome collisions on small screens.** Run stats (`GameHUD` top center),
  focus header (explore), pause chip (top right), mode tabs, and mute button all
  compete for the same band. On phones the stats bar drops to `top-12` but still
  overlaps onboarding toasts. A single "run ribbon" component would simplify.
- ~~**[P3] Touch joystick lacks safe-area insets.**~~ **Fixed `ca8efb4`** —
  `TouchPad` uses `max(1rem, env(safe-area-inset-bottom/right))`.
- **[P3] "Game" tab label when already exploring.** Clicking game while in
  explore calls `openMenu()` — correct, but the pulsing gold tab reads like "you
  are already in game." Consider "play" / "survive" copy when `mode === "explore"`.

### Onboarding & discoverability

- **[P2] One-line onboarding is thin for a 55-site win condition.** First-run toast
  says "capture all N sites" but doesn't explain arrows, pad stepping, site powers,
  or the final Nemesis gate. A 3-step micro-tutorial (or animated arrow highlight
  on first active site) would cut early abandon.
- **[P3] Controls hints are explore-only.** `Overlay.tsx` shows WASD/drag hints in
  explore; play mode only gets "esc — pause." Add a single line for "move to capture
  glowing pads" on first run, or echo controls near the joystick on mobile.
- **[P3] `mystery` character is a dead slot.** Fifth roster entry is locked with no
  teaser mechanics (no progress bar, no social unlock). Either document the
  roadmap on the card or hide until ready — otherwise it reads like a bug.

### Explore-specific gaps

- **[P2] Network links between nodes are missing.** `Planet.tsx` has an orphan
  comment where `NetworkLinks` used to mount — the "living geodesic ecosystem" art
  direction from `CONCEPT.md` / sketch is only half-delivered (beacons yes, rivers
  no). Reinstating faint great-circle lines between related categories would
  strengthen the screenshot moment.
- **[P3] ~~Click-to-lock (E) is undiscoverable.~~** Done — `FocusHeader` + SidePanel
  show a brief "press e to lock" chip when `nearId` is set (and not yet selected).

### Accessibility

- **[P3] No WebGL fallback.** `DESIGN.md` calls for poster + copy when WebGL fails;
  `ExperienceLoader` only shows "Loading the world…" then a blank canvas on failure.
- **[P3] `prefers-reduced-motion` is partial.** CSS animations are nuked globally
  (`globals.css`), and planet idle drift respects `prefersReducedMotion` — but stars,
  bloom, enemy motion, and canvas rendering continue. Consider a static poster mode.
- **[P3] Directory table sorting is mouse-only.** `Directory.tsx` uses clickable
  `<th>` without buttons, `aria-sort`, or keyboard handlers.

---

## 2. Cosmetic & polish

### Palette & visual language

- **[P3] Violet drift persists in UI despite doc retirement.** `regions.ts` accent
  cycle no longer includes `#a78bfa`, but violet still appears in Cursed difficulty
  styling (`GameHUD`), fortune stat bars (`#c084fc`), and leaderboard cursed color.
  Pick one story: allow violet only for "cursed/mystic" UI, or purge entirely.
- **[P3] Emoji vs dingbat inconsistency.** Upgrade cards use typographic icons;
  mode tabs, profile, mute, and leaderboard use emoji. The mono/console aesthetic
  would feel more expensive with one system (dingbats or SVG, not both).
- **[P3] Profile avatar is always ninja emoji.** `ProfileCard` ignores selected character —
  Jack/THEO/CAPY players don't see their identity in the player card.
- **[P3] Display typography never graduated.** `DESIGN.md` suggested trialing a
  display face (Clash, Space Grotesk); everything is Geist. The wordmark and boss
  nameplates would benefit from a single display cut.

### 3D & post-processing

- **[P3] Atmosphere shader is classic Z-dot, not view fresnel.** `Planet.tsx` uses
  `dot(normal, +Z)` with a clamp fix — functional, but not the per-fragment
  view-vector fresnel described in older handoff notes. Upgrading would deepen the
  rim without changing layout.
- **[P3] No film grain.** `DESIGN.md` lists grain + vignette; vignette ships via
  postprocessing, grain does not. Subtle grain would sell the "Apple film" north star.
- **[P3] Site name banners use Arial.** `getSiteLabel()` in `GameLayer` draws canvas
  text in Arial while UI is Geist — minor but visible on capture arrows.
- **[P3] Orange accent on gremlin mobs + region accents.** `#fb923c` is in the
  accent cycle and gremlin color — fine for "danger/warm," but pushes the frame
  warmer than DESIGN's "90% blues/space."

### Juice & feedback

- ~~**[P2] No music / ambient bed.**~~ **Shipped** — procedural bed in `sound.ts`
  (`startMusic` / mute / `duckMusic`); polish: Start-gesture unlock + mute UI via
  `useSyncExternalStore`.
- **[P3] Leaderboard submit is silent.** `submitScore()` is fire-and-forget; players
  with a name but no wallet never know if their run registered. A tiny toast on POST
  success/failure would close the loop.
- **[P3] Score clamp not surfaced.** Server clamps to 500k (`route.ts`); client
  `scoreOf()` is unbounded. Long Cursed runs could show a higher local score than
  what persisted — show "capped for leaderboard" if `finalScore > 500000`.

---

## 3. Functionality & correctness

### Leaderboard & trust

- **[P1] Scores are client-trusted (SEC-01).** Wallet squatting closed `35c7988`
  (unsigned wallet → guest entry). Score value itself still client-supplied —
  **deferred** until run-token design.
- **[P3] Rankings ignore difficulty.** Hard (1.5×) and Cursed (2×) multiply locally
  but the board sorts raw `score`. **Deferred** — design session.
- **[P3] No score without name.** `die()` / `win()` only call `submitScore` when
  `name.trim()` — silent skip. Fine for privacy, but the leaderboard nudge appears
  only in the side panel; death screen doesn't prompt naming.

### Game state & edge cases

- ~~**[P3] CAPY shield and fort shield share `run.fx.shield`.**~~ **Fixed `c57e3ec`**
  — hex barrier renders for any character with active shield; `Math.max` from `ca8efb4`
  still prevents fort from shortening CAPY window.
- **[P2] Boss pool contention (4 slots).** **Partial** — block bosses retry (`ca8efb4`);
  finale still instant-spawns; nameplate telegraph by design (`COMBAT-01`).
- **[P3] Enemy pool exhaustion is silent.** Goblin pool = 26; when full, spawns
  silently fail. At least HUD feedback ("horde at capacity") or soft cap scaling.

### Win condition & data coupling

- **[P2] Win target = live `regions.length` (~55).** **Deferred** — build-time
  constant per deploy (not live-mutating mid-run). Revisit if roster grows past ~70.
- **[P3] Instant win edge case.** If final boss dies after last capture in the same
  frame, `win()` fires from boss death handler. If player captures last site while
  final boss is alive, they must kill it — good. Worth regression test.

### Infrastructure

- **[P3] Supabase env var naming.** Primary keys use `NEXT_PUBLIC_x1_world_new_*`
  package-prefix form; fallbacks to standard `SUPABASE_*` save production. Document
  in README deploy section.
- **[P4] Checker setup friction.** `check-sites.js` needs Playwright Chromium;
  README mentions it in "Where things live" but easy to miss on clean install.

---

## 4. Game theory & balance

### Scoring incentives

- **[P2] Win bonus (+1000) can dominate short runs.** `win()` adds a flat 1000 on top
  of `scoreOf()`. Consider scaling bonus by `captured/total` or difficulty.
- **[P2] Linear time term still rewards stalling slightly.** `T * 40` in `scoreOf()`
  (cap 600s) is much healthier than T², but pure survival still adds up to 240 pts
  from time alone. Could drop time to a flat "survived 10 min" milestone bonus.
- **[P2] Optimal site order is solved.** Permanent-stat sites first; `bridgePortal`
  nuke when dense. **Design session** — randomize magnitudes, diminishing returns,
  or scale enemy pressure with `perm` stacks.

### Difficulty & characters

- **[P2] THEO's 4th upgrade choice is a major advantage.** Monitor win rates.
- **[P2] Jack's AOE coins vs CAPY melee vs Ninja pierce.** Character balance may need
  per-character enemy scaling or Jack cooldown tax in Hard/Cursed.
- **[P3] Cursed starts below Normal HP.** Intentional; consider one free heal on start.
- **[P3] Hard mode (20s blocks) spikes faster than Normal (30s).** Playtest target times.

### Finale & bosses

- **[P2] Finale triggers at "5 sites remaining," not player power.** **Deferred** —
  design session.
- **[P2] Mid-run bosses lack attack patterns.** Regular mobs have spawn telegraphs;
  bosses/finale spawn instantly. **Deferred** — boss telegraph + windup/charge.
- **[P3] Boss loot unclear.** Boss kills drop gems but no distinct "boss chest" moment.

### Build diversity

- **[P2] Wave-2 weapons from `GAME-DESIGN.md` not shipped** — ticket or trim doc.
- **[P3] CAPY Bladestorm VFX** — evolution still spawns shuriken nova; ensure cleave read.

### Meta / replay

- **[P2] No daily seed or weekly modifier.** **Deferred** — design session.
- **[P3] Best score is local only + global board.** No per-character/difficulty PBs.

---

## 5. Doc & tooling drift (P4)

| Doc | Issue |
| --- | --- |
| `BUILD-PLAN.md` | Stub file names, gsap/lenis fiction, explore-only phases |
| `GAME-DESIGN.md` | Wave-1 tagged "(wave 1)" though shipped; wave-2 not in code |
| `CONCEPT.md` | Says 29 projects; `projects.json` has 55 |
| `DESIGN.md` | Scroll/Lenis unused; WebGL fallback unbuilt |
| `ninja_game/` | Owner call — docs label non-built prototype |

`README.md` and `CLAUDE.md` updated `0c72ff6` — largely accurate.

---

## 6. Recently fixed (verify, don't regress)

See **`GROK-REVIEW-DEEP.md` § Loop resolution log** for per-ID mapping. Highlights:

| Wave | Commit | Items |
| --- | --- | --- |
| Codex + GLM | `0c72ff6` | pause, i-frames, linear score, rug, rate limit, docs |
| Grok quick | `ca8efb4` | fort Math.max, boss retry, OG copy, safe-area |
| Loop P1 | `c57e3ec` | telegraph hatch, pending×40, pick validation, shield VFX, CAPY aim |
| Loop P2 | `2013539` | Cursed dmg, all evos, dead fx fields |
| Owner | `67cbc96` | capture bonus flash |
| Security | `35c7988` | nonce fail-closed, derived key, wallet squatting |
| Perf | `a557d96` | GasWisp idle, LOW_GPU tessellation, label cache cap |

---

## Highest-leverage next (post-loop)

Design sessions only — register is patch-clean:

1. **Mobile run ribbon** + **UX-01** wallet on end screens
2. **Finale keyed to player power**
3. **Site power balance** — break stat-site-first route
4. **SEC-01 run tokens** — if competitive integrity matters
5. **Difficulty-normalized rankings**
6. **Tutorialize site loop**
7. **Network links** on globe
8. **WebGL / reduced-motion fallback**
9. **Music bed** / **daily seed**
10. **`ninja_game/`** archive (owner call)

Not planned: secondary-DPS scaling (rejected — easier game); boss ground-rings (nameplate by design).

---

## Summary

The audit loop through `2f9071c` closed every patch-tier P1 in the register: combat
correctness, security hardening, and perf quick wins. Intentional calls are documented
(COMBAT-05 rejected, COMBAT-01 nameplate-by-design). What remains is product design,
not bug fixes. **`GROK-REVIEW-DEEP.md`** holds formulas, trust model, and the full
resolution log for the next auditor.