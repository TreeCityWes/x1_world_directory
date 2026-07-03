"use client";

import { useEffect, useRef } from "react";

export type Keys = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
};

const MAP: Record<string, keyof Keys> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

/** True when the user is typing in a field — game keys must not interfere. */
export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

/** Tracks WASD/arrow state in a ref (no re-renders — read it in useFrame). */
export function useKeyboard() {
  const keys = useRef<Keys>({ forward: false, back: false, left: false, right: false });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return; // let inputs have their letters
      const k = MAP[e.code];
      if (!k) return;
      e.preventDefault(); // keep arrows from scrolling anything
      keys.current[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = MAP[e.code];
      if (k) keys.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}
