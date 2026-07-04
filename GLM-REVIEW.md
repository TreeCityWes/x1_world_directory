# x1.world — Design & Code Audit (GLM, 2026-07-04)

> Read-only review. **Do not "fix" anything in this file blindly** — each item
> is a finding to evaluate, not a command. Some "bugs" are intentional design.
> When you do act on one, delete or check it off here so this file stays a
> live punch-list, not a fossil like `HANDOFF.md` became.
>
> Priority legend: **P1** = correctness/player-hostile · **P2** = balance/juice
> · **P3** = consistency/polish · **P4** = doc drift (cheap to fix, high value).

---

## What's actually in the repo (scope check)

There are **three** things here, and the docs only acknowledge one:

1. **3D explore experience** (Next.js + R3F) — the original `CONCEPT.md` vision. Ships.
2. **Embedded 3D "X1 Ninja Survivors"** (`components/game/*`, `lib/gameStore.ts`,
   `lib/characters.ts`) — a Vampire-Survivors loop welded onto the globe. Ships.
   **Not mentioned in README or CLAUDE.md.**
3. **Standalone vanilla-JS "X1 Ninja Survivors"** (`ninja_game/`) — separate
   canvas game, separate enemy/upgrade rosters, separate tuning. **Not imported,
   linked, built, or referenced by the Next.js app.** Parallel prototype.

This split is the single biggest consistency problem. See §2.

---

## 1. Doc drift (P4 — cheap, high-value)

The docs describe a project that no longer exists. Almost every doc is stale.

- **`CLAUDE.md`** says *"The 3D scene is intentionally a placeholder stub
  (spinning blue sphere) — the real experience is still to be built."* Wildly
  false. A full explore experience **and** a full survivors game ship. Any agent
  onboarding from CLAUDE.md will misread the entire codebase.
- **`README.md` → "Where things live"** lists 6 files and omits the entire game:
  no `GameLayer`, `GameHUD`, `Mobs`, `Nemesis`, `characters.ts`, `gameStore.ts`,
  `leaderboard.ts`, `inscribe.ts`, `profile.ts`.
- **`BUILD-PLAN.md`** references files that don't exist: `Globe.tsx` (became
  `Planet.tsx`), `useControls.ts` (became `useKeyboard.ts`), `useLenis.ts`,
  `Card.tsx`. Its phased build order presents explore as the whole product.
- **`DESIGN.md` + `BUILD-PLAN.md`** list **gsap** and **lenis** as installed
  stack and describe "Lenis smooth scroll drives GSAP ScrollTrigger timelines."
  Neither is in `package.json`. Neither is imported anywhere (`grep` = 0 hits).
  The motion-language section is partly fiction.
- **`GAME-DESIGN.md`** describes a weapon roster that matches **neither**
  codebase cleanly:
  - Marks *Ion Halo* and *Arc Node* as "(wave 1)" implying not-shipped — both
    **are shipped** in `gameStore.UPGRADES` + `GameLayer`.
  - Marks wave-1 passives (Armor, Lifesteal, Regen, Crit) as "(wave 1)" — all
    shipped.
  - Describes **Caltrop Protocol, Shadow Clone, Grapple Dash, rare modifiers,
    in-run drop power-ups** (hearts, rage orbs, clover) — **none** are in the
    embedded game. The standalone `ninja_game/` *does* ship caltrops, a dash,
    smoke bomb. So the doc reads like an intended merge that never happened.
- **`HANDOFF.md`** lists open bugs that are **already fixed**:
  - `pick("vitality")` Cursed/statMult bug → fixed (incremental
    `run.maxHp += 25`, `gameStore.ts:372`).
  - `dealDamage` overkill tallied into score/lifesteal → fixed (clamped via
    `applied`, `GameLayer.ts:421`).
  - Esc quit confirm → shipped (double-press in `Overlay.tsx:33`).
  - `rollChoices()` returning `[]` → handled (`GameLayer.ts:1417`, pays heal + burst).
  - Also claims commit `eeb2686` rewrote the atmosphere shader to "proper
    per-fragment view-vector fresnel + smoothstep." **The current
    `Planet.tsx:34-55` does not contain that shader** — it's the older
    `dot(normal, +Z)` form with a clamp fix. Either reverted or never landed.
