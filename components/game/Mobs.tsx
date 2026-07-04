"use client";

/**
 * Crypto-native enemy cast, all procedural (built ~1 unit tall/long; the
 * pool wrapper scales them). The sync loop drives position/facing/wobble;
 * these stay static internally. +Z faces the ninja.
 */

/** THE BUG — an exploit crawling out of the codebase. Matrix-green beetle. */
export function BugMob() {
  return (
    <group position={[0, 0.28, 0]}>
      {/* carapace */}
      <mesh scale={[0.42, 0.3, 0.55]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#12261a" emissive="#39ff88" emissiveIntensity={0.35} roughness={0.4} flatShading />
      </mesh>
      {/* head + eyes */}
      <mesh position={[0, 0.05, 0.5]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color="#0d1a12" roughness={0.5} />
      </mesh>
      <mesh position={[0.09, 0.12, 0.64]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={2.6} />
      </mesh>
      <mesh position={[-0.09, 0.12, 0.64]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={2.6} />
      </mesh>
      {/* six legs */}
      {[-0.18, 0, 0.18].map((z) =>
        [-1, 1].map((s) => (
          <mesh key={`${z}${s}`} position={[s * 0.42, -0.14, z]} rotation={[0, 0, s * 0.9]}>
            <cylinderGeometry args={[0.025, 0.025, 0.34, 5]} />
            <meshStandardMaterial color="#183524" roughness={0.5} />
          </mesh>
        )),
      )}
      {/* antennae */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0.28, 0.58]} rotation={[0.6, 0, s * -0.35]}>
          <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
          <meshStandardMaterial color="#39ff88" emissive="#39ff88" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** GAS WISP — a fee spike come alive. Fast, flickery, burns you. */
export function GasWisp() {
  return (
    <group position={[0, 0.4, 0]}>
      {/* outer flame */}
      <mesh scale={[0.35, 0.55, 0.35]}>
        <coneGeometry args={[1, 1.6, 8]} />
        <meshStandardMaterial
          color="#ff9a3d"
          emissive="#ff7a1f"
          emissiveIntensity={1.4}
          transparent
          opacity={0.85}
          roughness={0.3}
        />
      </mesh>
      {/* hot core */}
      <mesh position={[0, -0.12, 0]} scale={[0.2, 0.3, 0.2]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#ffe08a" emissive="#ffd23d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* angry little eyes */}
      <mesh position={[0.09, 0.05, 0.24]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a0c05" roughness={0.4} />
      </mesh>
      <mesh position={[-0.09, 0.05, 0.24]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a0c05" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** THE RUG — a rugpull incarnate: heavy rolled carpet, eyes in the roll. */
export function RugMob() {
  return (
    <group position={[0, 0.16, 0]}>
      {/* the roll (leads the charge, +Z) */}
      <mesh position={[0, 0.1, 0.35]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.9, 12]} />
        <meshStandardMaterial color="#8b1f2f" roughness={0.75} />
      </mesh>
      {/* gold trim rings on the roll */}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.1, 0.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.27, 0.27, 0.08, 12]} />
          <meshStandardMaterial color="#f0c75e" emissive="#c9921e" emissiveIntensity={0.4} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* eyes peeking out of the roll's dark core */}
      <mesh position={[0.14, 0.14, 0.81]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={2.8} />
      </mesh>
      <mesh position={[-0.14, 0.14, 0.81]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={2.8} />
      </mesh>
      {/* flat tail dragging behind, slightly lifted at the end */}
      <mesh position={[0, -0.02, -0.35]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.82, 0.05, 1.1]} />
        <meshStandardMaterial color="#6e1826" roughness={0.85} />
      </mesh>
      {/* tail pattern stripes */}
      {[-0.15, -0.55].map((z) => (
        <mesh key={z} position={[0, 0.015, z - 0.2]}>
          <boxGeometry args={[0.7, 0.04, 0.09]} />
          <meshStandardMaterial color="#f0c75e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* fringe at the very back */}
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <mesh key={x} position={[x, -0.03, -0.94]}>
          <boxGeometry args={[0.1, 0.035, 0.14]} />
          <meshStandardMaterial color="#f0c75e" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
