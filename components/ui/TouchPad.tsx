"use client";

import { touchKeys } from "@/lib/touchInput";

type Dir = keyof typeof touchKeys;

const PAD: { dir: Dir; label: string; cls: string }[] = [
  { dir: "forward", label: "▲", cls: "col-start-2 row-start-1" },
  { dir: "left", label: "◀", cls: "col-start-1 row-start-2" },
  { dir: "right", label: "▶", cls: "col-start-3 row-start-2" },
  { dir: "back", label: "▼", cls: "col-start-2 row-start-3" },
];

/** Mobile D-pad — drives the same movement state as WASD. Hidden on md+. */
export default function TouchPad() {
  const press = (dir: Dir, down: boolean) => () => {
    touchKeys[dir] = down;
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 grid select-none grid-cols-3 grid-rows-3 gap-1 md:hidden">
      {PAD.map(({ dir, label, cls }) => (
        <button
          key={dir}
          aria-label={`walk ${dir}`}
          className={`${cls} grid h-12 w-12 place-items-center rounded-lg border border-cyan/30 bg-[rgba(9,13,28,0.7)] text-sm text-cyan backdrop-blur active:border-gold/70 active:text-gold`}
          style={{ touchAction: "none" }}
          onPointerDown={press(dir, true)}
          onPointerUp={press(dir, false)}
          onPointerLeave={press(dir, false)}
          onPointerCancel={press(dir, false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
