# GLM — 3D Enemy & Sprite Design Review (2026-07-04)

> A design-review pass on the shipped enemy cast and the CanvasTexture sprite
> elements on the globe. Concrete critique + proposals, not just "make it
> better." Read alongside `ninja_game/ASSETS.md` (the 2D art spec) and
> `docs/DESIGN.md` (the color/type bible).
>
> The cast today: **Bug** (`BugMob`, goblin pool), **Gas Wisp** (`GasWisp`,
> gremlin pool), **Rug** (`RugMob`, rug pool), **Whale** (GLB boss #1),
> **Nemesis** (`Nemesis.tsx`, procedural boss #2 / finale).

---

## Headline: one color-bible violation to fix first

`characters.ts` locks the identity palette: **ninja=blue, jack=gold, theo=cyan,
capy=green, red reserved for enemies/danger.** Three of the five enemies comply
(orange Gas, red-gold Rug, crimson Nemesis). Two don't:

- **The Bug is green.** Body `#0c1c11` with `#39ff88` emissive — that's CAPY's
  green. On screen next to a CAPY player (or even alone), a green enemy breaks
  the "warm = hostile, identity-color = hero" rule the whole game is built on.
  The red compound eyes try to claim danger but the dominant read is green.
  **Fix the body color, not the eyes.**
- **The Whale's menace is material-only.** A darkened crimson Quaternius whale
  is still a cute whale *shape* underneath. Form should carry the threat, not
  just the emissive pass.

Everything below assumes these two get resolved.

---

## Per-enemy review

### THE BUG — "a code exploit crawling out of the codebase"
**Works:** segmented insect silhouette (abdomen + thorax + head) reads
instantly as "creepy-crawly"; six splayed legs + sweeping antennae give great
life; red compound eyes are the right danger cue. The crypto fantasy (bug =
exploit) is solid.

**Weak:**
- Green body (see headline) — the single biggest fix on this mob.
- The **"BUG" text decal** draped over the carapace is charming but
  undercuts the "high-tech precision" tone (`DESIGN.md`) — it reads
  cartoonish next to the rest of the cast. It's a label for a silhouette that
  already reads.
- It's a *biological* beetle, not a *code* bug. Nothing digital ties it to the
  exploit fantasy.

**Propose:**
- Repaint to a virulent **wasp-yellow/amber** (`#facc15` body, `#fde047`
  emissive) — toxic, warm, no hero owns it, and wasps read as "stings you"
  faster than beetles. Keep the red eyes.
- **Swap the "BUG" decal for a glitch texture** — chromatic scanlines or a
  flickering hex/binary band. Keeps the "labeled" energy, raises the tone, and
  ties the form to *code*. A subtle cyan↔magenta emissive flicker on the eyes
  (digital glitch) sells "exploit" harder than any word.

### THE GAS WISP — "a fee spike come alive"
**Works:** the **clearest crypto fantasy in the cast** (gas fees → flame ghost);
rising smoke puffs are excellent juice; orange palette is on-bible. The
white-hot core + angry slanted eyes give it personality.

**Weak:**
- Reads as a **generic flame elemental**, not specifically *gas/fee*. Nothing
  about the form says "price spike."
- **"GAS" decal** — same literal-label issue as the Bug.
- The three-lobe skirt can blob the silhouette at distance.

**Propose:**
- **Lean into "spike":** a jagged upward fin/quill on the back shaped like a
  gwei candle wick — the silhouette itself becomes a chart-spike. That's the
  whole joke, made visual.
- Tint the smoke's leading edge **cyan-hot** (burnt-gas blue flame) to separate
  from generic lava-orange and echo the network/cyan accent.
- Replace the "GAS" decal with a **ticking number flicker** — rising
  `280…410…990` gwei values cycling on the chest plate. Reinforces "fee spike"
  dynamically instead of labeling it.

### THE RUG — "a possessed flying carpet = rug pull" *(best in show)*
**Works:** the **strongest crypto-pun** in the cast; the carpet silhouette
(flat patterned body, gold border, center medallion, fringe tassels, eyes on
the leading edge) is unmistakable; red+gold is on-bible; **no label decal** —
it trusts the silhouette, which is the right call and the Bug/Gas should follow.

**Weak:**
- It's **dead flat** (boxes) and relies on the sync loop's wobble for life;
  can read slab-like when still.
- Nothing **"pulls."** The fantasy is a rug *pull* but the motion is generic
  chase — the name and the behavior don't connect.

**Propose:**
- **Animate the yank:** a periodic rear-up → snap-forward lunge (it's pulling
  the rug out), telegraphed by a fringe-twitch 0.3s before. Ties motion to
  name and gives players a dodgeable tell (also addresses GROK's "no windup"
  note for mobs).
- **Billow the trailing edge** — a second thin mesh or vertex wave on the back
  edge so it reads as cloth in flight, not a plank. Cheap and high-impact.

### THE WHALE — boss #1 (GLB)
**Works:** biggest thing on the field (`BOSS_SIZE 1.05` — unmistakable); the
menace pass (darken ×0.72, `#8b1020` crimson emissive, smoothed normals) is the
right treatment; swim roll + pitch give mass.

**Weak:**
- **Form doesn't carry the threat** — it's a cute Quaternius whale under the
  dark material. Crypto-literate players get the "whale" pun, but the *menace*
  is 100% in the shader, 0% in the shape.
- No "bags" — a crypto whale is defined by its holdings. The boss has no
  economic identity on its body.

**Propose:**
- **Accessorize for power, not animal:** a gold chain, monocle, or top-hat
  (the "fat-cat" trope — this is exactly what `ninja_game/ASSETS.md` specifies
  for its whale: *"one gold accent (monocle or top hat)"*). One accessory
  flips the read from "animal" to "whale (investor)."
- **Trailing coin-sacks chain** behind it — the "bags" — that visually swallows
  gems on death. Ties the boss to the run economy and makes the kill pay off
  literally.

### THE NEMESIS — boss #2 / finale (procedural)
**Works:** the **evil-mirror concept is the best boss idea here** — same
silhouette as the hero, crimson-and-black, burning eyes, twin katanas, dark
aura ring. Fighting your own shape as the finale is dramatically right.

**Weak (the big one):**
- **The mirror is broken.** The Nemesis is built from the *old primitive*
  Character body (capsules + spheres). But the hero now uses **real GLB
  models** (the recent character pass: real ninja, Jack, THEO, CAPY kits). So
  the boss looks *lower-fidelity than the player it's mirroring.* A polished
  GLB hero vs. a primitive-block shadow isn't a dark reflection, it's a
  generation gap.
- Static — no attack tells (GROK flagged this for all bosses).

**Propose:**
- **Make the mirror literal:** spawn the Nemesis as a crimson-reskin of
  *whichever hero the player selected*. A Jack run fights dark-Jack; a CAPY
  run fights dark-CAPY. That's a far stronger finale fantasy than a fixed
  ninja-wraith, and you already have the GLBs loaded. This is the
  highest-impact single change to the boss roster.
- Add a windup tell before its lunge (eyes flare → 0.4s hitch → strike).

---

## Sprite / CanvasTexture system review

Three independent text systems are drawing into the 3D scene today, and they
disagree:

| Element | Font | Source |
|---|---|---|
| UI (HUD, panels) | **Geist / Geist Mono** | `next/font` |
| Site-name banners over targets | **Arial 800** | `getSiteLabel()` |
| Mob name-plate decals ("BUG", "GAS") | **Courier New 900** | `getLabelTexture()` |

**Issues:**
- **Three font systems, none agreeing.** `DESIGN.md` says mono = "anything that
  should feel on-chain/arcade" — Geist Mono is installed and is the obvious
  single choice for all canvas-drawn text. Arial and Courier New read as
  defaults, not brand.
- **Mob decals are inconsistent:** Bug and Gas wear literal word labels; the
  Rug (correctly) doesn't. Pick a rule. My recommendation: **drop the literal
  words entirely** — the silhouettes already read, and the labels lower the
  tone (see per-enemy notes for the glyph/number replacements).
- The **`getSiteLabel` auto-shrink-to-fit** is smart logic — keep it, just
  point it at Geist Mono.
- **Damage numbers** (crit/boss-only — good anti-spam) and the **X coin face**
  (bold white X on black disc — on-brand for XEN, keep) should also unify on
  the one font.

**Propose:** a single `makeCanvasText(text, {weight, color, glow})` helper
backed by Geist Mono, used by all four call sites. One system, one tone.

---

## Prioritized action list

1. ~~**Recolor the Bug** off CAPY-green (wasp-amber)~~ ✅ `e362aec` — amber
   body/legs/mandibles/antennae, red eyes kept.
2. **Nemesis-as-selected-hero-reskin** — the single biggest boss-roster upgrade;
   reuses loaded GLBs. *(open — the remaining high-impact bet)*
3. ~~**Unify canvas text on Geist Mono**~~ ✅ `e362aec` — `lib/canvasFont.ts`
   backs site banners, damage numbers, mob decals, and the XEN tee.
4. ~~**Drop the literal "BUG"/"GAS" decals**~~ ✅ `e362aec` — Bug wears a
   glitch-hex band; Gas Wisp runs a live 212→487→990 gwei ticker.
5. ~~**Whale accessory**~~ ✅ game-feel pass — gold-banded top hat seated on
   the measured back hump + monocle on the right eye. *(coin-sack trail still
   open — economy tie-in)*
6. ~~**Rug pull-lunge**~~ ✅ game-feel pass — 0.35s cobra rear-up (tell), then
   a 0.45s snap-forward on a staggered per-rug clock; rides the boss
   telegraph rails.
7. Gas Wisp chart-spike fin + cyan-hot smoke edge. *(open)*

Items 1, 3, and 4 are cheap and tone-raising; 2 is the high-impact design
bet. The cast's *concepts* are genuinely strong (the crypto puns are the best
hook the game has) — the gaps are execution consistency, not imagination.
