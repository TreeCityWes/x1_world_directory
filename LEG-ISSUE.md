# Leg animation & floating gait — investigation (2026-07-04)

> **RESOLVED (same day)** — fix per "Suggested fix directions":
> whole-body bounce 0.2 → 0.06 (the big hop WAS the float), full-cycle
> scissor stride on `rotation.z` (the axis the behind-the-runner camera
> sees), a dark planted contact shadow that never bobs (grounding), and
> the additive glow/ring softened (0.22→0.14 / 0.7→0.45). Jack keeps the
> waddle-roll stand-in (option 3) — splitting the GLB stays open as the
> "real legs" follow-up. Frame-strip verified from the play camera.

**Audience:** Fable agent (or any dev picking up character motion)  
**Symptom:** X1 Ninja and Jack Levin sprites' legs do not appear to move; both characters look like they float/glide across the map.  
**Status:** Root causes identified — not yet fixed.

---

## Summary

The legs look frozen and both characters look like they glide because of **three stacked issues**:

1. **Movement model** — the character never walks across the map; the planet rotates underneath a pole-locked hero.
2. **Per-character asset wiring** — Jack is a pose-baked static GLB with no limb hooks; Ninja legs animate but the camera hides most of it.
3. **Gait tuning** — whole-body vertical bounce + hover ring + forward lean read as floating rather than stepping.

---

## 1. Movement is globe rotation, not walking

The character stays fixed at the north pole while the planet spins underneath (`components/three/Planet.tsx`):

```ts
// rotate the world under the character's feet (world-space axes)
g.quaternion.premultiply(_q.setFromAxisAngle(X_AXIS, v.x * dt));
g.quaternion.premultiply(_q.setFromAxisAngle(Y_AXIS, v.y * dt));
g.quaternion.premultiply(_q.setFromAxisAngle(Z_AXIS, v.z * dt));

// share apparent surface velocity with the character (facing + walk cycle)
moveState.vx = v.z * PLANET_RADIUS;
moveState.vz = -v.x * PLANET_RADIUS;
moveState.speed = Math.hypot(moveState.vx, moveState.vz);
```

Without convincing stepping or foot planting, this always reads as sliding — especially when the whole body bounces up and down together.

**Key files:** `components/three/Planet.tsx`, `lib/gameState.ts`, `components/three/Character.tsx`

---

## 2. Jack Levin: static pose-baked GLB, no limb hooks

Jack uses `public/models/jack.glb`, produced via `scripts/pose-bake.mjs`. That script bakes one animation frame into the mesh vertices and **strips the skeleton** — no joints remain to animate.

In `CharacterBody.tsx`, Jack's branch ignores all animation refs (`legLRef`, `legRRef`, `armLRef`, etc.) and renders a single static primitive:

```tsx
if (charId === "jack")
  return (
    <group position={[0, jackLift, 0]}>
      <primitive object={jack.body} />
      {/* XEN tee pinned by raycast */}
    </group>
  );
```

`Character.tsx` still drives `legL` / `legR` every frame, but those refs are **never attached** to Jack's mesh — his legs cannot move by design.

The only Jack-specific motion is **whole-body compensation** in the `bob` group:

- Vertical bounce (`bob.position.y`)
- Yaw shimmy (`bob.rotation.y`, 0.16 × speedNorm)
- Waddle roll (`bob.rotation.z`, 0.18 × speedNorm) — comment in code: *"Jack has no leg joints (pose-baked GLB)"*

That sways the torso; it does not animate legs.

**Key files:** `components/three/CharacterBody.tsx` (jack branch), `scripts/pose-bake.mjs`, `public/models/jack.glb`

---

## 3. X1 Ninja: legs *do* animate, but the camera hides most of it

The ninja is procedural (`NinjaBody` in `CharacterBody.tsx`) with hip-pivoted leg groups wired to `legLRef` / `legRRef`:

```tsx
{[-1, 1].map((s) => (
  <group
    key={`leg${s}`}
    ref={s === -1 ? legLRef : legRRef}
    position={[s * 0.052, 0.225, 0]}
  >
    {/* capsule leg + tabi foot */}
  </group>
))}
```

`Character.tsx` rotates them every frame:

```tsx
const flare = 0.26 * speedNorm;
if (legL.current) {
  legL.current.rotation.x = -swing * 1.4;
  legL.current.rotation.z = flare * Math.max(0, Math.sin(phase.current));
}
if (legR.current) {
  legR.current.rotation.x = swing * 1.4;
  legR.current.rotation.z = -flare * Math.max(0, -Math.sin(phase.current));
}
```

### Camera foreshortening

The play-mode chase cam is **nearly top-down** (`components/three/Rig.tsx`):

- Camera Y ≈ 6.6, look-at Y ≈ 2.3
- Framed for Vampire Survivors legibility on a sphere

From that angle, `rotation.x` (forward/back stride) foreshortens along the depth axis and **looks like nothing on screen**.

Commit `36f6c9f` ("The run finally READS") live-debugged this: legs were already swinging ±46° in the scene graph, but the owner still saw no leg movement. The fix moved motion into axes the camera can see (bounce, lateral flare, yaw shimmy) — stride on X still does not read.

