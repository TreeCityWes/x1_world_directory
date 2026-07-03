"use client";

/**
 * Tiny WebAudio synth — all SFX are generated, no assets. Context is created
 * lazily on the first effect after a user gesture (autoplay-safe). Mute
 * persists in localStorage.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted =
  typeof window !== "undefined" && localStorage.getItem("x1world_muted") === "1";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const muteListeners = new Set<() => void>();
export function isMuted() {
  return muted;
}
/** for useSyncExternalStore — UI stays in sync with the module flag */
export function subscribeMute(cb: () => void) {
  muteListeners.add(cb);
  return () => {
    muteListeners.delete(cb);
  };
}
export function toggleMute() {
  muted = !muted;
  if (typeof window !== "undefined") localStorage.setItem("x1world_muted", muted ? "1" : "0");
  muteListeners.forEach((l) => l());
  return muted;
}

type BlipOpts = {
  freq: number;
  end?: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
};

function blip({ freq, end, dur = 0.1, type = "sine", vol = 0.12, delay = 0 }: BlipOpts) {
  if (muted) return;
  const a = ac();
  if (!a || !master) return;
  try {
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // audio is decoration — never break the game
  }
}

let lastCoinAt = 0;

export const sfx = {
  /** classic two-tone coin — rate-limited so magnet vacuums don't shriek */
  coin() {
    const now = performance.now();
    if (now - lastCoinAt < 60) return;
    lastCoinAt = now;
    blip({ freq: 988, dur: 0.06, vol: 0.08 });
    blip({ freq: 1319, dur: 0.14, vol: 0.08, delay: 0.06 });
  },
  throw() {
    blip({ freq: 320, end: 160, dur: 0.05, type: "triangle", vol: 0.03 });
  },
  kill() {
    blip({ freq: 220, end: 55, dur: 0.09, type: "square", vol: 0.06 });
  },
  bite() {
    blip({ freq: 130, end: 55, dur: 0.14, type: "square", vol: 0.16 });
  },
  capture() {
    [659, 880, 1319].forEach((f, i) => blip({ freq: f, dur: 0.12, vol: 0.1, delay: i * 0.07 }));
  },
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) =>
      blip({ freq: f, dur: 0.14, vol: 0.09, delay: i * 0.06 }),
    );
  },
  evolve() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
      blip({ freq: f, dur: 0.18, type: "sawtooth", vol: 0.06, delay: i * 0.07 }),
    );
  },
  boss() {
    blip({ freq: 55, end: 110, dur: 0.7, type: "sawtooth", vol: 0.18 });
    blip({ freq: 58, end: 112, dur: 0.7, type: "sawtooth", vol: 0.14, delay: 0.02 });
  },
  death() {
    [330, 262, 196, 131].forEach((f, i) =>
      blip({ freq: f, end: f * 0.7, dur: 0.22, type: "triangle", vol: 0.12, delay: i * 0.16 }),
    );
  },
  win() {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) =>
      blip({ freq: f, dur: 0.2, vol: 0.09, delay: i * 0.09 }),
    );
  },
  ui() {
    blip({ freq: 700, end: 900, dur: 0.05, type: "triangle", vol: 0.05 });
  },
};
