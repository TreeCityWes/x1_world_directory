"use client";

import { useRef } from "react";
import { touchStick } from "@/lib/touchInput";

const RADIUS = 44; // knob travel in px

/**
 * Mobile virtual joystick — a radial analog stick like every mobile game.
 * Drag anywhere on the base; the knob follows your thumb (clamped to the
 * ring) and writes a normalized vector into touchStick. Hidden on md+.
 */
export default function TouchPad() {
  const knob = useRef<HTMLDivElement | null>(null);
  const base = useRef<HTMLDivElement | null>(null);

  const move = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    touchStick.x = dx / RADIUS; // right +
    touchStick.y = -dy / RADIUS; // up = forward +
    touchStick.active = true;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const release = () => {
    touchStick.x = 0;
    touchStick.y = 0;
    touchStick.active = false;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <div
      ref={base}
      className="pointer-events-auto absolute bottom-4 right-4 grid h-28 w-28 select-none place-items-center rounded-full border border-cyan/30 bg-[rgba(9,13,28,0.55)] backdrop-blur md:hidden"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* subtle cross ticks so it reads as a stick, not a button */}
      <span className="absolute top-2 font-mono text-[9px] text-cyan/50">▲</span>
      <span className="absolute bottom-2 font-mono text-[9px] text-cyan/50">▼</span>
      <span className="absolute left-2 font-mono text-[9px] text-cyan/50">◀</span>
      <span className="absolute right-2 font-mono text-[9px] text-cyan/50">▶</span>
      <div
        ref={knob}
        className="h-12 w-12 rounded-full border border-gold/60 bg-gradient-to-b from-[#ffd97a]/30 to-[#c9921e]/30 shadow-[0_0_16px_rgba(240,199,94,0.35)] transition-transform duration-75"
      />
    </div>
  );
}
