/**
 * Coarse device-quality flag: true on phones/tablets (touch pointer or narrow
 * viewport). Drives star count, MSAA, and 3D tessellation so weak GPUs render
 * a lighter scene. Evaluated once at import; client-only ("use client" callers).
 */
export const LOW_GPU =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 768);
