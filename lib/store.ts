"use client";

import { create } from "zustand";

/**
 * World interaction state. The info panel shows, in priority order:
 * selected (clicked / E) → near (walked up to) → hovered → featured default.
 * Walking up to a NEW project clears a stale click — fresh intent wins.
 */
type WorldState = {
  nearId: string | null;
  /** Closest landmark to the player, regardless of range — never null after frame 1. */
  closestId: string | null;
  hoveredId: string | null;
  selectedId: string | null;
  setNear: (id: string | null) => void;
  setClosest: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  select: (id: string | null) => void;
};

export const useWorld = create<WorldState>((set) => ({
  nearId: null,
  closestId: null,
  hoveredId: null,
  selectedId: null,
  setNear: (id) =>
    set((s) => ({
      nearId: id,
      selectedId: id !== null && id !== s.nearId ? null : s.selectedId,
    })),
  setClosest: (id) => set({ closestId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  select: (id) => set({ selectedId: id }),
}));
