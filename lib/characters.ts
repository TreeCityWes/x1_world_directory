/**
 * Playable character registry — fully data-driven. Adding a character means
 * adding an entry here (+ a palette/visual key); the game loop reads mods
 * and weapon kind, never character names.
 */

export type CharacterId = "ninja" | "jack" | "theo" | "capy";
export type WeaponKind = "shuriken" | "xcoin" | "pulse" | "slash";

export type CharacterDef = {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  playstyle: string;
  weapon: { kind: WeaponKind; name: string; desc: string };
  /** multipliers vs. the ninja baseline (1 = baseline) */
  hp: number;
  armor: number; // flat extra damage reduction (0..1)
  speed: number;
  dmg: number;
  cooldown: number; // >1 = slower attacks
  luck: number; // chance-based coin bonuses scale off (luck - 1)
  xp: number;
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

export const CHARACTER_ORDER: CharacterId[] = ["ninja", "jack", "theo", "capy"];

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  ninja: {
    id: "ninja",
    name: "X1 Ninja",
    title: "the balanced blade",
    description: "Balanced starter. Throws fast shurikens.",
    playstyle: "Reliable, fast, simple — auto-throws ninja stars at whatever's closest to dying.",
    weapon: { kind: "shuriken", name: "Shuriken Throw", desc: "rapid auto-thrown stars" },
    hp: 1,
    armor: 0,
    speed: 1,
    dmg: 1,
    cooldown: 1,
    luck: 1,
    xp: 1,
    unlocked: true,
    colors: {
      hood: "#232936",
      suit: "#1a1f2c",
      band: "#39c7f5",
      scarf: "#1e6fff",
      eyes: "#7dd3fc",
      belt: "#f0c75e",
    },
  },
  jack: {
    id: "jack",
    name: "Jack Levin",
    title: "the founder",
    description: "Founder burst character. Uses exploding X coins.",
    playstyle: "Slow, deliberate throws — each black-and-white X coin detonates in an area. Devastating against packs.",
    weapon: { kind: "xcoin", name: "XEN Network Attack", desc: "X coins that explode like bombs" },
    hp: 1.05,
    armor: 0,
    speed: 0.95,
    dmg: 1.6,
    cooldown: 1.6,
    luck: 1,
    xp: 1,
    unlocked: true,
    colors: {
      hood: "#0b0b0d",
      suit: "#101014",
      band: "#f5f5f5",
      scarf: "#e8e8e8",
      eyes: "#ffffff",
      belt: "#f0c75e",
    },
  },
  theo: {
    id: "theo",
    name: "THEO",
    title: "the x1 ai",
    description: "AI utility character. Smart targeting and debuffs.",
    playstyle: "Prompt pulses lock onto targets perfectly and glitch them backwards. Fragile, but levels fast.",
    weapon: { kind: "pulse", name: "AI Prompt Pulse", desc: "auto-locked pulses that debug enemies" },
    hp: 0.8,
    armor: 0,
    speed: 1,
    dmg: 0.85,
    cooldown: 0.8,
    luck: 1.3,
    xp: 1.25,
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
    description: "Tank melee character. Slashes bad blocks with a sword.",
    playstyle: "Wades in and cleaves everything in front of it. Thick hide, slow feet, heavy sword.",
    weapon: { kind: "slash", name: "Bad Block Slash", desc: "close-range cleave in your path" },
    hp: 1.35,
    armor: 0.15,
    speed: 0.85,
    dmg: 1.3,
    cooldown: 1.15,
    luck: 1,
    xp: 1,
    unlocked: true,
    colors: {
      hood: "#8b6f47",
      suit: "#6e5636",
      band: "#4ade80",
      scarf: "#3f6212",
      eyes: "#2d1c0e",
      belt: "#4ade80",
    },
  },
};
