"use client";

import { HEX, rgba } from "@/lib/theme";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { monoFont } from "@/lib/canvasFont";

// The literal "BUG"/"GAS" word labels are retired (GLM design review: the
// silhouettes already read; words lowered the tone). In their place: form
// that carries the SAME message — glitch hex on the Bug, a gwei ticker on
// the Gas Wisp.

// glitch carapace band for the Bug — mobs render at 0.2 scale, so text is
// mush; BOLD abstract corruption (broken bars + chromatic offsets) reads
// as "digital glitch" at any distance
let glitchTex: THREE.CanvasTexture | null = null;
function getGlitchTexture() {
  if (glitchTex) return glitchTex;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = rgba(HEX.glitchBack, 0.92);
  ctx.beginPath();
  ctx.roundRect(20, 44, 472, 168, 28);
  ctx.fill();
  // corrupted-barcode rows: thick amber blocks with dropouts
  const rows = [
    [36, 68, 24, 60, 16, 92, 40],
    [80, 20, 52, 36, 68, 24, 88],
    [24, 84, 32, 72, 20, 56, 60],
  ];
  rows.forEach((widths, r) => {
    let x = 36;
    const y = 64 + r * 48;
    widths.forEach((w, j) => {
      if (j % 2 === 0) {
        ctx.fillStyle = r === 1 ? rgba(HEX.glitchAmberBright, 0.95) : rgba(HEX.glitchAmber, 0.6);
        ctx.fillRect(x, y, w, 28);
      }
      x += w + 8;
    });
  });
  // chromatic offset slivers — the glitch signature, offset L/R for RGB split
  ctx.fillStyle = rgba(HEX.cyanHot, 0.85);
  ctx.fillRect(20, 92, 472, 8);
  ctx.fillStyle = rgba(HEX.glitchPink, 0.7);
  ctx.fillRect(20, 164, 472, 8);
  ctx.fillStyle = rgba(HEX.cyanHot, 0.35);
  ctx.fillRect(26, 96, 472, 6);
  ctx.fillStyle = rgba(HEX.glitchPink, 0.35);
  ctx.fillRect(14, 168, 472, 6);
  // subtle scanlines + noise so it doesn't read as flat rectangles
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let y = 44; y < 212; y += 4) {
    ctx.fillRect(20, y, 472, 1);
  }
  for (let i = 0; i < 120; i++) {
    const x = 20 + Math.random() * 472;
    const y = 44 + Math.random() * 168;
    const w = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(x, y, w, 1);
  }
  glitchTex = new THREE.CanvasTexture(c);
  glitchTex.magFilter = THREE.NearestFilter;
  glitchTex.minFilter = THREE.NearestFilter;
  return glitchTex;
}

// rising fee readouts for the Gas Wisp's chest ticker — cycled in useFrame
let gweiTexes: THREE.CanvasTexture[] | null = null;
function getGweiTexes() {
  if (gweiTexes) return gweiTexes;
  gweiTexes = ["212", "487", "990"].map((n) => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = rgba(HEX.gweiBack, 0.9);
    ctx.beginPath();
    ctx.roundRect(28, 14, 200, 100, 16);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = monoFont(900, 56);
    ctx.fillStyle = HEX.gweiText;
    ctx.fillText(`▲${n}`, 128, 50);
    ctx.font = monoFont(700, 24);
    ctx.fillStyle = rgba(HEX.gweiTextDim, 0.8);
    ctx.fillText("GWEI", 128, 92);
    return new THREE.CanvasTexture(c);
  });
  return gweiTexes;
}

// soft radial puff for the Gas Wisp smoke — white-hot center, amber falloff,
// feathered alpha. Tinted per-sprite so the lead puff burns cyan-hot.
let wispPuffTex: THREE.CanvasTexture | null = null;
function getWispPuffTexture() {
  if (wispPuffTex) return wispPuffTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.18, "rgba(255,228,158,0.75)");
  g.addColorStop(0.45, "rgba(245,169,75,0.35)");
  g.addColorStop(0.75, "rgba(245,169,75,0.08)");
  g.addColorStop(1, "rgba(245,169,75,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  wispPuffTex = new THREE.CanvasTexture(c);
  return wispPuffTex;
}

