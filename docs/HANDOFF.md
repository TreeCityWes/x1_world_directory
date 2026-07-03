# Handoff — visual polish pass

A second agent (aesthetics/visual pass) ran on top of your work for one session. This records **what changed**, the **direction locked with the owner**, and **what's open**. You know the repo, so no basics here.

## Aesthetic direction (decided with the owner this session — new)
- North star unchanged: *"a playful toy planet, shot like an Apple film, that moves like Linear."*
- **Globe:** keep the surface **smooth** — faceted/terrain was explicitly **rejected**. Push **deeper lit/dark drama + a stronger rim**, moody/cinematic.
- **Explore vs. game:** **intentional contrast** — explore stays premium-calm, the game stays meme-y/wild. Don't unify them.
- **#1 beauty priority:** the **game-in-action** (combat: enemies, shurikens, halo, chaos).
- **CTA color = gold** (`--gold #f0c75e`). Cyan = network/glow. **No violet** — the old `--accent` violet in DESIGN.md was a phantom; it's been retired there.

## What changed (all on `main`, oldest → newest)
- `fd88d7e` — `Experience.tsx`: added `@react-three/postprocessing` (`<EffectComposer>` + `<Bloom>` + `<Vignette>`); lighting rebalanced to a single key light (ambient `0.5`→`0.15`, **removed** the hemisphere + one fill) for a real lit/dark terminator.
- `37243c4` — Bloom was flashing/strobing: `luminanceThreshold` `0.55`→**`0.9`**, `luminanceSmoothing` `0.7`, intensity `0.5`, radius `0.6`; slowed the starfield twinkle (`speed` `0.7`→`0.2`, `0.25`→`0.1`).
- `3f9304c` — Whale was bigger than the planet: measured `public/models/whale.glb` (10.2 units native), so `MODEL_SCALE.whale` **`0.1`→`0.03`** in `GameLayer.tsx` (the only line touched in your file).
- `b269bbc` — New `components/three/NetworkLinks.tsx`: glowing cyan great-circle arcs linking each landmark to its 2 nearest neighbors, explore-only, additive + opacity pulse. Mounted in `Planet.tsx`.
- `45e5112` — `Planet.tsx`: explore-only **idle drift** (slow turntable when still; killed on input/drag; off during runs). `Overlay.tsx`: hid the `wasd` control hints outside explore.
- `c4070cb` — `Landmarks.tsx`: hull `#1c2747`→`#2a3a63`, hull emissive `0.25`→`0.4` (silhouette readability). New `lib/motion.ts` + reduced-motion gating (`<MotionConfig reducedMotion="user">` in `Experience.tsx`; canvas decorative motion — globe breathing/idle drift, ninja bob/swing/scarf — gated on the flag). `docs/DESIGN.md` palette synced to `globals.css` + gold CTAs.
- `eeb2686` — `Planet.tsx` atmosphere: rewrote the `ATMOSPHERE` shader — proper per-fragment **view-vector fresnel + smoothstep** rim (the old `dot(normal, +Z)` pow approximation flickered at the silhouette), shell `1.08`→`1.04`, **removed the breathing scale-pulse** (it throbbed against the fixed shell and read as flicker). ⚠️ **Never visually verified** — see deploy note.

New on disk: `@react-three/postprocessing` (dep), `lib/motion.ts`, `components/three/NetworkLinks.tsx`.

## ⚠️ Deploy — verify FIRST before judging any visual change
GitHub `main` is at `eeb2686` (pushed, in sync), **but the owner reported seeing no changes on the live site.** The visual-pass agent couldn't access Vercel from its environment. Before concluding any change "didn't work," confirm Vercel is actually building `main`: **Deployments tab → latest commit hash + green status.** If it's red, the prime suspect is **Playwright being a devDependency** — its postinstall pulls ~300 MB of browsers and commonly OOMs/fails Vercel builds. (Everything here passes `npm run build` locally.)

## Open work (prioritized)
1. **Ion Halo → particle flames** (owner-requested; `GameLayer.tsx`). Current halo is a flat torus + disc — reads as geometry, not fire. Spec: pool `MAX_FLAMES ~64` on `world` (`{ alive, dir: Vector3, life, maxLife }`); emit ~3 every ~30 ms while `halo > 0`, spawning on the ring via `randomDirNear(world.pLocal, halo, halo)`; rise height `(1-age)*0.07`; color-lerp hot `#ffe89e` → `#ff8c3d` → `#ff3d3d`; additive `MeshBasicMaterial`; sync in `syncMeshes`; reset on new run. Knobs: emit count, lifetime 0.35–0.6 s, rise, colors.
2. **Game-in-action beauty** (the #1 priority; all **non-`GameLayer`**, so no conflict): chase camera (`Rig.tsx` play branch — framing / dynamic tilt toward threat / maybe a subtle FOV punch; currently a near-top-down N64 chase cam), combat HUD (`GameHUD.tsx`), and confirm shurikens/enemies bloom well at threshold `0.9`.
3. **Bugs:** `lib/gameStore.ts` `pick("vitality")` hardcodes `maxHp = 100 + 25*lv`, ignoring Cursed's `statMult` (`0.7`); `rollChoices()` can return `[]` once upgrades are maxed → `GameLayer` silently skips the level-up (lost level, no feedback); `Overlay.tsx` Esc instantly quits a run with no confirm; `GameLayer.tsx` `dealDamage` tallies overkill into `run.damage` + lifesteal (your 2D `ninja_game/js/enemies.js` deliberately clamps to `min(hp, amount)`).
4. **Atmosphere** (`Planet.tsx`): re-check once deploys work. Knobs: the `smoothstep(0.55, 1.0, …)` band, the `*0.6` intensity, shell `scale={1.04}`, color `vec4(0.16, 0.34, 0.74)`.
5. **Deferred:** 3D color tokenization (`lib/theme.ts` mirroring `globals.css`) — only the doc was fixed; scene hexes are still inline (e.g. `Character.tsx`). Value-preserving only — do **not** shift the ninja's brand colors.

## Verify before pushing
`npm run lint` + `npm run build` (build also typechecks). Match the existing commit style: imperative, no conventional-commit prefix (e.g. `"Tame bloom: higher threshold + slower starfield"`).
