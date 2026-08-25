"use client";

type Props = {
  name: string;
  src?: string;
  selected?: boolean;
  size?: "sm" | "md";
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
};

export function AssetTile({
  name,
  src,
  selected,
  size = "md",
  draggable,
  onDragStart,
  onClick,
}: Props) {
  const dim = size === "sm" ? "h-16 w-16" : "h-[88px] w-[88px]";
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={name}
      className={`${dim} relative shrink-0 overflow-hidden rounded-md border bg-[#0b0a09] text-left shadow-sm ${
        selected ? "border-[var(--brass)] ring-2 ring-[var(--brass)]" : "border-black/20"
      }`}
    >
      {src ? (
        // User-uploaded blob URLs — next/image cannot optimize these.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-[var(--muted)]">
          {name}
        </span>
      )}
    </button>
  );
}
