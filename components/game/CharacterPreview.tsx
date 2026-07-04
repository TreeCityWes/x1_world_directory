"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CharacterBody from "@/components/three/CharacterBody";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

/** Per-character podium framing: the camera is fixed, so each body is
 *  scaled and lifted to CENTER it vertically — without this, short CAPY
 *  sat at the floor under a column of dead space, overlapping the
 *  nameplate, while tall-hatted THEO grazed the top edge. */
const FRAME: Record<CharacterId, { h: number; s: number }> = {
  ninja: { h: 0.78, s: 1 },
  jack: { h: 0.8, s: 1 },
  theo: { h: 0.92, s: 0.95 }, // includes the hat
  capy: { h: 0.35, s: 1.5 }, // stout quadruped — podium zoom, not to scale
  mystery: { h: 0.78, s: 1 },
};

/** Slow turntable + idle bob, like a fighting-game select podium. */
function Turntable({ charId, yFeet, scale }: { charId: CharacterId; yFeet: number; scale: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!g.current) return;
    g.current.rotation.y += dt * 0.7;
    g.current.position.y = yFeet + Math.sin(state.clock.elapsedTime * 1.8) * 0.012;
  });
  return (
    <group ref={g} position={[0, yFeet, 0]} scale={scale}>
      <CharacterBody charId={charId} />
    </group>
  );
}

/**
 * Live 3D preview of the currently selected character — the exact same body
 * component the run spawns, so what you see is literally what you play.
 */
export default function CharacterPreview({ charId }: { charId: CharacterId }) {
  const pal = CHARACTERS[charId].colors;
  const f = FRAME[charId];
  const yFeet = -(f.h * f.s) / 2;
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.22, 1.8], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, -0.02, 0)}
    >
      {/* dark suits on a dark page need separation: brighter key, a hot
          white rim from behind-above, and the accent wash from the side */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={2.6} color="#dbe6ff" />
      <directionalLight position={[0, 2.4, -3]} intensity={3} color="#ffffff" />
      <pointLight position={[-2, 1, -1.5]} intensity={16} color={pal.band} />
      <pointLight position={[0, -0.5, 2]} intensity={6} color="#dbe6ff" />
      <Suspense fallback={null}>
        <Turntable charId={charId} yFeet={yFeet} scale={f.s} />
      </Suspense>
      {/* bright accent halo behind the silhouette — the studio backdrop */}
      <mesh position={[0, 0.05, -0.8]}>
        <circleGeometry args={[1.05, 40]} />
        <meshBasicMaterial
          color={pal.band}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* podium ring at the character's feet, in their signature color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yFeet - 0.008, 0]}>
        <ringGeometry args={[0.3, 0.34, 48]} />
        <meshBasicMaterial
          color={pal.band}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yFeet - 0.012, 0]}>
        <circleGeometry args={[0.3, 48]} />
        <meshBasicMaterial
          color={pal.band}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Canvas>
  );
}
