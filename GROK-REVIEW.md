# x1.world — Review (Grok, 2026-07-04)

> Read-only audit. No code was changed. Findings are suggestions to evaluate, not
> commands. Cross-check `GLM-REVIEW.md` and `CODEX-REVIEW.md` for overlapping
> items — this file focuses on fresh synthesis and what still matters after recent
> fixes (pause, i-frames, rug rename, linear scoring, doc updates).
>
> Priority: **P1** = correctness / player-hostile · **P2** = balance / juice ·
> **P3** = consistency / polish · **P4** = docs / tooling

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
  (survivors), not explore. The original vision was "spin the planet for 20 seconds
  before reading a word." Today a new visitor lands in character select. That may
  be the right conversion bet — but the explore journey (arrival drift, guided
  tour, horizon pullback) is largely unbuilt. Decide explicitly which mode is the
  hero and align OG copy, metadata, and first-run onboarding to match.
- **[P3] No arrival cinematic or guided tour.** `CONCEPT.md` Phase 4 items
  (intro title beat, "take the tour" auto-walk, whole-planet finale) never shipped.
  Even a lightweight 3-beat overlay ("walk → discover → play") would close the gap
  without GSAP/Lenis.
- **[P3] Fan-made disclaimer is buried.** `CONCEPT.md` and `X1-FACTS.md` ask for a
  persistent footer note on the experience itself; it only appears in
  `Directory.tsx`. Add a subtle line under the wordmark or in the explore panel
  header.
- **[P3] OG / metadata under-sells the game.** `app/layout.tsx` describes explore
  only. Social previews won't mention survivors, characters, or leaderboard —
  missed share hook for the default experience.

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
- **[P3] Touch joystick lacks safe-area insets.** `TouchPad` is `bottom-4 right-4`
  with no `env(safe-area-inset-*)` — iOS home indicator can overlap the stick.
  Capture toasts offset to `bottom-40` to avoid it, but the stick itself doesn't.
- **[P3] "Game" tab label when already exploring.** Clicking 🥷 game while in
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
- **[P3] Profile avatar is always 🥷.** `ProfileCard` ignores selected character —
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
  tokens, or store replay hashes if competitive integrity matters.
- **[P3] Rankings ignore difficulty.** Hard (1.5×) and Cursed (2×) multiply locally
  but the board sorts raw `score`. A Cursed 40k beats Normal 50k in skill but not
  on the board. Filter tabs or normalized score (`score / diffMult`) would fix
  perceived fairness.
- **[P3] No score without name.** `die()` / `win()` only call `submitScore` when
  `name.trim()` — silent skip. Fine for privacy, but the leaderboard nudge appears
  only in the side panel; death screen doesn't prompt naming.

### Game state & edge cases

- **[P3] CAPY shield and fort shield share `run.fx.shield`.** Validator Shield
  (2.5s / 10s cycle) and `explorerFort` (+8s shield) both write the same timestamp.
  Capturing a fort during CAPY's immune window could accidentally shorten or extend
  the wrong effect. Split into `fx.capyShield` and `fx.fortShield`, or take max
  with distinct VFX.
- **[P2] Boss pool starvation still possible.** `TYPE_RANGES.boss = [52,56]` — four
  slots. Mid-run bosses every 5 blocks plus finale Nemesis can collide; `spawnEnemy`
  returns `undefined` silently. Grow pool, reserve finale slot, or queue boss spawns.
- **[P3] Enemy pool exhaustion is silent.** Goblin pool = 26; when full, spawns
  silently fail. At least HUD feedback ("horde at capacity") or soft cap scaling.

### Win condition & data coupling

- **[P2] Win target = live `regions.length` (~55).** Deferred in GLM as "constant per
  deploy," but still means: every new project lengthens wins; offline sites shrink
  the target. Product identity says "capture the ecosystem" — consider a fixed
  `WIN_SITES = min(40, regions.length)` or "featured 30" subset so balance doesn't
  drift with `projects.json` edits.
- **[P3] Instant win edge case.** If final boss dies after last capture in the same
  frame, `win()` fires from boss death handler. If player captures last site while
  final boss is alive, they must kill it — good. But if `bridgePortal` clears the
  screen and last site is captured during chaos, ensure `finalBossAlive` state stays
  coherent (currently OK, worth regression test).

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
  of `scoreOf()`. At ~55 captures × 50 = 2750 from sites alone, plus time/kills,
  wins cluster high. Death runs with 40+ captures but no win feel disproportionately
  weak. Consider scaling bonus by `captured/total` or difficulty.
- **[P2] Linear time term still rewards stalling slightly.** `T * 40` in `scoreOf()`
  (cap 600s) is much healthier than T², but pure survival still adds up to 240 pts
  from time alone. VS typically makes time a tiebreaker, not a strategy. Could drop
  time to a flat "survived 10 min" milestone bonus.
- **[P2] Optimal site order is solved.** Permanent-stat sites (`validatorTower`,
  `chartBeacon`, `dexGate`, `gameArcade`) are always correct early; `bridgePortal`
  is a free screen-clear when dense; `socialBeacon` heal is reactive. Experienced
  players will always priotize stat sites → boring routing. Mitigations: randomize
  power magnitudes per run, diminishing returns on duplicate category captures, or
  scale enemy pressure with `perm` stacks.

### Difficulty & characters

- **[P2] THEO's 4th upgrade choice is a major advantage.** `choices: 4` on a
  fragile (0.8 HP) character is strong — more access to evolutions, more agency.
  Monitor win rates; if THEO dominates, tie extra choice to a downside (e.g. −5% HP
  per character level).