**Key files:** `components/three/Character.tsx`, `components/three/Rig.tsx`, `components/three/CharacterBody.tsx` (NinjaBody)

---

## 4. Why both look like they're floating

Several factors reinforce a hover/glide read for **both** characters:

| Factor | Effect |
|--------|--------|
| **Whole-body bounce** | `bob.position.y` lifts the entire mesh (legs included) up to `0.2 × speedNorm` — feet leave the surface together, no planting |
| **Constant forward lean** | `bob.rotation.x = 0.22 × speedNorm` tilts the body forward while the world slides under |
| **Hover ring + glow** | Additive torus/circle under the feet (`y = 0.012` / `0.05`) in `Character.tsx` — reads as a hover pad, not ground contact |
| **Small visual scale** | Character at `scale={0.42}` makes subtle leg flare harder to see |
| **Reduced motion** | If `prefers-reduced-motion: reduce` is on (`lib/motion.ts`), all limb animation is zeroed every frame |

Relevant bounce code (`Character.tsx`):

```tsx
bob.current.position.y =
  hover + 0.02 * Math.sin(t * 2.2) + 0.2 * Math.abs(Math.sin(phase.current)) * speedNorm;
bob.current.rotation.x = 0.22 * speedNorm;
```

Bounce was deliberately increased from `0.09` → `0.2` in `36f6c9f` because the old hop was only ~3px on screen — but that trades "invisible micro-hop" for "visible float."

---

## Root cause by character

| Character | Legs don't move because… | Floats because… |
|-----------|--------------------------|-----------------|
| **X1 Ninja** | Stride animates on `rotation.x`, which the top-down camera foreshortens; lateral flare is partial-cycle and subtle at 0.42 scale | Whole-body bounce + planet-slide movement + hover ring |
| **Jack Levin** | Pose-baked GLB with no rig; limb refs never wired to mesh | Same bounce/slide; only body waddle/yaw as stand-in for walking |

**Also true (context):** GLB characters CAPY and THEO get bob/yaw only — no limb animation. Only the procedural ninja wires `armLRef` / `legLRef` / `scarfRef`. See `GROK-REVIEW-DEEP.md` Appendix D asset note.

---

## Recent history (for context)

| Commit | What changed |
|--------|----------------|
| `9ceb4cb` | Real Quaternius models for Ninja + Jack; Jack pose-baked via `pose-bake.mjs` |
| `b49586e` | Jack swapped to "normal guy" full-body model (legs included in mesh) |
| `f330f58` | "Read-from-above pass" — step hop, yaw shimmy, Jack waddle roll |
| `36f6c9f` | Bounce 0.09→0.2, lateral leg flare, faster cadence; documented that legs were animating but invisible from cam |

---

## Suggested fix directions

Pick one or combine — ordered by impact:

### Jack

1. **Split GLB into animatable parts** (hips / legs / torso as separate groups) and wire `legLRef` / `legRRef`, or
2. **Keep a skinned rig** (skip pose-bake for runtime) and drive bone rotations in `useFrame`, or
3. Accept body-only waddle but **reduce bounce** so he reads as stomping on the surface, not hovering.

### Ninja

1. Animate legs on axes the camera sees: stronger `rotation.z` scissor stride, or `rotation.y` outward kick — not just `rotation.x`.
2. **Reduce whole-body Y bounce**; optionally counter-animate feet or pin hover ring to planet while body bobs.
3. Add a **ground-contact squash shadow** that stays on the surface while the torso bobs.

### Both / shared

1. Decouple hover ring from body bob (ring stays at `y=0` on planet surface).
2. Replace or soften additive glow disc — use a dark contact blob instead.
3. Verify with frame-strip capture from the **actual play camera** (not select-screen turntable — `CharacterPreview.tsx` has no walk cycle).

---

## Verification checklist (for whoever fixes)

- [ ] Play as **ninja** and **jack** at full sprint — record 1s frame strip from play camera
- [ ] Confirm `moveState.speed` > 0 while keys held (`window.__x1_move` in devtools)
- [ ] Check `prefersReducedMotion.current` is false
- [ ] Inspect scene graph: ninja `legL`/`legR` rotation changing; jack refs should be `null` or unused today
- [ ] Compare select-screen turntable (`CharacterPreview.tsx`) vs in-run `Character.tsx` — turntable never shows walk anim

---

## Key file index

| File | Role |
|------|------|
| `components/three/Character.tsx` | Walk cycle, bob, leg/arm refs, hover ring |
| `components/three/CharacterBody.tsx` | Per-char mesh; only ninja wires limb refs |
| `components/three/Rig.tsx` | Near-top-down chase camera |
| `components/three/Planet.tsx` | Globe rotation = movement |
| `lib/gameState.ts` | `moveState.speed` / velocity for anim |
| `lib/motion.ts` | Reduced-motion gate |
| `scripts/pose-bake.mjs` | Why Jack has no skeleton |
| `components/game/CharacterPreview.tsx` | Select screen — no walk anim, different camera |