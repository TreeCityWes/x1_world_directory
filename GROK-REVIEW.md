# x1.world — Review (Grok, 2026-07-04)

> Summary audit. Deep appendices: **`GROK-REVIEW-DEEP.md`**. Cross-check
> `GLM-REVIEW.md` and `CODEX-REVIEW.md`.
>
> Priority: **P1** = correctness / player-hostile · **P2** = balance / juice ·
> **P3** = consistency / polish · **P4** = docs / tooling

---

## Audit processing log (2026-07-04)

Processed with discretion in two commits:

| Commit | Scope |
| --- | --- |
| `0c72ff6` | Codex + GLM picks: pause, i-frames, planet freeze, linear scoring, rug rename, leaderboard rate limit, doc truth |
| `ca8efb4` | Grok quick wins: fort shield `Math.max`, boss spawn retry, game-aware OG/metadata, iOS safe-area joystick |

**Verified headless:** Esc/P pause overlay shows, resumes clean, run continues.

### Taken (closed in code or docs)

- Pause overlay (Esc/P) — resume / abandon; Esc no longer quits mid-run; esc-confirm leak gone
- Global 0.4s i-frames after any bite
- Planet inertia frozen under pause / level-up / death / win
- `scoreOf` linear time term (T² removed)
- `whale` mob → `rug` with matching color; dead `MODEL_PATH` entries removed
- Leaderboard per-IP rate limit (POST 12/min, DELETE 5/min → 429) + `res.ok` handling
- Doc truth: `CLAUDE.md`, `README.md`, `HANDOFF.md` superseded banner, `GLM-REVIEW` dispositions
- `openMenu` clears `capturedIds`; `POWER_LABEL` fort 8s note; dead exports/tokens removed
- Fort shield uses `Math.max` — cannot shorten an active CAPY Validator Shield window
- Bear Market boss: `bossAtBlock` stamped only on successful spawn; retries next frame when pool full
- OG/metadata sells Survivors, four characters, THE WHALE, inscribe-on-X1
- TouchPad respects `env(safe-area-inset-bottom/right)`

### Deliberately deferred (with rationale)

| Item | Why deferred |
| --- | --- |
| Win-target decoupling from `regions.length` | Build-time constant per deploy, not live-mutating; product identity; revisit past ~70 projects |
| Score run-tokens / anti-cheat | Needs real design, not a patch |
| `ninja_game/` archival | Owner call; docs label it a non-built prototype |
| Finale keyed to player power | Design session |
| Difficulty-normalized rankings | Design session |
| Ambient music bed | Design session |
| Daily seed / weekly mutator | Design session |
| Boss attack patterns / boss spawn telegraphs | Design session |
| Mobile run ribbon layout | Design session |

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
- **[P3] Click-to-lock (E) is undiscoverable.** Side panel footer mentions it;
  no on-canvas affordance when near a landmark. A brief "press E to lock" chip in
  `FocusHeader` when `nearId` is set would help.

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

- **[P2] No music / ambient bed.** `sound.ts` is a solid WebAudio synth for SFX only.
  A low, looping ambient pad (even procedural) would help 10-minute runs feel less
  sterile.
- **[P3] Leaderboard submit is silent.** `submitScore()` is fire-and-forget; players
  with a name but no wallet never know if their run registered. A tiny toast on POST
  success/failure would close the loop.
- **[P3] Score clamp not surfaced.** Server clamps to 500k (`route.ts`); client
  `scoreOf()` is unbounded. Long Cursed runs could show a higher local score than
  what persisted — show "capped for leaderboard" if `finalScore > 500000`.

---

## 3. Functionality & correctness

### Leaderboard & trust

- **[P1] Scores are client-trusted.** POST body carries `score`; wallet signature
  proves address ownership, not that a run occurred. Anyone can POST arbitrary
  scores with a name + deviceId. Label board as casual, add server-issued run
  tokens, or store replay hashes if competitive integrity matters. **Deferred** —
  needs real design.
- **[P3] Rankings ignore difficulty.** Hard (1.5×) and Cursed (2×) multiply locally
  but the board sorts raw `score`. **Deferred** — design session.
- **[P3] No score without name.** `die()` / `win()` only call `submitScore` when
  `name.trim()` — silent skip. Fine for privacy, but the leaderboard nudge appears
  only in the side panel; death screen doesn't prompt naming.

### Game state & edge cases

- **[P3] CAPY shield and fort shield share `run.fx.shield`.** **Partial fix `ca8efb4`**
  — both use `Math.max` so fort capture cannot shorten an active window. Still one
  timestamp + HUD/VFX split (hex barrier CAPY-only; fort shows text on other chars).
  Full split into `fx.capyShield` / `fx.fortShield` remains optional polish.
- **[P2] Boss pool contention (4 slots).** **Partial fix `ca8efb4`** — scheduled
  block bosses retry until spawn lands (`bossAtBlock` only stamped on success).
  Finale Nemesis still instant-spawns into the same pool; grow pool or reserve a
  finale slot if collisions persist in long runs.
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

| Item | Commit | Status |
| --- | --- | --- |
| Pause overlay (Esc/P) | `0c72ff6` | done |
| Global i-frames (0.4s) | `0c72ff6` | done |
| `whale` mob → `rug` | `0c72ff6` | done |
| T² scoring → linear time | `0c72ff6` | done |
| Planet freeze under modals | `0c72ff6` | done |
| Level-up time freeze | prior | done |
| `markedUntil` pool leak | prior | done |
| `openMenu` clears `capturedIds` | `0c72ff6` | done |
| SidePanel `upgradeView` | prior | done |
| Leaderboard rate limiting | `0c72ff6` | done |
| Vestigial `--accent` CSS token | `0c72ff6` | done |
| Fort shield `Math.max` (no shorten) | `ca8efb4` | partial |
| Boss spawn retry when pool full | `ca8efb4` | partial |
| Game-aware OG/metadata copy | `ca8efb4` | done |
| TouchPad safe-area insets | `ca8efb4` | done |

---

## Highest-leverage next (post-`ca8efb4`)

Design-tier items worth their own sessions:

1. **Mobile run ribbon** — capture count + current targets pinned over canvas on `max-md`
2. **Finale keyed to player power** — not "5 sites left" alone
3. **Boss telegraphs + attack patterns** — reuse `world.pending` for boss/finale spawns
4. **Site power balance** — break stat-site-first solved route
5. **Leaderboard integrity** — casual label, difficulty tabs, or run-token design
6. **Tutorialize site loop** — arrows → pad → power → final Nemesis
7. **Network links** on globe (orphan comment in `Planet.tsx`)
8. **WebGL / reduced-motion fallback**
9. **Explore vs game landing** — first-run flow now that metadata sells both
10. **Deep combat polish** — `pick()` validation, CAPY idle slash aim, secondary-DPS scaling (see `GROK-REVIEW-DEEP.md`)

Still owner-call: **`ninja_game/`** archive vs migrate dash/boss telegraph.

---

## Summary

Codex + GLM P1 fairness gaps and doc drift are largely closed (`0c72ff6`). Grok
quick wins landed (`ca8efb4`). What remains is **design work**, not emergency fixes:
mobile run ergonomics, finale/boss drama, site-capture game theory, competitive
score trust, and the unfinished explore cinematic. See **`GROK-REVIEW-DEEP.md`** for
formulas, security model, perf hotspots, and the full finding register.