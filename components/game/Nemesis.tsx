"use client";

import * as THREE from "three";

// Ninja Nemesis — the boss is the hero's evil mirror: same silhouette,
// crimson-and-black palette, burning red eyes, twin katanas. Built from the
// same primitives as Character.tsx (kept static; the enemy sync loop drives
// hover/sway/facing).
const HOOD = "#1c0f14";
const SUIT = "#140a0e";
const MASK = "#0a0508";
const BAND = "#ff3d3d";
const SCARF = "#8b0f1f";
const EYES = "#ff4d4d";
const STEEL = "#5a6478";

export default function Nemesis({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {/* hooded head */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={HOOD} roughness={0.55} />
      </mesh>
      {/* blood-red headband */}
      <mesh position={[0, 0.71, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.028, 10, 24]} />
        <meshStandardMaterial color={BAND} emissive={BAND} emissiveIntensity={0.6} roughness={0.4} />
      </mesh>
      {/* mask band + burning eyes */}
      <mesh position={[0, 0.655, 0]}>
        <sphereGeometry args={[0.165, 24, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.14]} />
        <meshStandardMaterial color={MASK} roughness={0.6} />
      </mesh>
      <mesh position={[0.05, 0.648, 0.158]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color={EYES} emissive={EYES} emissiveIntensity={3} />
      </mesh>
      <mesh position={[-0.05, 0.648, 0.158]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color={EYES} emissive={EYES} emissiveIntensity={3} />
      </mesh>

      {/* tattered scarf */}
      <mesh position={[0, 0.53, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.024, 10, 20]} />
        <meshStandardMaterial color={SCARF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, -0.14]} rotation={[-0.6, 0, 0.1]}>
        <boxGeometry args={[0.07, 0.016, 0.26]} />
        <meshStandardMaterial color={SCARF} roughness={0.7} />
      </mesh>

      {/* torso */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.26, 4, 12]} />
        <meshStandardMaterial color={SUIT} roughness={0.5} metalness={0.15} />
      </mesh>
      {/* red belt */}
      <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.078, 0.014, 10, 22]} />
        <meshStandardMaterial color={BAND} emissive={BAND} emissiveIntensity={0.5} roughness={0.35} />
      </mesh>

      {/* twin katanas, drawn wide */}
      {[-0.75, 0.75].map((tilt) => (
        <group key={tilt} position={[0, 0.42, -0.1]} rotation={[0.15, 0, tilt]}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
            <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.012, 12]} />
            <meshStandardMaterial color={BAND} emissive={BAND} emissiveIntensity={0.7} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.1, 8]} />
            <meshStandardMaterial color={MASK} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* dark aura ring at the feet */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.014, 8, 32]} />
        <meshBasicMaterial
          color={BAND}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
