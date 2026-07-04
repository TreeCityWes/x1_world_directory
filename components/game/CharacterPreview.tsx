"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CharacterBody from "@/components/three/CharacterBody";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

/** Slow turntable + idle bob, like a fighting-game select podium. */
function Turntable({ charId }: { charId: CharacterId }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!g.current) return;
    g.current.rotation.y += dt * 0.7;
    g.current.position.y = -0.47 + Math.sin(state.clock.elapsedTime * 1.8) * 0.012;
  });
  return (
    <group ref={g} position={[0, -0.47, 0]}>
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
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.22, 1.8], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, -0.02, 0)}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={1.7} color="#dbe6ff" />
      <pointLight position={[-2, 1, -1.5]} intensity={14} color={pal.band} />
      <pointLight position={[0, -0.5, 2]} intensity={5} color="#dbe6ff" />
      <Suspense fallback={null}>
        <Turntable charId={charId} />
      </Suspense>
      {/* podium ring in the character's signature color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.485, 0]}>
        <circleGeometry args={[0.3, 48]} />
        <meshBasicMaterial
          color={pal.band}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Canvas>
  );
}
