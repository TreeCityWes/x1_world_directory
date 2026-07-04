"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { monoFont } from "@/lib/canvasFont";

// The literal "BUG"/"GAS" word labels are retired (GLM design review: the
// silhouettes already read; words lowered the tone). In their place: form
// that carries the SAME message — glitch hex on the Bug, a gwei ticker on
// the Gas Wisp.

// hex-glitch carapace band for the Bug — code crawling on the shell
let glitchTex: THREE.CanvasTexture | null = null;
function getGlitchTexture() {
  if (glitchTex) return glitchTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(20, 12, 3, 0.92)";
  ctx.beginPath();
  ctx.roundRect(10, 22, 236, 84, 14);
  ctx.fill();
  ctx.font = monoFont(700, 21);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const rows = ["0xDEAD BEEF 51", "F00D 0xC0DE 7F", "0BAD 1DEA 0x66"];
  rows.forEach((row, i) => {
    ctx.fillStyle = i === 1 ? "rgba(253, 224, 71, 0.95)" : "rgba(251, 191, 36, 0.55)";
    ctx.fillText(row, 22, 45 + i * 25);
  });
  // chromatic glitch slivers — the one digital tell
  ctx.fillStyle = "rgba(103, 232, 249, 0.7)";
  ctx.fillRect(10, 38, 236, 2);
  ctx.fillStyle = "rgba(244, 114, 182, 0.55)";
  ctx.fillRect(10, 84, 236, 2);
  glitchTex = new THREE.CanvasTexture(c);
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
    ctx.fillStyle = "rgba(26, 12, 5, 0.9)";
    ctx.beginPath();
    ctx.roundRect(28, 14, 200, 100, 16);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = monoFont(900, 56);
    ctx.fillStyle = "#ffb74a";
    ctx.fillText(`▲${n}`, 128, 50);
    ctx.font = monoFont(700, 24);
    ctx.fillStyle = "rgba(255, 154, 61, 0.8)";
    ctx.fillText("GWEI", 128, 92);
    return new THREE.CanvasTexture(c);
  });
  return gweiTexes;
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
        <meshStandardMaterial color="#1c1206" emissive="#fbbf24" emissiveIntensity={0.22} roughness={0.35} />
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
        <meshStandardMaterial color="#33260c" roughness={0.4} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.03, 0.36]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial color="#171004" roughness={0.45} />
      </mesh>
      {/* BIG compound eyes */}
      <mesh position={[0.1, 0.08, 0.44]}>
        <sphereGeometry args={[0.085, 8, 8]} />
        <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
      <mesh position={[-0.1, 0.08, 0.44]}>
        <sphereGeometry args={[0.085, 8, 8]} />
        <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
      {/* mandibles — pincers curving inward */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, -0.03, 0.5]} rotation={[1.35, 0, s * -0.5]}>
          <coneGeometry args={[0.035, 0.16, 5]} />
          <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* six legs, splayed WIDE then down — insect stance, not sheep hooves */}
      {[-0.34, -0.08, 0.2].map((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`} position={[s * 0.26, -0.02, z]} rotation={[0, 0, s * 1.25]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.02, 0.028, 0.32, 5]} />
              <meshStandardMaterial color="#3d2e10" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.34, 0]} rotation={[0, 0, s * -1.9]}>
              <cylinderGeometry args={[0.016, 0.022, 0.26, 5]} />
              <meshStandardMaterial color="#332609" roughness={0.5} />
            </mesh>
          </group>
        )),
      )}
      {/* long antennae sweeping forward */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.2, 0.5]} rotation={[1.0, 0, s * -0.3]}>
          <cylinderGeometry args={[0.012, 0.018, 0.4, 4]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} />
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
  // dissipating gas cloud: puffs rise off the wisp, swell, and fade
  const root = useRef<THREE.Group>(null);
  const smoke = useRef<(THREE.Mesh | null)[]>([]);
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
      m.scale.setScalar(0.1 + ph * 0.26);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - ph);
    }
  });
  return (
    <group ref={root} position={[0, 0.34, 0]}>
      {/* rising smoke puffs */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`s${i}`} ref={(el) => { smoke.current[i] = el; }}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ff9a3d" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {/* smooth ghost dome — nothing on top, just a clean rounded head */}
      <mesh position={[0, 0.04, 0]} scale={[0.3, 0.36, 0.3]}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshStandardMaterial
          color="#ff9a3d"
          emissive="#ff7a1f"
          emissiveIntensity={1.5}
          transparent
          opacity={0.92}
          roughness={0.3}
        />
      </mesh>
      {/* wavy ghost skirt — three lobes poking below */}
      {[-0.16, 0, 0.16].map((x, i) => (
        <mesh key={x} position={[x, -0.32 + (i === 1 ? -0.06 : 0), 0]} scale={[0.11, 0.14, 0.11]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#ff8a2d" emissive="#ff6a15" emissiveIntensity={1.2} transparent opacity={0.85} />
        </mesh>
      ))}
      {/* white-hot core */}
      <mesh position={[0, -0.04, 0.08]} scale={[0.16, 0.22, 0.16]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#fff3c4" emissive="#ffe08a" emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
      {/* angry slanted eyes */}
      <mesh position={[0.1, 0.08, 0.26]} rotation={[0, 0, -0.5]} scale={[0.06, 0.035, 0.03]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#1a0c05" roughness={0.4} />
      </mesh>
      <mesh position={[-0.1, 0.08, 0.26]} rotation={[0, 0, 0.5]} scale={[0.06, 0.035, 0.03]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#1a0c05" roughness={0.4} />
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

/** THE RUG — a possessed flying carpet mid-strike: flat patterned body in a
 *  frozen wave, front edge reared up like a cobra, eyes over the lip. */
export function RugMob() {
  const RUG = "#8b1f2f";
  const RUG_DARK = "#5f1420";
  const TRIM = "#f0c75e";
  return (
    <group position={[0, 0.1, 0]}>
      {/* carpet body — dead flat, one deck height */}
      <mesh position={[0, 0.02, -0.4]}>
        <boxGeometry args={[0.8, 0.035, 0.8]} />
        <meshStandardMaterial color={RUG} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0.35]}>
        <boxGeometry args={[0.8, 0.035, 0.7]} />
        <meshStandardMaterial color={RUG_DARK} roughness={0.85} />
      </mesh>
      {/* gold border running along both long edges (carpet frame) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.37, 0.03, -0.05]}>
          <boxGeometry args={[0.07, 0.04, 1.5]} />
          <meshStandardMaterial color={TRIM} metalness={0.5} roughness={0.4} emissive="#c9921e" emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* center medallion — the classic carpet diamond */}
      <mesh position={[0, 0.045, -0.1]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.26, 0.02, 0.26]} />
        <meshStandardMaterial color={TRIM} metalness={0.55} roughness={0.35} emissive="#c9921e" emissiveIntensity={0.35} />
      </mesh>
      {/* eyes on the leading edge, glaring ahead */}
      <mesh position={[0.15, 0.08, 0.68]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[-0.15, 0.08, 0.68]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* fringe tassels, flat on both ends */}
      {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.02, -0.87]}>
          <boxGeometry args={[0.06, 0.025, 0.14]} />
          <meshStandardMaterial color={TRIM} roughness={0.6} />
        </mesh>
      ))}
      {[-0.28, -0.14, 0, 0.14, 0.28].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.02, 0.76]}>
          <boxGeometry args={[0.06, 0.025, 0.13]} />
          <meshStandardMaterial color={TRIM} roughness={0.55} emissive="#c9921e" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
