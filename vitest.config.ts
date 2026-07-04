import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // mirror tsconfig's "@/*" → repo root
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    // pure game-math tests — node env; the "use client" modules under test
    // guard every window/localStorage touch, so no DOM shim is needed
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
