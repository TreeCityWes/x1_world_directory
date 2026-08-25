"use client";

import { useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_ASSET_BYTES } from "@/lib/defaults";

type Props = {
  onFiles: (files: File[]) => void | Promise<void>;
  busy?: boolean;
  label?: string;
};

export function UploadDropzone({ onFiles, busy, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(list: FileList | File[]) {
    const files = [...list].filter((file) => file.type.startsWith("image/"));
    if (files.length) void onFiles(files);
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition ${
        over
          ? "border-[var(--brass)] bg-[var(--brass-dim)]"
          : "border-[var(--hairline)] bg-[var(--surface)] hover:border-[var(--brass)]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) take(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="font-serif text-2xl text-[var(--ink)]">
        {busy ? "Adding…" : label ?? "Drop images here"}
      </span>
      <span className="max-w-sm text-sm text-[var(--muted)]">
        PNG, JPG, WEBP, GIF, or SVG · up to {Math.round(MAX_ASSET_BYTES / 1024 / 1024)}MB each.
        Saved to this library on this device.
      </span>
    </button>
  );
}
