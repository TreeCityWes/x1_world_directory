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

/** Tracks WASD/arrow state in a ref (no re-renders — read it in useFrame). */
export function useKeyboard() {
  const keys = useRef<Keys>({ forward: false, back: false, left: false, right: false });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
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