- **[P2] Jack's AOE coins vs CAPY melee vs Ninja pierce.** Jack's `xcoin` explosions
  trivialize dense packs; CAPY needs to wade in. Character balance may need enemy
  HP scaling per character or Jack cooldown tax in Hard/Cursed.
- **[P3] Cursed starts below Normal HP.** `statMult 0.7` × character HP — intentional,
  but combined with no vitality pick can feel brutal in first 60s. Consider one
  free heal on Cursed start or guaranteed heal site in first 3 spawns.
- **[P3] Hard mode (20s blocks) spikes faster than Normal (30s).** 1.5× score mult
  may not compensate for density jump — playtest target times for win vs death.

### Finale & bosses

- **[P2] Finale triggers at "5 sites remaining," not player power.** Slow players
  fight a 2.5× HP Nemesis while weak; speedrunners fight it while godlike. Key
  finale to `run.block`, `run.level`, or `captured/total` ratio for consistent drama.
- **[P2] Mid-run bosses lack attack patterns.** Spawn telegraph is good; whale GLB and
  Nemesis don't have windup/charge tells like `ninja_game/` had. Final Nemesis gets
  multipliers but same AI — anticlimactic if player is already overpowered.
- **[P3] Boss loot unclear.** Boss kills drop gems but no distinct "boss chest" moment
  — missed juice for the Bear Market every-5-blocks beat.

### Build diversity

- **[P2] Wave-2 weapons from `GAME-DESIGN.md` not shipped** — Caltrops, Shadow Clone,
  Grapple Dash, rare modifiers, in-run drops. Current pool is deep enough for MVP,
  but doc still describes aspirational content. Either ticket wave-2 or trim the doc.
- **[P3] `multishot` on CAPY is "Wider Cleave"** — good flavor remap, but evolution
  `Bladestorm` on CAPY becomes "Validator Sweep" while mechanics still spawn shuriken
  nova projectiles. Ensure VFX reads as cleave, not stars, for CAPY evos.

### Meta / replay

- **[P2] No daily seed or weekly modifier.** Leaderboard + inscription reward repeat
  play, but runs feel samey once optimal site order is known. A rotating weekly
  mutator (e.g. "Gas fees 2×") would freshen game theory without new weapons.
- **[P3] Best score is local only + global board.** No per-character or per-difficulty
  personal bests in `localStorage` — missed granularity for build enthusiasts.

---

## 5. Doc & tooling drift (P4)

Still stale or split across three audits:

| Doc | Issue |
| --- | --- |
| `BUILD-PLAN.md` | Stub file names (`Globe.tsx`, `Card.tsx`), gsap/lenis "installed," explore-only phases |
| `GAME-DESIGN.md` | Wave-1 items still tagged "(wave 1)" though shipped; wave-2 items not in code |
| `CONCEPT.md` | Says 29 projects; `projects.json` has 55 |
| `DESIGN.md` | Scroll/Lenis motion language unused; WebGL fallback unbuilt |
| `ninja_game/` | Parallel tuning reference — archive or delete to stop confusion |

`README.md` and `CLAUDE.md` were updated 2026-07-04 and are now largely accurate.

---

## 6. Recently fixed (verify, don't regress)

These were open in `GLM-REVIEW.md` and appear resolved in the current tree:

| Item | Status |
| --- | --- |
| Pause overlay (Esc/P) | ✅ `gameStore.pause`, `GameHUD` pause screen |
| Global i-frames (0.4s) | ✅ `run.lastHitAt` gate in contact damage |
| `whale` mob → `rug` | ✅ `ENEMY_TYPES.rug`, RugMob |
| T² scoring | ✅ linear `T * 40` |
| Planet freeze under modals | ✅ `Planet.tsx` zeros velocity when not explore/play |
| Level-up time freeze | ✅ `GameLayer` returns early when `mode !== "play"` |
| `markedUntil` pool leak | ✅ reset in `spawnEnemy` |
| `openMenu` clears `capturedIds` | ✅ |
| SidePanel `upgradeView` | ✅ owned upgrade list |
| Leaderboard rate limiting | ✅ per-IP in `route.ts` |
| Vestigial `--accent` CSS token | ✅ removed from `globals.css` |

---

## Highest-leverage recommendations

If you only do ten things:

1. **Decide explore vs game as the landing hero** — align metadata, OG, and first-run
   flow to that choice.
2. **Mobile run HUD** — keep capture targets visible without scrolling the side panel.
3. **Tutorialize the site loop** — arrows → step on pad → power toast → final boss.
4. **Boss pool / finale tuning** — dedicated finale slot; key difficulty to player power.
5. **Site power balance** — break the "stat sites first, bridge nuke later" solved route.
6. **Leaderboard integrity** — label casual, separate by difficulty, or verify runs.
7. **Restore network links** on the globe for the signature ecosystem screenshot.
8. **WebGL / reduced-motion fallback** — poster + directory still readable.
9. **Reconcile `GAME-DESIGN.md`** with shipped wave-1 and ticket wave-2 separately.
10. **Archive `ninja_game/`** or mine its boss telegraph + dash for the 3D game.

---

## Summary

The bones are excellent: a distinctive "marketing site you can win," strong evolution
design, and real ecosystem data driving both exploration and combat. The biggest
gaps are **mobile ergonomics during runs**, **strategic depth of site captures**,
**finale/boss pacing**, and **competitive score trust** — plus the unfinished
explore cinematic from the original concept. Most issues are polish and game-theory
tuning, not architectural rewrites.