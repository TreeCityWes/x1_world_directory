"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";

export function NewPackForm() {
  const router = useRouter();
  const { createPack } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const pack = await createPack(name, description);
    router.push(`/packs/${pack.id}`);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--brass)] uppercase">
          New library
        </p>
        <h1 className="mt-2 font-serif text-5xl">Collect the pieces</h1>
        <p className="mt-3 text-[var(--muted)]">
          A library is a saved set of images. Upload once, then rank them on as many lists as you like.
        </p>
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-[var(--muted)]">Name</span>
        <input
          className="field"
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Summer 2026 anime"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[var(--muted)]">Description</span>
        <textarea
          className="field min-h-24"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes"
        />
      </label>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Create library"}
      </button>
    </form>
  );
}
