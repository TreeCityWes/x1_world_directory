"use client";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * Tiny WebAudio synth — all SFX are generated, no assets. Context is created
 * lazily on the first effect after a user gesture (autoplay-safe). Mute
 * persists in localStorage.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxMuted =
  typeof window !== "undefined" && localStorage.getItem("x1world_muted") === "1";
let musicMuted =
  typeof window !== "undefined" && localStorage.getItem("x1world_music_muted") === "1";

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

// ---- SFX mute ----

const sfxMuteListeners = new Set<() => void>();
export function isMuted() {
  return sfxMuted;
}
/** for useSyncExternalStore — UI stays in sync with the module flag */
export function subscribeMute(cb: () => void) {
  sfxMuteListeners.add(cb);
  return () => {
    sfxMuteListeners.delete(cb);
  };
}
export function toggleMute() {
  sfxMuted = !sfxMuted;
  if (typeof window !== "undefined") localStorage.setItem("x1world_muted", sfxMuted ? "1" : "0");
  sfxMuteListeners.forEach((l) => l());
  return sfxMuted;
}

// ---- music mute ----

const musicMuteListeners = new Set<() => void>();
export function isMusicMuted() {
  return musicMuted;
}
export function subscribeMusicMute(cb: () => void) {
  musicMuteListeners.add(cb);
  return () => {
    musicMuteListeners.delete(cb);
  };
}
export function toggleMusicMute() {
  musicMuted = !musicMuted;
  if (typeof window !== "undefined") localStorage.setItem("x1world_music_muted", musicMuted ? "1" : "0");
  if (musicGain) {
    const a = ac();
    if (a) {
      const target = musicMuted ? 0 : MUSIC_VOL;
      musicGain.gain.setTargetAtTime(target, a.currentTime, 0.15);
    }
  }
  musicMuteListeners.forEach((l) => l());
  return musicMuted;
}

// ---- procedural ambient bed ----

const MUSIC_VOL = 0.16;
let musicStarted = false;
let musicGain: GainNode | null = null;
let musicDuck: GainNode | null = null;

export function startMusic() {
  if (musicStarted) return;
  const a = ac();
  if (!a) return;
  if (prefersReducedMotion.current) return;

  musicGain = a.createGain();
  musicGain.gain.value = 0;
  musicDuck = a.createGain();
  musicDuck.gain.value = 1;
  musicGain.connect(musicDuck).connect(a.destination);

  // deep drone: two detuned lows + a harmonic fifth
  const freqs = [55, 82.41, 110];
  freqs.forEach((f) => {
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = a.createGain();
    g.gain.value = 0.06;
    osc.connect(g).connect(musicGain!);
    osc.start();
  });

  // filtered noise pad for texture
  const noise = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  const g = a.createGain();
  g.gain.value = 0.04;
  src.connect(filter).connect(g).connect(musicGain!);
  src.start();

  if (!musicMuted) {
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOL, a.currentTime + 2.5);
  }
  musicStarted = true;
}

/** Duck (0..1) or boost the ambient bed based on combat intensity. */
export function duckMusic(factor: number) {
  if (!musicDuck) return;
  const a = ac();
  if (!a) return;
  musicDuck.gain.setTargetAtTime(Math.max(0.04, Math.min(1, factor)), a.currentTime, 0.25);
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
  if (sfxMuted) return;
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
let lastTelegraphAt = 0;

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
    // low-frequency danger swell under the existing brass stab
    blip({ freq: 36, end: 92, dur: 1.1, type: "sine", vol: 0.2 });
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
  /** warning ring tighten — short rising tone, rate-limited during bursts */
  telegraph() {
    const now = performance.now();
    if (now - lastTelegraphAt < 90) return;
    lastTelegraphAt = now;
    blip({ freq: 180, end: 360, dur: 0.2, type: "sine", vol: 0.04 });
  },
};
