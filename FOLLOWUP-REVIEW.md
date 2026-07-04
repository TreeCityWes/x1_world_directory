# x1.world — Follow-up Audit (post-Fable fixes, 2026-07-04)

> Follow-up to `GLM-REVIEW.md` / `GROK-REVIEW.md` / `CODEX-REVIEW.md`.
> Scope: verify the two fix commits (`0c72ff6`, `ca8efb4`) landed correctly,
> and surface anything introduced or missed since the prior pass. **This file
> supersedes the others on the current tree's status** — their open/closed
> calls were checked against the code below.
>
> Priority: **P1** = correctness/player-hostile · **P2** = balance/juice ·
> **P3** = consistency/polish.

---

## ⚠️ Do this first — new regression introduced by the telegraph feature

> ✅ **RESOLVED (Opus 4.8 loop, `c57e3ec`).** Hatch now keeps the ring alive
> until a slot frees (`if (spawnEnemy(p.type, p.dir)) p.active = false`) and the
> pending pool grew 12 → 40 so dense bursts stay telegraphed instead of falling
> through to the instant-spawn fallback. COMBAT-08 closed.

### [P2] Telegraphed spawns silently drop enemies when the pool is full

`GameLayer.tsx:1117` (hatch loop):
```js
for (const p of world.pending) {
  if (p.active && run.t >= p.at) {
    p.active = false;          // ← consumed unconditionally
    spawnEnemy(p.type, p.dir); // ← returns undefined when the type's pool is full
  }
}
```

The 0.7s warning ring shows, then on hatch `spawnEnemy` returns `undefined`
because the per-type pool (26 goblin / 16 gremlin / 10 rug / 4 boss) is full —
the telegraph is cleared but **no enemy spawns**. The warning lied.

This inverts the fairness gain the telegraphs were built for, and it fires in
the exact scenario that matters most: a dense horde with all slots occupied.
Worse than the old behavior — the old instant-spawn failed *invisibly*; this
fails *visibly* (a red ring with no payoff), which reads as a bug to players.

**Fix** — mirror the boss-retry pattern (`GameLayer.tsx:1125-1134`), which
already gets this right: only stamp `bossAtBlock` on success.
```js
if (p.active && run.t >= p.at) {
  const e = spawnEnemy(p.type, p.dir);
  if (e) p.active = false;   // keep the telegraph alive until a slot frees
}
```

### [P3] Late-game bursts bypass telegraphs (inconsistent feedback)

Spawner burst is `n = 1 + floor(block/3)` → **12 at block 33**, equal to the
entire `world.pending` pool size (`GameLayer.tsx:244`). Once saturated, the
fallback `else { spawnEnemy(type) }` (`GameLayer.tsx:1112`) fires **instantly
with no warning ring**. So at the densest moment — when telegraphs matter most
— spawns are an unpredictable mix of telegraphed and instant. Not data loss
(the fallback spawns), but uneven feedback. Either grow `pending` or cap burst
count to free telegraph slots.

---

## Other fresh findings (small)

- **[P3] Boss-card clock mismatch.** `bossCardAt: Date.now()` (wall-ms) drives
  the 3s hide timeout in `GameHUD.tsx:304`, while everything else runs on
  `run.t`. Pausing during a boss card lets wall-time expire it silently on
  resume. Moot while cards are fleeting, but the field is named like a game
  timestamp and stores wall-ms — a foot-gun if music/ambient ever gates on it.
  Align to `run.t` when convenient.
- **[P3] Knockback impulse survives pause.** `moveState.pushVX/VZ` isn't zeroed
  on pause; a queued impulse applies on resume. Realistically invisible behind
  the 0.3s knockback gate — flagging only for completeness.

---

## Fix verification — all claimed fixes are correct

Checked against current `main` (HEAD `ca8efb4`):

| Claim | Status | Note |
|---|---|---|
| Pause (Esc/P, overlay, resume/abandon) | ✅ | `paused` gates cleanly; `run.t` stops (line 1065 past the early return); input blocked so no drift accumulates |
| Global 0.4s i-frames | ✅ | `run.t - run.lastHitAt >= 0.4` (`GameLayer.tsx:1166`); `lastHitAt` inits `-10` so the first bite always lands |
| Planet freeze under modals | ✅ | Zeros velocity when `mode ∉ {explore,play}` (`Planet.tsx`); input gated off too |
| Linear scoring | ✅ | `T*40 + kills*40 + dmg/2` — circle-running dead |
| `whale`→`rug` rename + color | ✅ | `#d4a03b` gold-red matches RugMob; death-burst + DEATH_FLAVOR consistent |
| Boss retry on full pool | ✅ | `bossAtBlock` stamped only on success; retries every frame |
| Fort shield `Math.max` | ✅ | Can't shorten CAPY's window |
| Rate limiting | ✅ | Per-instance best-effort; `rlHits.clear()` at 5000 is blunt but adequate |
| `openMenu` clears `capturedIds` | ✅ | |
| Region violet removed | ✅ | `#a78bfa` → `#2dd4bf` teal in `ACCENTS` (`regions.ts:126`) |
| Pause hides boss card / freezes telegraphs | ✅ | `run.t` frozen → telegraphs resume from the right point; no instant-hatch-on-resume |

The new juice (spawn warning rings, floating damage numbers, capture beams,
boss entrance cards, low-HP heartbeat vignette) is well-built and time-correct.

---

## Clearing prior-review noise

- **CODEX #2 ("Supabase write failures ignored / `res.ok` unchecked") is a
  false positive.** GET (`route.ts:69`), POST upsert (`:127`), PATCH rename
  (`:134`), and DELETE (`:187`) all check `res.ok` and throw to the outer
  catch, which returns 500. Was already correct before the fix commits. Close
  it.
- **GROK "violet persists in UI"** is technically still true (Cursed styling
  `#a78bfa`/`#c084fc`, fortune bar). With region beacons cleaned, this can
  become an intentional "violet = cursed/mystic" story rather than drift —
  pick one and document it in `DESIGN.md`.

---

## What remains open (delta only)

The high-value open items are **design decisions**, well-covered in
`GROK-REVIEW.md §4` (score integrity / client-trusted scores, finale keyed to
player power, solved site-route, mobile run HUD, wave-2 weapons, archive
`ninja_game/`, daily seeds, music bed). Not re-litigated here.

The single elevation above GROK's ranking: **fix the telegraph-hatch
regression before any more balancing work.** It undermines the fairness layer
that the i-frames and telegraphs exist to provide — every other tuning number
sits on top of "spawns actually happen when warned."

---

## Summary

Fable's pass was strong — the P1s landed clean and the new juice is good. One
real regression slipped in via the telegraph feature (silent enemy loss on full
pools), plus two negligible P3s. Fix the telegraph hatch (3-line change,
mirrors the existing boss-retry pattern) and the tree is in good shape.
