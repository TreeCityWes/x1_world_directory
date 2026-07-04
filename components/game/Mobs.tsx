"use client";

/**
 * Crypto-native enemy cast, all procedural (built ~1 unit tall/long; the
 * pool wrapper scales them). The sync loop drives position/facing/wobble;
 * these stay static internally. +Z faces the ninja.
 */

/** THE BUG — an exploit crawling out of the codebase. Segmented, splayed,
 *  glowing — unmistakably insect. */
export function BugMob() {
  return (
    <group position={[0, 0.26, 0]}>
      {/* bulbous abdomen, low and long */}
      <mesh position={[0, 0, -0.3]} scale={[0.3, 0.22, 0.42]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#0c1c11" emissive="#39ff88" emissiveIntensity={0.2} roughness={0.35} />
      </mesh>
      {/* glowing exploit stripes across the abdomen */}
      {[-0.42, -0.24].map((z) => (
        <mesh key={z} position={[0, 0.08, z]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.4, 0.03, 0.05]} />
          <meshStandardMaterial color="#39ff88" emissive="#39ff88" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      {/* thorax segment */}
      <mesh position={[0, 0.02, 0.1]} scale={[0.22, 0.18, 0.22]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#12301c" roughness={0.4} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.03, 0.36]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial color="#081109" roughness={0.45} />
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
          <meshStandardMaterial color="#39ff88" emissive="#1f8f4d" emissiveIntensity={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* six legs, splayed WIDE then down — insect stance, not sheep hooves */}
      {[-0.34, -0.08, 0.2].map((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`} position={[s * 0.26, -0.02, z]} rotation={[0, 0, s * 1.25]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.02, 0.028, 0.32, 5]} />
              <meshStandardMaterial color="#1a3d26" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.34, 0]} rotation={[0, 0, s * -1.9]}>
              <cylinderGeometry args={[0.016, 0.022, 0.26, 5]} />
              <meshStandardMaterial color="#143020" roughness={0.5} />
            </mesh>
          </group>
        )),
      )}
      {/* long antennae sweeping forward */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.2, 0.5]} rotation={[1.0, 0, s * -0.3]}>
          <cylinderGeometry args={[0.012, 0.018, 0.4, 4]} />
          <meshStandardMaterial color="#39ff88" emissive="#39ff88" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

/** GAS WISP — a fee spike come alive: a little flame-ghost, not a cone. */
export function GasWisp() {
  return (
    <group position={[0, 0.34, 0]}>
      {/* rounded droplet body */}
      <mesh scale={[0.3, 0.38, 0.3]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color="#ff9a3d"
          emissive="#ff7a1f"
          emissiveIntensity={1.5}
          transparent
          opacity={0.9}
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
      {/* flame licks on top — tilted, asymmetric, alive */}
      <mesh position={[0.05, 0.42, 0]} rotation={[0, 0, -0.35]} scale={[0.1, 0.26, 0.1]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffb52e" emissiveIntensity={2.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[-0.09, 0.34, 0.02]} rotation={[0, 0, 0.45]} scale={[0.06, 0.16, 0.06]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#ffe08a" emissive="#ffd23d" emissiveIntensity={2.6} transparent opacity={0.9} />
      </mesh>
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
      {/* carpet body — three flat segments in a frozen ripple */}
      <mesh position={[0, 0.02, -0.55]} rotation={[0.14, 0, 0]}>
        <boxGeometry args={[0.8, 0.035, 0.5]} />
        <meshStandardMaterial color={RUG} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, -0.08]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.8, 0.035, 0.5]} />
        <meshStandardMaterial color={RUG_DARK} roughness={0.85} />
      </mesh>
      {/* front third — flat, just a whisper of lift at the leading edge */}
      <mesh position={[0, 0.05, 0.38]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.8, 0.035, 0.55]} />
        <meshStandardMaterial color={RUG} roughness={0.8} />
      </mesh>
      {/* gold border running along both long edges (carpet frame) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.37, 0.045, -0.32]} rotation={[0.02, 0, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.95]} />
            <meshStandardMaterial color={TRIM} metalness={0.5} roughness={0.4} emissive="#c9921e" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[s * 0.37, 0.06, 0.38]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.55]} />
            <meshStandardMaterial color={TRIM} metalness={0.5} roughness={0.4} emissive="#c9921e" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
      {/* center medallion — the classic carpet diamond */}
      <mesh position={[0, 0.085, -0.1]} rotation={[-0.12, Math.PI / 4, 0]}>
        <boxGeometry args={[0.26, 0.02, 0.26]} />
        <meshStandardMaterial color={TRIM} metalness={0.55} roughness={0.35} emissive="#c9921e" emissiveIntensity={0.35} />
      </mesh>
      {/* eyes sitting on the front edge, glaring ahead */}
      <mesh position={[0.15, 0.15, 0.6]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[-0.15, 0.15, 0.6]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* fringe tassels on the back edge */}
      {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (
        <mesh key={x} position={[x, 0, -0.83]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.06, 0.025, 0.14]} />
          <meshStandardMaterial color={TRIM} roughness={0.6} />
        </mesh>
      ))}
      {/* gold fringe on the leading edge */}
      {[-0.28, -0.14, 0, 0.14, 0.28].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.1, 0.68]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.06, 0.025, 0.13]} />
          <meshStandardMaterial color={TRIM} roughness={0.55} emissive="#c9921e" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
