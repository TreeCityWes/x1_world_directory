# Codex Review Findings

Date: 2026-07-04

Scope: whole-codebase audit focused on character consistency, combat/runtime correctness, UI/mobile, performance, tooling, and security. No code changes were made by Codex for this review.

Verification:
- `npm run lint` passes.
- `npm run build` passes.
- Current working tree had local WIP in `components/three/Character.tsx` and `components/three/CharacterBody.tsx` during review.

## Must Fix

1. **Leaderboard scores are client-trusted**
   - `app/api/leaderboard/route.ts` accepts `score` directly from request body and only clamps it to `500_000`.
   - `lib/leaderboard.ts` submits the client-computed score.
   - Wallet signatures only prove wallet ownership, not that a real run happened.
   - Recommendation: label scores as casual/unverified, or add server-issued run tokens / transcript validation.

2. **Supabase write failures are ignored**
   - `app/api/leaderboard/route.ts` awaits POST/PATCH/DELETE calls but does not check `res.ok`.
   - Failed saves/removals can still return `{ ok: true }`.
   - Recommendation: check every Supabase response and return 500 or structured error on failure.

3. **THEO scan mark can leak across enemy pool reuse**
   - `components/game/GameLayer.tsx` `spawnEnemy()` resets hp/speed/recoil but not `markedUntil`.
   - A newly spawned enemy can inherit a scan mark from a previous enemy in the same pool slot.
   - Recommendation: reset all transient enemy fields on spawn, including `markedUntil = 0`.

4. **Level-up pause lets planet inertia continue**
   - `GameLayer` freezes combat while mode is not `play`, but `Planet` still applies velocity and rotation.
   - During level-up, the world can drift under the modal, then combat resumes from a shifted player-local position.
   - Recommendation: zero or damp planet velocity while mode is `levelup`, `menu`, `dead`, or `won`.

5. **Character body placement still needs a real transform config**
   - Current CAPY/Jack fixes are hardcoded asset-scale guesses in `CharacterBody.tsx`.
   - Recommendation: add per-character `scale`, `groundOffset`, `rotation`, and preview framing config, then screenshot-verify every character in run and select screens.

## Should Fix

6. **Character-specific upgrade labels do not reach all UI**
   - `GameHUD` level-up cards use `upgradeView()`, but `SidePanel` owned-upgrade list still renders raw `UPGRADES`.
   - SidePanel footer still says “shurikens aim where you run.”
   - Recommendation: use `upgradeView(id)` in `SidePanel` and make footer weapon-neutral.

7. **Menu/run side panel can show stale run data**
   - `SidePanel` renders `GamePanel` for every non-explore mode.
   - `openMenu()` does not clear `capturedIds`.
   - Recommendation: render run panel only for run/end states, or clear all run UI state when opening menu.

8. **Esc confirm state can leak across mode changes**
   - `Overlay` arms Esc with a timeout but does not clear it on mode changes.
   - Recommendation: clear `escArmed` and timeout whenever `mode` changes.

9. **Mobile level-up overlay can clip**
   - Level-up modal centers fixed-width cards without a scroll container.
   - Recommendation: add `max-h-dvh overflow-y-auto`, safe-area padding, and full-width/smaller cards on small screens.

10. **Mobile GPU cost is high**
    - `Experience.tsx` renders 5,500 stars and `EffectComposer multisampling={8}` on all devices.
    - Recommendation: reduce star count/MSAA on mobile or low DPR; consider disabling composer on weak devices.

11. **Project checker likely fails on clean installs**
    - `scripts/check-sites.js` imports `playwright-core`, which does not install browsers.
    - README tells users to run the checker after `npm install`.
    - Recommendation: document `npx playwright install chromium`, use system Chrome via `executablePath`, or add a dedicated tooling setup.

## Accessibility / UX

12. **Directory sorting is mouse-only**
    - `Directory.tsx` uses clickable `<th>` elements without keyboard semantics or `aria-sort`.
    - Recommendation: use real buttons inside headers and expose sort state.

13. **Some icon-only controls lack accessible names**
    - Social links, joystick, and some glyph buttons rely on visible symbols.
    - Recommendation: add `aria-label` and mark decorative glyphs `aria-hidden`.

14. **Touch joystick needs safe-area awareness**
    - `TouchPad` is fixed to `bottom-4 right-4`.
    - Recommendation: account for `env(safe-area-inset-bottom/right)` on mobile.

## Design Consistency

15. **Palette drift**
    - `docs/DESIGN.md` says violet is retired, but `lib/regions.ts` still cycles `#a78bfa`.
    - Recommendation: replace violet or update the design doc.

16. **Shared internals still use shuriken language**
    - `shurikenDamage`, `Shuriken`, and `world.shurikens` are now generic projectile pools in practice.
    - Recommendation: rename later to `primaryDamage`, `Projectile`, and `world.projectiles` to reduce future mistakes.

17. **Attack identity direction is good but needs full surface coverage**
    - Current character-specific upgrade flavor and Blade Storm variants are the right direction.
    - Make sure every HUD, side panel, evolution, projectile visual, hit spark, and sound follows:
      - Ninja: blue, sharp, precise.
      - Jack: gold/white/black, heavy explosive coins.
      - THEO: cyan/white, synthetic lock-on chains.
      - CAPY: green/brown, melee shield sweeps.
      - Enemies: warm danger colors, hostile motion, never confused with heroes.

## Security Notes

18. **Add rate limiting to leaderboard endpoints**
    - `/api/leaderboard` POST/DELETE can be spammed.
    - Recommendation: add simple IP/device rate limiting or provider-level protection.

19. **Treat `projects.json` as trusted input for scripts**
    - `scripts/check-sites.js` drives a browser against project URLs.
    - Recommendation: review URL additions before running the checker.

20. **Service-role key handling looks structurally correct**
    - API route uses service-role key server-side.
    - Keep service-role env vars non-`NEXT_PUBLIC_*`.