- **`HANDOFF.md`** says `components/three/NetworkLinks.tsx` is "mounted in
  `Planet.tsx`." The file **does not exist** (`glob` confirms); `Planet.tsx:354`
  has an orphan comment where it used to mount. Silent regression.
- **`DESIGN.md` palette** says *"No violet accent in the build — retired."* But
  `globals.css:15` still defines `--accent: #3b82f6` (vestigial, unused), **and**
  `lib/regions.ts:125` cycles project accents through
  `["#f0c75e", "#3b82f6", "#7dd3fc", "#a78bfa", "#4ade80", "#fb923c"]` — `#a78bfa`
  is violet and is actively assigned to ~1/6 of all project beacons. Violet *is*
  in the build, contradicting DESIGN.md + HANDOFF.md.
- **`ENEMY_TYPES.whale.color = "#a78bfa"`** (violet) — same retired-violet issue,
  applied to enemy gems and death bursts.

**Fix priority:** rewrite `CLAUDE.md` and README "Where things live" first
(onboarding surfaces); then reconcile `GAME-DESIGN.md`; then delete/footnote
gsap+lenis from DESIGN.md / BUILD-PLAN.md.

---

## 2. The two-games problem (P2 — strategic)

The `ninja_game/` folder and the embedded `components/game/` game share a name
and theme but are otherwise independent:

| | Embedded 3D game | Standalone `ninja_game/` |
|---|---|---|
| Engine | R3F / three | Canvas 2D, vanilla JS |
| Enemy roster | bug, gas wisp, rug, whale, nemesis | scam_bot, fud_ghost, rug_goblin, whale, bear_boss |
| Upgrades | damage/firerate/multishot/speed/magnet/vitality/katana/arcnode/halo/armor/lifesteal/regen/crit + 5 evolutions | shadow_clone, kunai_fan, katana_spin, smoke_bomb, grappling_dash, caltrops, swift_feet, iron_skin, magnet, burn_protocol |
| Tuning | `gameStore.ts` literals | `ninja_game/js/config.js` |
| Score | `(T² + kills·30 + dmg/2)/100 + cap·50` | `perSecond + perKill + perLevel` |
| i-frames | **none** | `contactInvuln: 0.4s` |
| Pause | **none** (Esc = quit) | yes (P / Esc overlay) |
| Dash | no | yes (Shift / double-tap) |
| Boss telegraph | none | windup + charge |
| Wallet / chain | yes (leaderboard + inscribe) | "deliberately out of scope" |

Decide: is `ninja_game/` a deprecated prototype (delete or move to `/legacy`),
or the reference implementation the 3D game should catch up to? Right now it's
in the repo earning its keep nowhere, and `GAME-DESIGN.md` reads like it's
trying to describe both at once.

**Recommendation:** pick one. If the 3D game is the product, archive
`ninja_game/` and migrate the practices it got right (pause, i-frames, dash,
boss telegraph — see §3).

---

## 3. Game mechanics & best practice (embedded 3D game)

### Genuinely well-designed — don't break these
- **Evolution system** (`UPGRADES` with `requires: [a,b]`, injected as a
  guaranteed golden card via `rollChoices`). Textbook VS design. `gameStore.ts:388-415`.
- **Per-character weapon flavor** (`UPGRADE_FLAVOR` remaps names/desc per
  character so CAPY never sees "throw more shurikens"). Cheap to extend.
  `gameStore.ts:104-127`.
- **Discrete bite cooldown** per enemy (1.0s) with 0.45s recoil — avoids the
  "standing in horde = instant melt" without armor-stacking. `GameLayer.ts:1038`.
- **Site-capture powers as in-run meta-progression** — explore content (real
  projects) doubles as the run's power-up pool. `KIND_BY_CATEGORY` is clean.
- **Final Stand** (speed +30% under 20% HP). `gameStore.ts:212`.
- **Aim-assist follows run direction** — rewards facing the fight.

### Problems

- **[P1] No pause.** Standalone game has one; 3D game doesn't. Esc is bound to
  *quit* (double-press confirm). Interruption = lost run. Most player-hostile
  gap. The double-press confirm is also undiscoverable — the toast only appears
  *after* the first press.
- **[P1] No global player i-frames.** `contactInvuln` exists in the standalone
  game (0.4s) but not here. With `MAX_ENEMIES = 56` and per-enemy bite cooldowns
  starting at 0, a fresh spawn wave landing on a stationary ninja can dump a
  dozen bites in one frame. Knockback (0.3s gate) saves you *most* of the time,
  but the failure mode is sudden unfair spike deaths. Add a global i-frame after
  any bite.
