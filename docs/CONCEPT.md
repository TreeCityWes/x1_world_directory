# x1.world — Concept

> Unofficial, fan-made marketing experience for **X1**, the high-performance
> Solana-VM-compatible Layer 1 from the X1 Foundation & Jack Levin.
> We own `x1.world` and want to make something people screenshot and share.

## The one-line pitch

**A tiny explorer walks around a living blue world, and every region of that
world is a piece of the X1 ecosystem.**

You don't scroll a page. You *travel* a planet.

---

## The signature hook

A **blue globe** floating in space. The globe is roughly **5–10× the size of a
little character** standing on its surface, so the character can comfortably
walk around it while the world slowly spins beneath their feet.

The globe is not a realistic Earth — it's an **old-school illustrated ecosystem
map** wrapped onto a sphere. Think:

- the hand-drawn isometric "world maps" from classic strategy games and theme
  parks (Disneyland-map energy),
- the vintage "crypto ecosystem" district illustrations,
- SimCity / Monument Valley geometry, but warm and inviting.

### Art direction (decided during build — supersedes "hand-drawn" notes)

The sketch defines **layout and mechanics only**, not the look. The shipped
style is **high-tech precision**: a starry night sky, a **black obsidian world
wrapped in a glowing blue geodesic network**, colored beacon gems per project
category, and a **ninja** character (charcoal hood, electric-blue headband,
gold-detailed crossed katanas — after the x1.ninja logo). UI is dark glass,
hairline borders, mono microcopy, gold accents. Dark, glowing, playful,
futuristic — an X1 ecosystem explorer, not a generic Earth.

Projects now live in **`projects.json`** (29 and growing) and are auto-placed
on the globe via a Fibonacci sphere — see `lib/regions.ts`.

### Reference sketch (`x1world-sketch.png`)

The user's sketch pins down the composition:

- The **character stands on *top* of the blue world** — feet planted at the
  "north pole," not orbiting the equator. The **world spins underneath** and
  brings each region into view. (The character can still stroll a little, but the
  primary motion is the planet turning beneath them.)
- Each region is a **real X1 ecosystem project**, drawn as a little **peninsula /
  spike / landmass** poking out of the globe — like continents on a blob planet.
- A big **`x1.world`** wordmark anchored at the bottom.
- Background is loose, scribbly **space / star-field** energy.

### The regions = real ecosystem projects

Each "state" on the globe links out to an actual project in the X1 orbit. From
the sketch:

| Region (site) | What it is (verify!) | Visual idea |
| --- | --- | --- |
| **x1val.online** | Live validator monitoring / performance | Watchtower / observatory scanning the network |
| **x1valhq.xyz** | Validator HQ / operator hub | Control-tower district for node runners |
| **xdex.xyz** | DEX / trading on X1 | Market harbor — flowing exchange currents |
| **x1.ninja** | Ecosystem tool / explorer (confirm) | Nimble outpost, playful landmark |
| **fortiblox.com** | Ecosystem project (confirm) | Fortress / builder district |

> These sites and descriptions are drawn from the sketch — **confirm each URL,
> what it actually is, and whether it should be featured** before shipping. Keep
> the featured set to ~4–6 so the world stays legible. This is a fan tribute, so
> only link projects you're comfortable endorsing.

---

## How it should *feel* (the four north stars — blend, never copy)

1. **Apple** → *storytelling & restraint.* Every beat is deliberate. Copy is
   short. Whitespace (here, "space-space") does the heavy lifting.
2. **Bruno Simon** → *playful interactivity.* The character and globe are toys.
   Reward curiosity — let people just spin the world and smile.
3. **Active Theory** → *immersion & cinematic transitions.* Zooms into a region
   feel like flying down to a landmark, not clicking a nav link.
4. **Linear** → *refined motion.* Nothing snaps. Everything eases. Fast, quiet,
   expensive-feeling micro-motion.

The blend, in one sentence: **a playful toy planet, shot like an Apple film,
that moves like Linear.**

---

## The journey (rough narrative arc)

1. **Arrival** — Camera drifts through the scribbly star-field, the blue world
   rotates into frame, the little character is standing on top. Title +
   one-line pitch fade in.
2. **Explore** — As the user scrolls (or drags), the **world spins beneath the
   character's feet**, rolling the next region-peninsula up to the front. Camera
   dollies to frame it.
3. **Landmarks** — Each ecosystem project (x1val.online, xdex.xyz, …) gets a
   cinematic push-in: a short headline, one line of copy, and a link out to that
   real site. Then it releases and the planet keeps turning.
4. **Horizon** — The final beat pulls all the way back to reveal the whole
   ecosystem as one glowing planet, wordmark **x1.world** locking in at the
   bottom. CTA: "Explore X1" / "Read the docs".

---

## Interaction model — free-explore (the chosen direction)

**The user drives the character.** Mouse and/or keyboard (WASD / arrows, and/or
click-to-move) walks the little explorer across the surface of the world. It's a
toy first — Bruno Simon energy. As the character moves, the **globe rotates so
the character stays on top** (walking "forward" rolls the planet toward you).

**Proximity-triggered project cards.** Each region has a **landmark/tower**. When
the character walks up to one, an **info card** animates in with:

- the project name + a **screenshot** of the site,
- a one-line description,
- a button/link out to the real site (x1val.online, xdex.xyz, …).

Walk away and the card dismisses. This replaces a nav menu entirely — you
*discover* the ecosystem by wandering it.

Design considerations for Fable:
- **Movement:** keyboard (WASD/arrows) + optional click-to-walk. On touch, a
  small on-screen joystick or tap-to-walk.
- **Proximity:** detect when the character is within range of a landmark
  (distance check per frame); debounce so cards don't flicker at the boundary.
- **Camera:** gently follows the character (orbit-behind or fixed-high), easing
  per Linear-grade motion.
- **Cards:** DOM overlay (framer-motion) anchored near the tower or docked to a
  screen edge; screenshots are real images (see asset note below).
- **Optional guided tour:** a "take the tour" button that auto-walks the
  character between landmarks for people who don't want to drive.

### Screenshots / assets

Each card needs a screenshot of the target site. Options for Fable:
`public/screens/<project>.png` captured manually, or an automated shot at build
time. Keep them optimized (next/image) and lazy-loaded.

---

## Non-goals

- Not a realistic Earth globe. Not Google Earth.
- Not a whitepaper. Copy stays marketing-light; deep detail links to docs.x1.xyz.
- Not officially affiliated — keep a tasteful "fan-made" footer note.

## Success test

Someone lands on x1.world, spins the little planet for 20 seconds before
reading a single word, then screenshots it and drops it in a Discord.