/**
 * Crypto-native enemy cast, all procedural (built ~1 unit tall/long; the
 * pool wrapper scales them). The sync loop drives position/facing/wobble;
 * these stay static internally. +Z faces the ninja.
 */

/** THE BUG — an exploit crawling out of the codebase. Segmented, splayed,
 *  glowing — unmistakably insect. Wasp-amber, NOT green: green belongs to
 *  CAPY (color bible: identity colors are heroes-only, warm = hostile). */
export function BugMob() {
  return (
    <group position={[0, 0.26, 0]}>
      {/* bulbous abdomen, low and long */}
      <mesh position={[0, 0, -0.3]} scale={[0.3, 0.22, 0.42]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color={HEX.bugAbdomen} emissive={HEX.glitchAmber} emissiveIntensity={0.22} roughness={0.35} />
      </mesh>
      {/* glitch-hex band draped over the shell (open cylinder segment) —
          the exploit is literally code crawling on the carapace */}
      <mesh position={[0, -0.05, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.46, 24, 1, true, Math.PI - 0.78, 1.56]} />
        <meshBasicMaterial
          map={getGlitchTexture()}
          transparent
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* thorax segment */}
      <mesh position={[0, 0.02, 0.1]} scale={[0.22, 0.18, 0.22]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={HEX.bugThorax} roughness={0.4} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.03, 0.36]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial color={HEX.bugHead} roughness={0.45} />
      </mesh>
      {/* BIG compound eyes — intensity trimmed from 2.8 so bloom stops white-clipping */}
      <mesh position={[0.1, 0.08, 0.44]}>
        <sphereGeometry args={[0.085, 8, 8]} />
        <meshStandardMaterial color={HEX.crimson} emissive={HEX.crimson} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[-0.1, 0.08, 0.44]}>
        <sphereGeometry args={[0.085, 8, 8]} />
        <meshStandardMaterial color={HEX.crimson} emissive={HEX.crimson} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      {/* mandibles — pincers curving inward */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, -0.03, 0.5]} rotation={[1.35, 0, s * -0.5]}>
          <coneGeometry args={[0.035, 0.16, 5]} />
          <meshStandardMaterial color={HEX.glitchAmber} emissive={HEX.bugMandibleEmissive} emissiveIntensity={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* six legs, splayed WIDE then down — insect stance, not sheep hooves */}
      {[-0.34, -0.08, 0.2].map((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`} position={[s * 0.26, -0.02, z]} rotation={[0, 0, s * 1.25]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.02, 0.028, 0.32, 5]} />
              <meshStandardMaterial color={HEX.bugLeg} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.34, 0]} rotation={[0, 0, s * -1.9]}>
              <cylinderGeometry args={[0.016, 0.022, 0.26, 5]} />
              <meshStandardMaterial color={HEX.bugLegDark} roughness={0.5} />
            </mesh>
          </group>
        )),
      )}
      {/* long antennae sweeping forward */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.2, 0.5]} rotation={[1.0, 0, s * -0.3]}>
          <cylinderGeometry args={[0.012, 0.018, 0.4, 4]} />
          <meshStandardMaterial color={HEX.glitchAmber} emissive={HEX.glitchAmber} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

/** True only when the object and all its ancestors are visible — pooled mobs
 *  sit in a `visible={false}` group when dead, and useFrame still ticks. */
function isShown(o: THREE.Object3D | null): boolean {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}

/** GAS WISP — a fee spike come alive: a little flame-ghost, not a cone. */
export function GasWisp() {
  // dissipating gas cloud: puffs rise off the wisp, swell, fade, and billow
  const root = useRef<THREE.Group>(null);
  const smoke = useRef<(THREE.Sprite | null)[]>([]);
  const ticker = useRef<THREE.MeshBasicMaterial>(null);
  const tickerIdx = useRef(-1);
  useFrame((state) => {
    if (!isShown(root.current)) return; // skip the math while dead/off-screen
    const t = state.clock.elapsedTime;
    // the fee ticker climbs — 212 → 487 → 990 gwei, then rolls over
    const idx = Math.floor(t * 1.6) % 3;
    if (ticker.current && idx !== tickerIdx.current) {
      tickerIdx.current = idx;
      ticker.current.map = getGweiTexes()[idx];
      ticker.current.needsUpdate = true;
    }
    for (let i = 0; i < 4; i++) {
      const m = smoke.current[i];
      if (!m) continue;
      const ph = (t * 0.45 + i / 4) % 1; // staggered 0..1 loops
      m.position.set(
        Math.sin((t + i * 2.3) * 1.6) * 0.1,
        0.15 + ph * 0.6,
        -0.08 + Math.cos((t + i * 1.7) * 1.3) * 0.08,
      );
      const sc = 0.22 + ph * 0.58;
      m.scale.set(sc, sc, 1);
      m.updateMatrix(); // pool children are matrix-frozen — compose by hand
      const mat = m.material as THREE.SpriteMaterial;
      mat.opacity = 0.32 * (1 - ph);
      mat.rotation = t * (0.8 + i * 0.3) + i * 1.7;
    }
  });
  return (
    <group ref={root} position={[0, 0.34, 0]}>
      {/* rising smoke puffs — soft billboards instead of low-poly spheres */}
      {Array.from({ length: 4 }).map((_, i) => (
        <sprite key={`s${i}`} ref={(el) => { smoke.current[i] = el; }}>
          <spriteMaterial
            map={getWispPuffTexture()}
            color={i === 0 ? HEX.cyanHot : HEX.wispAmber}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
      {/* jagged dorsal fin: a gwei candle-spike riding the wisp's back */}
      <mesh position={[0, 0.36, -0.08]} rotation={[-0.35, 0, 0]} scale={[0.06, 0.32, 0.14]}>
        <coneGeometry args={[1, 1, 3]} />
        <meshStandardMaterial color={HEX.cyanHot} emissive={HEX.pulseGlow} emissiveIntensity={2.2} toneMapped={false} roughness={0.25} />
      </mesh>
      {/* smooth ghost dome — nothing on top, just a clean rounded head.
          was color #ff9a3d / emissive #ff7a1f, shifted into amber-gold */}
      <mesh position={[0, 0.04, 0]} scale={[0.3, 0.36, 0.3]}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshStandardMaterial
          color={HEX.wispAmber}
          emissive={HEX.wispEmber}
          emissiveIntensity={1.5}
          transparent
          opacity={0.92}
          roughness={0.3}
        />
      </mesh>
      {/* wavy ghost skirt — three lobes poking below.
          was color #ff8a2d / emissive #ff6a15, shifted into amber-gold */}
      {[-0.16, 0, 0.16].map((x, i) => (
        <mesh key={x} position={[x, -0.32 + (i === 1 ? -0.06 : 0), 0]} scale={[0.11, 0.14, 0.11]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color={HEX.wispAmber} emissive={HEX.wispEmber} emissiveIntensity={1.2} transparent opacity={0.85} />
        </mesh>
      ))}
      {/* white-hot core — intensity trimmed from 3.2 so bloom stops white-clipping */}
      <mesh position={[0, -0.04, 0.08]} scale={[0.16, 0.22, 0.16]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color={HEX.wispCore} emissive={HEX.wispCoreEmissive} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      {/* angry slanted eyes */}
      <mesh position={[0.1, 0.08, 0.26]} rotation={[0, 0, -0.5]} scale={[0.06, 0.035, 0.03]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={HEX.gweiBack} roughness={0.4} />
      </mesh>
      <mesh position={[-0.1, 0.08, 0.26]} rotation={[0, 0, 0.5]} scale={[0.06, 0.035, 0.03]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={HEX.gweiBack} roughness={0.4} />
      </mesh>
      {/* live fee readout on the chest — the "spike" told as a number,
          not a word label (map cycled by the useFrame above) */}
      <mesh position={[0, -0.12, 0.28]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial
          ref={ticker}
          map={getGweiTexes()[0]}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// hand-tied fringe variation — deterministic so re-renders stay stable
const TASSEL_JITTER = [
  { rz: 0.05, rx: -0.08, len: 1.05 },
  { rz: -0.12, rx: 0.1, len: 0.92 },
  { rz: 0.08, rx: 0.05, len: 1.12 },
  { rz: -0.06, rx: -0.12, len: 0.88 },
  { rz: 0.13, rx: 0.07, len: 1.0 },
  { rz: -0.09, rx: -0.05, len: 0.95 },
  { rz: 0.07, rx: 0.11, len: 1.08 },
  { rz: -0.14, rx: -0.07, len: 0.9 },
  { rz: 0.1, rx: 0.06, len: 1.02 },
  { rz: -0.05, rx: -0.1, len: 0.97 },
];

/** Subdivided box with a gentle frozen wave baked into vertex positions. */
function wavyBox(w: number, h: number, d: number, freq = 2.2, amp = 0.045) {
  const geo = new THREE.BoxGeometry(w, h, d, 8, 1, 12);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.y += amp * Math.sin(v.z * freq) * Math.cos(v.x * freq * 0.6);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** THE RUG — a possessed flying carpet mid-strike: frozen wave body, uneven
 *  hand-tied fringe, eyes glaring over the leading edge. */
export function RugMob() {
  const RUG = HEX.rugCrimson;
  const RUG_DARK = HEX.rugCrimsonDark;
  const TRIM = HEX.gold;
  const bodyGeo = useMemo(() => wavyBox(0.8, 0.035, 0.8), []);
  const rearGeo = useMemo(() => wavyBox(0.8, 0.035, 0.7), []);
  // deterministic hand-tied fringe variation (avoids impure random in render)
  const tasselJitter = TASSEL_JITTER;
  return (
    <group position={[0, 0.1, 0]}>
      {/* carpet body — gentle frozen wave instead of dead-flat boxes */}
      <mesh position={[0, 0.02, -0.4]} geometry={bodyGeo}>
        <meshStandardMaterial color={RUG} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0.35]} geometry={rearGeo}>
        <meshStandardMaterial color={RUG_DARK} roughness={0.85} />
      </mesh>
      {/* gold border running along both long edges (carpet frame) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.37, 0.03, -0.05]}>
          <boxGeometry args={[0.07, 0.04, 1.5]} />
          <meshStandardMaterial color={TRIM} metalness={0.5} roughness={0.4} emissive={HEX.goldEmissive} emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* center medallion — the classic carpet diamond */}
      <mesh position={[0, 0.045, -0.1]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.26, 0.02, 0.26]} />
        <meshStandardMaterial color={TRIM} metalness={0.55} roughness={0.35} emissive={HEX.goldEmissive} emissiveIntensity={0.35} />
      </mesh>
      {/* eyes on the leading edge, glaring ahead — intensity trimmed from 3 so bloom stops white-clipping */}
      <mesh position={[0.15, 0.08, 0.68]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={HEX.coin} emissive={HEX.coin} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[-0.15, 0.08, 0.68]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={HEX.coin} emissive={HEX.coin} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      {/* fringe tassels — uneven, hand-tied */}
      {[-0.3, -0.15, 0, 0.15, 0.3, -0.28, -0.14, 0, 0.14, 0.28].map((x, i) => {
        const back = i >= 5;
        const jitter = tasselJitter[i];
        return (
          <mesh
            key={x + (back ? "b" : "f")}
            position={[x, 0.02, back ? 0.76 : -0.87]}
            rotation={[jitter.rx, 0, jitter.rz]}
          >
            <boxGeometry args={[0.06, 0.025, back ? 0.13 * jitter.len : 0.14 * jitter.len]} />
            <meshStandardMaterial
              color={TRIM}
              roughness={0.6}
              emissive={back ? HEX.goldEmissive : undefined}
              emissiveIntensity={back ? 0.4 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
