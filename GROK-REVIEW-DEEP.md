# x1.world — Deep Audit (Grok, 2026-07-04)

> Companion to **`GROK-REVIEW.md`**. Formulas, security model, performance budget,
> mode machine, asset pipeline, and a numbered finding register. Cross-check
> `GLM-REVIEW.md` and `CODEX-REVIEW.md`.
>
> **Processed:** `0c72ff6` (Codex + GLM), `ca8efb4` (Grok quick wins). Status
> column on each finding reflects post-commit state.

---

## Appendix A — Combat formulas

### Per-run scaling (`GameLayer.tsx`)

| System | Formula |
| --- | --- |
| Block | `floor(run.t / blockSeconds)` — Normal/Cursed 30s, Hard 20s |
| Enemy HP | `baseHp × (1 + block × 0.1)` |
| Enemy speed | `baseSpeed × min(1.6, 1 + block × 0.02)` |
| Spawn interval | `max(0.25, 1.25 × 0.9^block / enemyMult)` |
| Spawn batch | `1 + floor(block / 3)` per tick |

### Derived stats (`lib/gameStore.ts`)

| Function | Formula |
| --- | --- |
| `shurikenDamage()` | `(10 + 6×damageLv) × (1 + min(1.5, 0.1×perm.dmg)) × char.dmg` |
| `fireCooldown()` | `max(0.15, 0.55×char.cooldown × 0.88^firerate × 0.94^perm.rate)` |
| `magnetAngle()` | `min(1.1, 0.15×(1 + 0.6×magnetLv) × (1 + 0.08×perm.magnet))` rad |
| `currentSpeedMult()` | `(1 + 0.1×speedLv) × (1 + min(0.4, 0.05×perm.speed)) × diff.statMult × char.speed × finalStand` |
| `armorMult()` | `max(0.15, 1 - 0.08×armorLv - char.armor)` |
| `lifestealPct()` | `0.03 × lifestealLv` |
| `regenRate()` | `0.8 × regenLv` hp/s |
| `critChance()` | `0.08 × critLv` |
| `xpMult()` | `(1 + 0.1×perm.xp) × char.xp` |
| `haloAngle()` | `(0.16 + 0.03×haloLv) × (meltdown ? 1.6 : 1)` |

**Note:** Cursed `statMult` (0.7) applies to HP/speed via `resetRun` / `currentSpeedMult`, not to `shurikenDamage()` — COMBAT-06.

### Secondary damage (flat — does not use `shurikenDamage()`)

| Source | DPS / hit | Location |
| --- | --- | --- |
| Ion Halo | `(10 + 6×haloLv) × dt` | `GameLayer.tsx` contact loop |
| Arc Node | `16 + 7×arcLv` per pulse | arc strike |
| Katana orbit | `70` or `150` (Tempest) × dt | katana loop |
| Whirlwind wake | `45 × dt` | wake trail |
| CAPY slash | `shurikenDamage() × 2.2` | slash arc |

### XP, score, contact

| System | Formula |
| --- | --- |
| XP next level | `8 + (level - 1) × 7` |
| Score | `(min(t,600)×40 + kills×40 + damage/2)/100 + captured×50` × diffMult |
| Win bonus | `+1000` flat on `win()` |
| Contact bite | `enemy.dmg × 0.8 × armorMult()`; per-enemy bite CD 1.0s; global i-frame 0.4s |

---

## Appendix B — Spawn and boss lifecycle

```
Regular mob ──► world.pending (0.7s ring) ──► spawnEnemy
Block % 5 boss ──► spawnEnemy INSTANT (retry if pool full since ca8efb4)
Finale (5 sites left) ──► spawnEnemy INSTANT + 2.5× HP Nemesis
Boss pool: slots 52–56 only (4 total)
```

| Event | Telegraph? | Status |
| --- | --- | --- |
| Regular mob | 0.7s red ring | shipped |
| Pending pool full (12 slots) | instant bypass | COMBAT-08 open |
| Block % 5 boss | none | COMBAT-01 open |
| Finale Nemesis | nameplate only | COMBAT-01 open |
| Gremlin lunge | speed wobble | partial |

**Partial fix `ca8efb4`:** `bossAtBlock` stamped only when `spawnEnemy("boss")` succeeds; retries next frame instead of skipping the block forever.

