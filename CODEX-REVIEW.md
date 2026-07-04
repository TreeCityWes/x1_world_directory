# Codex Review Findings

Date: 2026-07-04

Scope: post-Fable whole-codebase audit after commits `0c72ff6` and `ca8efb4`.
This file replaces the older Codex review; several older findings are now fixed
and should not be reworked.

Verification:
- `npm run lint` passes.
- `npm run build` passes.
- `npm audit --omit=dev` reports 5 moderate advisories through
  `next`/`postcss` and `@solana/web3.js`/`uuid`. Do not blindly run the
  suggested `npm audit fix --force`; it proposes breaking downgrades.
- Existing local modification in `GROK-REVIEW.md` was present before this doc
  update and was left untouched.

## Must Fix

1. **Final boss can still be bypassed**
   - `components/game/GameLayer.tsx:409` returns `undefined` when the boss pool
     is full.
   - `components/game/GameLayer.tsx:1620` attempts the final boss once when 5
     sites remain.
   - `components/game/GameLayer.tsx:1634` then allows victory when all sites are
     captured and `run.finalBossAlive` is false.
   - Impact: if boss slots are full at the last capture, the player can win
     without fighting the final Nemesis.
   - Recommendation: reserve/replace a boss slot for the finale, or block
     victory until the final boss has successfully spawned and then died.

2. **Unverified requests can squat wallet leaderboard rows**
   - `app/api/leaderboard/route.ts:94` accepts any syntactically valid wallet.
   - `app/api/leaderboard/route.ts:100` sets `verified = false` when proof is
     missing or invalid, but still continues.
   - `app/api/leaderboard/route.ts:113` derives the member key from that wallet.
   - Impact: a client can submit a score/name for someone else's wallet row as
     an unverified entry.
   - Recommendation: only use `w:<wallet>` identity after a valid signature.
     When proof is missing or invalid, either reject the wallet field or fall
     back to `d:<deviceId>`.

3. **Supabase read failure can overwrite a personal best**
   - `app/api/leaderboard/route.ts:117` fetches the current score.
   - `app/api/leaderboard/route.ts:118` treats `!cur.ok` as an empty row set.
   - `app/api/leaderboard/route.ts:119` can then upsert a lower score.
   - Impact: a transient read failure can downgrade a player's best if the
     following upsert succeeds.
   - Recommendation: throw/return 503 when the best-score read fails, or move
     best-only enforcement into a database function/constraint.

4. **Explore tab still abandons active runs immediately**
   - `components/ui/Overlay.tsx:66` calls `quit()` directly whenever mode is not
     `explore`.
   - Impact: Esc/P now pause safely, but clicking the Explore tab during
     `play` or `paused` bypasses the new abandon-run flow.
   - Recommendation: hide the Explore tab during a run, or make it open/preserve
     the pause overlay instead of quitting.

## Should Fix

5. **Character placement config is still incomplete**
   - `lib/characters.ts:31` defines `model.lift`, but
     `components/three/CharacterBody.tsx:286` only reads model sizes.
   - CAPY, THEO, and Jack placement still depends on local hardcoded offsets and
     per-file comments instead of a single transform contract.
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
   - `lib/regions.ts:126` correctly retired violet from live accents.
   - `scripts/gen-screenshots.js:20` still includes `#a78bfa`.
   - Impact: regenerating placeholder project images can bring back the old
     color language.
   - Recommendation: sync the script's `ACCENTS` array with `lib/regions.ts`.

8. **Old review files can mislead future agents**
   - `CODEX-REVIEW.md` is now updated, but `GLM-REVIEW.md` and `GROK-REVIEW.md`
     still contain historical punch lists plus dispositions.
   - Recommendation: keep superseded banners/disposition tables clear so Fable
     does not re-fix already resolved items.

## Residual Security Notes

9. **Leaderboard score remains client-trusted by design**
   - `app/api/leaderboard/route.ts:95` accepts the client-submitted score and
     clamps it to 500,000.
   - Wallet signatures prove wallet ownership, not that the run happened.
   - This was deliberately deferred by Fable. Treat the leaderboard as casual
     unless/until server-issued run tokens, replay validation, or another
     anti-cheat design exists.

10. **Rate limiting is best-effort only**
    - `app/api/leaderboard/route.ts:24` documents the limiter as per-instance.
    - `app/api/leaderboard/route.ts:29` keys from forwarded IP headers.
    - This is fine for casual spam but not strong abuse prevention across
      distributed/serverless instances. Provider-level limits remain the real
      protection.

11. **Dependency advisories need normal upgrade handling**
    - `npm audit --omit=dev` currently reports moderate advisories in transitive
      dependencies from `next` and `@solana/web3.js`.
    - The automated force fix is unsafe because it suggests breaking downgrades.
      Track normal upstream releases instead.

## Confirmed Fixed Since Older Codex Review

- Supabase write/delete responses now check `res.ok`.
- THEO scan mark is reset on enemy pool reuse.
- Planet freezes under pause, level-up, death, win, and menu modals.
- Esc/P pause behavior replaced the old instant-quit path.
- SidePanel owned upgrades now use `upgradeView()`, and the weapon footer is
  neutral.
- Opening the game menu clears stale captured-site state.
- Mobile level-up overlay has scrolling/safe-area handling.
- Touch joystick now uses iOS safe-area insets.
- Mobile GPU load is reduced through lower star counts and no composer MSAA on
  coarse/small devices.
- Runtime region accents no longer cycle retired violet.
