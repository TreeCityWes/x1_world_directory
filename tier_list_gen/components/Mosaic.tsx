"use client";

type Props = {
  urls: string[];
};

export function Mosaic({ urls }: Props) {
  if (urls.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg bg-[var(--bg)] text-xs tracking-wide text-[var(--muted)] uppercase">
        Empty library
      </div>
    );
  }

  return (
    <div className="grid h-36 grid-cols-2 grid-rows-2 overflow-hidden rounded-lg bg-[#0b0a09]">
      {urls.slice(0, 4).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${src}-${i}`} src={src} alt="" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}