---

## Appendix C — Site powers and routing

| `LandmarkKind` | Effect | Permanent? | Cap / note |
| --- | --- | --- | --- |
| `validatorTower` | `perm.speed++` | yes | +5% speed, cap +40% total |
| `chartBeacon` | `perm.rate++` | yes | ~6% faster fire |
| `dexGate` | `perm.dmg++` | yes | +10% dmg, cap +150% |
| `gameArcade` | `perm.xp++` | yes | +10% XP |
| `explorerFort` | +15 HP, 8s shield | shield timed | `Math.max` on `fx.shield` since `ca8efb4` |
| `socialBeacon` | +35 HP heal | no | reactive |
| `oracleShrine` | `perm.magnet++`, vacuum gems | yes | full magnet flag on gems |
| `bridgePortal` | kill non-boss in 0.55 rad | no | always optimal when screen full |

**Game theory:** optimal route = stat sites early, save bridge nuke for dense waves. Active sites: 3 at a time, respawn 2.5s. Capture angle: 0.12 rad (tighter than explore `NEAR_ANGLE` 0.28).

---

## Appendix D — Character weapon matrix

| Character | Weapon | Key combat paths |
| --- | --- | --- |
| Ninja | shuriken, pierce 2 | default projectile loop, aim assist |
| Jack | xcoin AOE | `explodeXCoin` radius 0.26 rad; TTL detonation on miss |
| THEO | pulse chain | no facing gate; scan mark +50% dmg; 4 level-up choices |
| CAPY | slash + shield | 2.5s immune / 10s cycle; wider cleave per multishot level |

**Asset note:** only procedural ninja animates arms/scarf; GLB chars get bob/yaw only (`CharacterBody.tsx` loads all 4 GLBs unconditionally — PERF-02).

---

## Appendix E — API trust model

```
Client POST: score, name, diff, deviceId [, wallet, ts, nonce, sig]
Server:      clamp score ≤ 500k; verify sig → verified boolean ONLY
             upsert if score beats personal best
```

| Proves | Does not prove |
| --- | --- |
| Wallet controls key (if sig valid) | Run actually happened |
| Nonce freshness (5 min HMAC) | POST score matches signed score |
| Device identity (guest) | Guest deviceId is secret |

**Open (SEC-01):** scores client-trusted — deferred, needs run-token design.

**Open (SEC-03):** `lib/nonce.ts` HMAC falls back to `"dev-secret"` if env missing.

**Fixed `0c72ff6`:** POST 12/min, DELETE 5/min per IP → 429.

---

## Appendix F — Performance budget

| Mode | Hot path | Concern |
| --- | --- | --- |
| Explore | ~55 `RegionSite` × `useFrame` + shadows + `pointLight` | High (PERF-01) |
| Explore | Dual `Stars` + Bloom + triple sphere shell | Medium |
| Play | `GameLayer` O(n²) separation + `syncMeshes` | Medium |
| Play | 3 active sites only | Low (good) |
| Play | `GasWisp` `useFrame` when invisible | Medium (PERF-03) |
| All | 4 GLBs loaded per `CharacterBody` mount | Medium (PERF-02) |

**Quality preset ideas (audit only):** instanced landmarks, lazy GLB per char, gate GasWisp on visibility, lower sphere segments on `LOW_GPU`, skip composer on mobile.

---

## Appendix G — Mode state machine

States: `explore | menu | play | paused | levelup | dead | won`

| Transition | Trigger | Planet sim | Combat sim | `run.t` |
| --- | --- | --- | --- | --- |
| → menu | game tab from explore | frozen if modal | cleared | — |
| → play | `start()` | input on | full | advances |
| → paused | Esc/P | velocity 0 | frozen | frozen |
| → levelup | XP threshold | velocity 0 | frozen | frozen |
| → dead/won | hp≤0 / win | velocity 0 | cleared | — |
| → explore | `quit()` | input on | cleared | — |

**Quirk:** `quit()` does not reset planet rotation or always clear all run UI state paths — low impact.

Default landing: `menu` (game-first), not `explore`.

---

## Appendix H — Asset pipeline