- **[P1] Win condition coupled to marketing data.** "Capture all N sites to
  win," N = `regions.length` = count of *live* projects in `projects.json`
  (~55, grows on every project addition, *shrinks* when sites go offline).
  Consequences:
    - Adding projects makes runs longer/harder for unrelated reasons.
    - A site going offline (via `scripts/check-sites.js`) silently lowers the
      win target — a player could "win" without visiting real projects.
    - Finale triggers at "5 sites remaining," so climax difficulty depends on
      how many projects exist.
  Decouple: fixed target count, fixed subset, or scale finale to player power.
- **[P2] Site power imbalance.** Permanent-stat sites
  (`validatorTower`/`chartBeacon`/`dexGate`/`gameArcade`) scale all run and are
  always correct; situational sites (`socialBeacon` heal, `explorerFort`
  shield) are sometimes right; `bridgePortal` is a free screen-clear nuke that's
  always better when the screen is full. Optimal play = "vacuum stat sites
  first, save the nuke for the finale," which makes runs feel samey.
- **[P2] Scoring rewards turtling.** `scoreOf() = (T² + kills·30 + dmg/2)/100 +
  captured·50`, T capped 600s. The `T²` term means running in circles avoiding
  everything scores quadratically with time. VS front-loads scoring on
  kills/objectives to avoid this. Drop the square.
- **[P2] Boss pool starvation.** `TYPE_RANGES.boss = [52,56]` = 4 slots. Bosses
  spawn every 5 blocks; the finale also uses the boss pool (`GameLayer.ts:1441`).
  If a scheduled boss block collides with a still-alive final boss,
  `spawnEnemy` silently returns `undefined`. Grow the pool, give the finale its
  own slot, or surface a "boss delayed" cue.
- **[P2] "Whale" the mob-type is a rug; "whale" the model is the boss.** Naming
  collision:
    - `ENEMY_TYPES.whale` (regular mob) renders as `RugMob` (`GameLayer.ts:1509`,
      the `else` branch) — a red carpet.
    - `MODEL_PATH.whale` (the GLB) is only used for the **boss** slot.
    - Boss `bossKind` alternates `"whale"` (GLB) and `"nemesis"` (`Nemesis` component).
    - Death bursts use `ENEMY_TYPES.whale.color = "#a78bfa"` (violet) for a red
      rug — color mismatch on every "whale" death.
    - `MODEL_PATH` / `TARGET_SIZE` entries for `goblin`/`gremlin`/`boss` point
      at GLBs that aren't loaded (Mobs.tsx is procedural). Dead code except whale.
  Rename the mob type or make the whale mob a small whale. Right now the code
  lies about what's on screen.
- **[P2] Finale tuning is a coin flip.** Final boss triggers at "5 sites
  remain." A slow player hits a 2.5× HP / 1.3× dmg / 1.15× speed Nemesis when
  already a god; a rusher hits the same Nemesis while weak. Key the finale to
  block count or power level, not captures.
- **[P3] Enemy pool fills silently.** Goblin pool = 26; on dense runs new spawns
  just stop returning from `spawnEnemy` with no feedback. At minimum, log it.

### Onboarding & UX
- First-run toast exists (`GameHUD.tsx:350`, localStorage-gated). Good.
- But there's no tutorial, and the controls hint only shows in *explore* mode
  (`Overlay.tsx:80`). A new player clicking "game" first sees character select
  + difficulty, then lands in the run with one toast. The site-capture loop
  (follow arrows, step on pads) isn't explained.
- `DEATH_FLAVOR` has 5 entries + sensible default. Fine.
- `killedBy` is only set on contact bites — the only damage source. Consistent.

---

## 4. Functionality / correctness

- **[P1] `regions.length` is live-filtered** (offline sites excluded at
  `lib/regions.ts:146`). Both the win target and the finale trigger key off
  this, so it mutates with the network. Use a stable count for game-critical math.
- **[P3] `POWER_LABEL` vs actual effect mismatch (`SidePanel.tsx:10`):**
  - `validatorTower → "+5% speed forever"` — accurate, but the +40% cap
    (`currentSpeedMult`) isn't shown.
  - `explorerFort → "+15 max hp & shield"` — doesn't mention the shield is
    **8 seconds** (`GameLayer.ts:470`).
