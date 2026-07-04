/**
 * One font for everything drawn into a CanvasTexture (site banners, damage
 * numbers, mob decals, the XEN coin face). next/font registers Geist Mono
 * under a hashed family name, reachable only through its CSS variable — so
 * resolve it once from the root element and cache it.
 */
let family: string | null = null;

function monoFamily(): string {
  if (family) return family;
  const v =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim()
      : "";
  family = v || "'Courier New', monospace";
  return family;
}

/** CSS font shorthand for ctx.font, e.g. monoFont(900, 72). */
export function monoFont(weight: number, px: number): string {
  return `${weight} ${px}px ${monoFamily()}`;
}