```
projects.json (55 entries)
    → lib/regions.ts (Fibonacci placement, live filter via site-status.json)
    → scripts/check-sites.js (Playwright → PNG + status)
    → scripts/gen-screenshots.js (SVG placeholders — accent palette still has #a78bfa, UX-04)
public/models/*.glb ← scripts/smooth-model.mjs, strip-models.mjs, pose-bake.mjs (no single doc)
```

No automated test suite (`package.json`: lint + build only).

---

## Appendix I — Finding register

Status: **open** | **partial** | **fixed** | **deferred**

### Combat

| ID | P | Finding | Status |
| --- | --- | --- | --- |
| COMBAT-01 | P1 | Boss/finale spawns skip 0.7s telegraph | open |
| COMBAT-02 | P1 | Shield HUD shows for all chars; hex VFX CAPY-only | open |
| COMBAT-03 | P1 | CAPY slash aim stale when idle | open |
| COMBAT-04 | P1 | `pick()` no validation against `choices` | open |
| COMBAT-05 | P2 | Halo/arc/katana/wake ignore damage upgrades | open |
| COMBAT-06 | P2 | Cursed statMult not applied to outgoing damage | open |
| COMBAT-07 | P2 | Evolution queue: first ready evo only | open |
| COMBAT-08 | P2 | Pending pool overflow → instant spawn | open |
| COMBAT-09 | P3 | `sfx.boss()` when spawn fails | open |
| COMBAT-10 | P3 | Dead `run.fx.speed/dmg/rate/xp` fields | open |

### Security

| ID | P | Finding | Status |
| --- | --- | --- | --- |
| SEC-01 | P1 | Client-trusted scores | deferred |
| SEC-02 | P1 | Wallet squatting without sig | open |
| SEC-03 | P1 | Nonce HMAC `"dev-secret"` fallback | open |
| SEC-04 | P2 | Nonce GET unrate-limited | open |
| SEC-05 | P2 | HMAC secret = service-role key | open |
| SEC-06 | P2 | No wallet accountChanged sync | open |
| SEC-07 | P2 | Guest DELETE deviceId-only | open |

### Performance

| ID | P | Finding | Status |
| --- | --- | --- | --- |
| PERF-01 | P2 | 55 RegionSite useFrame + lights | open |
| PERF-02 | P2 | All GLBs load per CharacterBody | open |
| PERF-03 | P2 | GasWisp useFrame when invisible | open |
| PERF-04 | P3 | Arc TubeGeometry dispose/recreate | open |
| PERF-05 | P3 | Unbounded site label texture cache | open |

### UX / mobile

| ID | P | Finding | Status |
| --- | --- | --- | --- |
| UX-01 | P1 | Mobile inscribe/connect split across panes | open |
| UX-02 | P2 | viewBoard → openMenu() confuses flow | open |
| UX-03 | P2 | Explore panel hardcodes "online" | open |
| UX-04 | P3 | gen-screenshots.js violet accent drift | open |

### Processed in commits (not in register above)

| Item | Commit | Status |
| --- | --- | --- |
| Pause Esc/P | `0c72ff6` | fixed |
| Global i-frames | `0c72ff6` | fixed |
| Planet freeze modals | `0c72ff6` | fixed |
| Linear scoring | `0c72ff6` | fixed |
| rug rename | `0c72ff6` | fixed |
| Leaderboard rate limit | `0c72ff6` | fixed |
| Fort shield Math.max | `ca8efb4` | partial |
| Boss spawn retry | `ca8efb4` | partial |
| OG/metadata game copy | `ca8efb4` | fixed |
| TouchPad safe-area | `ca8efb4` | fixed |
| Win target decoupling | — | deferred |
| Run-token anti-cheat | — | deferred |
| ninja_game archive | — | deferred |
| Finale player-power key | — | deferred |
| Difficulty rankings | — | deferred |
| Music bed | — | deferred |
| Daily seed / mutator | — | deferred |
| Mobile run ribbon | — | deferred |

---

## Appendix J — Cross-audit reconciliation