- **[P3] Leaderboard env-var naming is fragile.** `route.ts:14` reads
  `NEXT_PUBLIC_x1_world_new_SUPABASE_URL` (auto-prefixed from the package name)
  with a fallback to `SUPABASE_URL`. Standard Supabase provisioning sets
  `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — the fallback saves you, but the
  primary name is surprising. Document or drop the prefix.
- **[P3] Score cap mismatch.** `scoreOf()` is unbounded; leaderboard POST clamps
  to 500,000 (`route.ts:74`). A long Cursed run (2× mult) can exceed 500k locally
  and be silently clamped server-side.
- **[P3] Cursed + vitality** is now correct (incremental), but reset applies
  Cursed's 0.7 — so Cursed CAPY starts at `100 × 0.7 × 1.35 = 94.5 → 95 HP`,
  *less* than a Normal ninja (100). Intended for Cursed; confirm the combo feels right.
- **[P3] `useGLTF.preload(MODEL_PATH.whale)` at module scope** + component
  `useGLTF` is fine, but only the whale GLB is used. Other three MODEL_PATH
  entries preload nothing and mislead.
- **[P3] `whaleGltf.scene.clone(true)` per boss slot** in `useMemo` — clones
  share geometry/material (good), but the "menace pass" (`GameLayer.ts:315-330`)
  calls `mergeVertices` + `material.clone()` per mesh per clone. Fine for 4
  slots; would not scale.
- **[P3] `world` singleton** is module-scoped, reset only when
  `mode === "play" && !world.started`. Planet never unmounts in practice; latent
  bug if the tree ever remounts.
- **[P4] Atmosphere shader vs HANDOFF claim** — covered in §1; functional, but
  the doc is wrong.
- **[P3] `x1.world` self-exemption** (`regions.ts:147`) — you own the domain,
  fine; note the "you are here" entry is forced live regardless of check-sites.

---

## 5. Smaller polish

- `globals.css` `--accent: #3b82f6` is vestigial (unused). Remove or rename to
  `--ocean-lit` (same value) to kill the ambiguity with retired "violet accent."
- Accent palette in `regions.ts` includes violet (`#a78bfa`) and orange
  (`#fb923c`) — both contradict DESIGN.md's "blues/space + gold CTA + cyan
  glow." ~1/6 of beacons render violet. Cycle through cyan/blue/gold/amber/green.
- The `mystery` 5th character has no unlock path in code — teaser. Document the
  roadmap or it reads as a bug.
- `BLOCK_SECONDS = 30` is exported in `gameStore.ts:139` but **never used** —
  actual block length comes from `DIFFICULTIES[diff].blockSeconds`. Dead export.
- `GAME-DESIGN.md` describes rare modifiers (Overclock, Dead Man's Switch,
  Overheal) and in-run drops (Hearts, Rage Orb, Blood Vial, Lucky Clover) —
  none shipped. Cut from the doc or ticket them.
- Explore-mode "guided tour" (`CONCEPT.md` "take the tour" button) was a Phase 4
  item; not shipped. Note as intentional cut or open item.
- **Verify `lib/sound.ts`** — referenced everywhere via `sfx.*`; this audit
  didn't read it. Confirm the embedded game's SFX actually exists and isn't stubbed.

---

## Highest-leverage fixes (if you do nothing else)

1. **Rewrite `CLAUDE.md` and README "Where things live"** to mention the game. (Onboarding.)
2. **Decide the fate of `ninja_game/`** — archive or commit. (Repo coherence.)
3. **Add a pause** to the embedded game. (Player-hostile without it.)
4. **Add a global player i-frame** after any bite. (Fairness.)
5. **Decouple the win target from `regions.length`.** (Correctness + balance.)
6. **Rename the `whale` mob type** or make it a whale; clean `MODEL_PATH` dead entries. (Code honesty.)
7. **Reconcile `HANDOFF.md`** — fixed bugs listed as open, atmosphere change claimed but absent, NetworkLinks gone. (Doc truth.)
8. **Drop the `T²` term from `scoreOf`** to stop rewarding circle-running. (Balance.)

The bones are strong — the evolution system, character flavor, and the "explore
projects as a survivors arena" hook are genuinely good design. The gaps are
almost all polish/fairness/doc-truth, not core loop.
