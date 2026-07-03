"use client";

import dynamic from "next/dynamic";

// `ssr: false` dynamic imports must live inside a Client Component in this
// version of Next.js — that's why this thin wrapper exists. It keeps the WebGL
// Experience out of server rendering. See docs/BUILD-PLAN.md.
const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center text-ink-dim">
      Loading the world…
    </div>
  ),
});

export default function ExperienceLoader() {
  return <Experience />;
}