| Topic | GLM | CODEX | GROK | Post-commit |
| --- | --- | --- | --- | --- |
| Pause | P1 open | #4 levelup drift | fixed | `0c72ff6` |
| I-frames | P1 open | — | fixed | `0c72ff6` |
| T² scoring | P2 open | — | fixed | `0c72ff6` |
| whale→rug | P2 open | — | fixed | `0c72ff6` |
| markedUntil leak | — | #3 open | fixed | prior |
| Planet modal drift | — | #4 open | fixed | `0c72ff6` |
| SidePanel upgradeView | — | #6 open | fixed | prior |
| openMenu capturedIds | — | #7 open | fixed | `0c72ff6` |
| Leaderboard res.ok | — | #2 open | fixed | prior + rate limit |
| Esc confirm leak | — | #8 open | fixed | pause rework |
| Client-trusted scores | — | #1 open | deferred | — |
| Boss pool starvation | P2 open | — | partial | retry `ca8efb4` |
| CAPY/fort shield | P3 open | — | partial | Math.max `ca8efb4` |
| Win target = regions.length | deferred | — | deferred | — |
| NetworkLinks missing | — | — | open | — |
| Boss telegraph gap | — | — | open | deep pass |
| pick() validation | — | — | open | deep pass |

---

## Highest-value deep fixes (ordered)

1. COMBAT-01 — boss/finale through `world.pending` telegraph
2. UX-01 — wallet connect on death/win overlay (mobile)
3. SEC-01 / SEC-03 — label casual board + fail-closed nonce secret
4. COMBAT-04 — validate `pick(id)` against `choices`
5. PERF-01 — instanced landmarks or merged draw calls
6. COMBAT-05 — unified `playerDps()` for secondary sources
7. Mobile run ribbon (design session)
8. Finale player-power scaling (design session)

---

## Loop resolution log — Opus 4.8 (through `a557d96`)

Worked the register in priority batches. Status deltas:

**Combat**
- COMBAT-08 ✅ fixed (`c57e3ec`) — telegraph hatch retries on full pool; pending 12→40.
- COMBAT-04 ✅ fixed — `pick(id)` no-ops unless `id ∈ choices` and mode is `levelup`.
- COMBAT-02 ✅ fixed — hex shield VFX renders for ANY character with `fx.shield` (fort shield), not CAPY-only.
- COMBAT-03 ✅ fixed — idle CAPY cleaves toward the nearest enemy, not a stale heading.
- COMBAT-06 ✅ fixed — `shurikenDamage()` ×`statMult`, so Cursed weakens outgoing damage (mode is properly harder).
- COMBAT-07 ✅ fixed — `rollChoices()` surfaces every ready evolution, not just the first.
- COMBAT-09 ✅ verified already correct (`sfx.boss` guarded by `if (boss)`).
- COMBAT-10 ✅ fixed — dead `run.fx.speed/dmg/rate/xp` removed (only `shield` remains).
- COMBAT-01 ↩ by design — bosses/finale keep the full-screen **nameplate** telegraph (a stronger tell than the mob ground-ring); not routed through `world.pending`.
- COMBAT-05 ↩ deferred by owner balance guardrail — buffing secondary weapons to scale with damage upgrades makes the game *easier*; kept flat intentionally.

**Security** (`35c7988`)
- SEC-02 ✅ fixed — unsigned wallet POSTs stored as guest (device) entries; unverified wallet address never persisted → no squatting.
- SEC-03 ✅ fixed — nonce fails closed in production (no public `dev-secret`).
- SEC-04 ✅ fixed — nonce GET rate-limited 30/min per IP.
- SEC-05 ✅ fixed — HMAC uses a *derived* key, not the raw service-role key.
- SEC-01 ↩ deferred (client-trusted scores — needs run-token design).
- SEC-06 ↩ open (wallet accountChanged sync). SEC-07 ↩ accepted as designed.

**Performance** (`a557d96`)
- PERF-03 ✅ fixed — GasWisp skips its loop while dead/off-screen (ancestor visibility).
- PERF-05 ✅ fixed — site-label texture cache capped at 80 + evict.
- PERF-01 ⚠ partial — planet sphere shells 64/48→40/32 on `LOW_GPU` (`lib/quality.ts`); landmark instancing still deferred.
- PERF-02 ↩ deferred (lazy per-char GLB — Suspense risk given the prior invisible-character incident). PERF-04 ↩ deferred (low value).

**Owner touch** (`67cbc96`) — capture bonus flash: granted power flashes center-screen in bold display type on POI capture.

Still open for a design session: UX-01 (mobile wallet on end screens), UX-02/03/04, finale player-power scaling, mobile run ribbon, music bed, daily seed, `ninja_game/` archival, SEC-01 run tokens.