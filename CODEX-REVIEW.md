# Codex Review Findings

Date: 2026-07-04

Scope: post-loop whole-codebase audit after Fable commits `c57e3ec` through
`2f9071c`. This supersedes the earlier Codex review. Several previous findings
are now closed; only the items below should be treated as current Codex findings.

Verification:
- `npm run lint` passes.
- `npm run build` passes.
- `npm audit --omit=dev` still reports 5 moderate advisories through
  `next`/`postcss` and `@solana/web3.js`/`uuid`. Do not run the suggested
  `npm audit fix --force`; it proposes breaking downgrades.

## Must Fix

1. **Final boss can still be bypassed if the boss pool is full**
   - `components/game/GameLayer.tsx:417` finds a free boss slot from the fixed
     boss range.
   - `components/game/GameLayer.tsx:426` returns `undefined` when no slot is
     free.
   - `components/game/GameLayer.tsx:1646` attempts the final boss once when 5
     sites remain.
   - `components/game/GameLayer.tsx:1660` still wins when all sites are captured
     and `run.finalBossAlive` is false.
   - Impact: if all boss slots are occupied at the last capture, the run can
     complete without the final Nemesis ever spawning.
   - Recommendation: reserve/replace a boss slot for the finale, or block
     victory until the final boss has successfully spawned and then died.

2. **Supabase read failure can overwrite a personal best**
   - `app/api/leaderboard/route.ts:105` reads the current score.
   - `app/api/leaderboard/route.ts:106` treats `!cur.ok` as an empty row set.
   - `app/api/leaderboard/route.ts:107` then allows an upsert.
   - Impact: a transient read failure can downgrade a player's best if the
     following upsert succeeds.
   - Recommendation: return 503/500 when the best-score read fails, or enforce
     best-only writes inside a database function/constraint.

3. **Explore tab still abandons active runs immediately**
   - `components/ui/Overlay.tsx:66` calls `quit()` directly whenever mode is not
     `explore`.
   - Impact: Esc/P now pause safely, but clicking the Explore tab during
     `play` or `paused` bypasses the new abandon-run flow.
   - Recommendation: hide the Explore tab during a run, or route it through the
     pause overlay instead of quitting.

## Should Fix

4. **Pending-spawn overflow can still fall back to instant spawns**
   - `components/game/GameLayer.tsx:254` grows the pending warning pool to 40.
   - `components/game/GameLayer.tsx:1152` still falls back when all pending
     warning slots are active.
   - `components/game/GameLayer.tsx:1153` then calls `spawnEnemy(type)` without
     a warning ring.
   - Impact: the main hatch retry is fixed, but extremely dense waves can still
     skip telegraphing once the pending pool itself is saturated.
   - Recommendation: enqueue overflow spawns, grow the pool dynamically, or
     defer `world.spawnAt` until a pending slot frees.

5. **Character placement config is still incomplete**
   - `lib/characters.ts:31` defines `model.lift`.
   - `components/three/CharacterBody.tsx:286` only reads model sizes.
   - CAPY, THEO, and Jack placement still depends on local hardcoded offsets
     rather than a single transform contract.
   - Recommendation: support per-character `size`, `lift`, `rotation`, and
     preview framing from the registry, then screenshot-verify run + select
     screens for every character.

6. **Directory sorting remains mouse-only**
   - `components/ui/Directory.tsx:82` uses clickable `<th>` elements for sort.
   - Impact: keyboard and assistive-tech users cannot operate or understand the
     sort state.
   - Recommendation: put real `<button>` controls inside sortable headers and
     expose `aria-sort`.

7. **Placeholder screenshot palette can reintroduce retired violet**
   - `lib/regions.ts:139` correctly uses the live non-violet accent set.
   - `scripts/gen-screenshots.js:20` still includes `#a78bfa`.
   - Impact: regenerating placeholder project images can bring back the old
     color language.
   - Recommendation: sync the script's `ACCENTS` array with `lib/regions.ts`.

## Residual Security Notes

8. **Leaderboard score remains client-trusted by design**
   - `app/api/leaderboard/route.ts:78` accepts the client-submitted score and
     clamps it to 500,000.
   - Wallet signatures prove wallet ownership, not that the run happened.
   - This remains a design-session item: server-issued run tokens, replay
     validation, or another anti-cheat approach would be needed for a serious
     competitive board.

9. **Rate limiting is still best-effort**
   - `lib/ratelimit.ts:2` documents the limiter as per-instance.
   - `lib/ratelimit.ts:9` keys from forwarded IP headers.
   - This is acceptable for casual spam control, but not strong abuse
     prevention across distributed/serverless instances.

10. **Dependency advisories need normal upstream upgrades**
    - `npm audit --omit=dev` reports moderate transitive advisories from
      `next` and `@solana/web3.js`.
    - The automated force fix is unsafe because it suggests breaking downgrades.
      Track normal upstream releases instead.

## Confirmed Fixed Since Earlier Codex Review

- Wallet squatting is closed: unsigned wallet claims become guest entries and
  do not persist/display the wallet address.
- Nonces fail closed in production when the secret is missing, use a derived
  HMAC key, and the nonce endpoint is rate-limited.
- Supabase write/delete responses check `res.ok`.
- THEO scan mark is reset on enemy pool reuse.
- Planet freezes under pause, level-up, death, win, and menu modals.
- Esc/P pause behavior replaced the old instant-quit path.
- Pending warning rings now retry hatching until an enemy slot frees.
- The pending pool grew from 12 to 40.
- `pick()` ignores upgrade IDs that were not offered this level-up.
- Ready evolutions are always offered.
- Cursed `statMult` now weakens outgoing primary/slash damage.
- Fort-capture shields render for any character with an active shield.
- Idle CAPY cleaves toward the nearest enemy.
- SidePanel owned upgrades use `upgradeView()`, and the weapon footer is
  neutral.
- Opening the game menu clears stale captured-site state.
- Mobile level-up overlay and touch joystick have safe-area handling.
- Mobile GPU load is reduced through shared `LOW_GPU` quality settings.
- Runtime region accents no longer cycle retired violet.
- Capture bonus flash landed as a center-screen reward beat.
