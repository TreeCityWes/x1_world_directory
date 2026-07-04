/**
 * Playable character registry — fully data-driven. Adding a character means
 * adding an entry here (+ a palette/visual key); the game loop reads mods
 * and weapon kind, never character names. Color identities are LOCKED for
 * readability: ninja=blue, jack=gold/white, theo=cyan, capy=green; red is
 * reserved for enemies and danger.
 */

export type CharacterId = "ninja" | "jack" | "theo" | "capy" | "mystery";
export type WeaponKind = "shuriken" | "xcoin" | "pulse" | "slash";

export type CharacterDef = {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  playstyle: string;
  weapon: { kind: WeaponKind; name: string; desc: string; pierce?: number };
  /** multipliers vs. the ninja baseline (1 = baseline) */
  hp: number;
  armor: number; // flat extra damage reduction (0..1)
  speed: number;
  dmg: number;
  cooldown: number; // >1 = slower attacks
  luck: number; // chance-based coin bonuses scale off (luck - 1)
  xp: number;
  /** upgrade cards offered per level-up (default 3) */
  choices?: number;
  /** one-line signature ability, shown on the select screen */
  passive: string;
  /** GLB placement: normalized size (longest dimension) + optional lift */
  model?: { size: number; lift?: number };
  unlocked: boolean;
  colors: {
    hood: string;
    suit: string;
    band: string;
    scarf: string;
    eyes: string;
    belt: string;
  };
};

export const CHARACTER_ORDER: CharacterId[] = ["ninja", "jack", "theo", "capy", "mystery"];

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  ninja: {
    id: "ninja",
    name: "X1 Ninja",
    title: "the balanced blade",
    description: "Balanced starter. Shurikens pierce through two enemies.",
    playstyle: "Reliable, fast, simple — and every star pierces: one throw, two kills.",
    weapon: { kind: "shuriken", name: "Piercing Shuriken", desc: "stars that pierce 2 enemies", pierce: 2 },
    hp: 1,
    armor: 0,
    speed: 1,
    dmg: 1,
    cooldown: 1,
    luck: 1,
    xp: 1,
    passive: "Every shuriken pierces through 2 enemies",
    unlocked: true,
    colors: {
      hood: "#232936",
      suit: "#1a1f2c",
      band: "#1e4fd8",
      scarf: "#1638b8",
      eyes: "#4f7dff",
      belt: "#f0c75e",
    },
  },
  jack: {
    id: "jack",
    name: "Jack Levin",
    title: "the founder",
    description: "Founder burst character. Uses exploding X coins.",
    playstyle: "Slow, deliberate throws — each gold-and-white X coin detonates in an area. Devastating against packs.",
    weapon: { kind: "xcoin", name: "XEN Network Attack", desc: "X coins that explode like bombs" },
    hp: 1.05,
    armor: 0,
    speed: 0.95,
    dmg: 1.6,
    cooldown: 1.6,
    luck: 1,
    xp: 1,
    passive: "Every coin detonates in an area — hits the whole pack",
    model: { size: 0.78 },
    unlocked: true,
    colors: {
      hood: "#0b0b0d",
      suit: "#101014",
      band: "#f0c75e",
      scarf: "#f5f5f5",
      eyes: "#ffe9b0",
      belt: "#f0c75e",
    },
  },
  theo: {
    id: "theo",
    name: "THEO",
    title: "the x1 ai",
    description: "AI utility character. Smart targeting, chaining pulses, more options.",
    playstyle: "Prompt pulses lock on anywhere, chain to a second target, and glitch enemies backwards. His FTS5 Scan marks the field for +50% damage — and the AI surfaces 4 upgrade choices instead of 3.",
    weapon: { kind: "pulse", name: "AI Prompt Pulse", desc: "auto-locked pulses that chain between enemies" },
    hp: 0.8,
    armor: 0,
    speed: 1,
    dmg: 0.9,
    cooldown: 0.8,
    luck: 1.2,
    xp: 1.15,
    choices: 4,
    passive: "AI-assisted level-ups: pick from 4 upgrades, not 3",
    model: { size: 0.62 },
    unlocked: true,
    colors: {
      hood: "#0e2733",
      suit: "#0a1c26",
      band: "#7dd3fc",
      scarf: "#0891b2",
      eyes: "#67e8f9",
      belt: "#7dd3fc",
    },
  },
  capy: {
    id: "capy",
    name: "CAPY",
    title: "validator protector",
    description: "Tank melee. Validator Shield: immune 2.5s of every 10s.",
    playstyle: "Wades in and cleaves. The Validator Shield cycles — 2.5s immune, 7.5s exposed — so time your dives.",
    weapon: { kind: "slash", name: "Bad Block Slash", desc: "sweeping cleave in front of you" },
    hp: 1.35,
    armor: 0.08,
    speed: 0.85,
    dmg: 1.3,
    cooldown: 1.15,
    luck: 1,
    xp: 1,
    passive: "Validator Shield: immune 2.5s of every 10s",
    model: { size: 0.65 },
    unlocked: true,
    colors: {
      hood: "#7a5f3d",
      suit: "#5f4a2e",
      band: "#4ade80",
      scarf: "#22c55e",
      eyes: "#bbf7d0",
      belt: "#4ade80",
    },
  },
  mystery: {
    id: "mystery",
    name: "???",
    title: "coming soon",
    description: "A new challenger approaches.",
    playstyle: "Unrevealed.",
    weapon: { kind: "shuriken", name: "???", desc: "unknown" },
    hp: 1,
    armor: 0,
    speed: 1,
    dmg: 1,
    cooldown: 1,
    luck: 1,
    xp: 1,
    passive: "Unrevealed.",
    unlocked: false,
    colors: {
      hood: "#232936",
      suit: "#1a1f2c",
      band: "#6b7280",
      scarf: "#4b5563",
      eyes: "#9ca3af",
      belt: "#6b7280",
    },
  },
};
