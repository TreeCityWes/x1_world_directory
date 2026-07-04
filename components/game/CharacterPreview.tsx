"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CharacterBody from "@/components/three/CharacterBody";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

const N_MOTES = 16;

/** Slow accent motes orbiting and rising around the podium — alive, not
 *  static, without reading as a shape (the flat halo disc read as slop). */
function Motes({ color }: { color: string }) {
  const ref = useRef<THREE.Points>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: N_MOTES }, (_, i) => ({
        a: (i / N_MOTES) * Math.PI * 2,
        r: 0.32 + (i % 5) * 0.055,
        sp: 0.18 + (i % 3) * 0.09,
        ph: i * 0.613,
      })),
    [],
  );
  const initial = useMemo(() => new Float32Array(N_MOTES * 3), []);
  useFrame((state) => {
    // write through the live attribute, not a captured array — keeps the
    // React compiler's immutability contract intact
    const attr = ref.current?.geometry.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < N_MOTES; i++) {
      const s = seeds[i];
      const a = s.a + t * 0.25;
      arr[i * 3] = Math.cos(a) * s.r;
      arr[i * 3 + 1] = -0.36 + ((t * s.sp + s.ph) % 1) * 0.85;
      arr[i * 3 + 2] = Math.sin(a) * s.r;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[initial, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

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
  // +0.06: bias the body ABOVE true center — the nameplate gradient eats
  // the bottom of the card, so optical center sits higher than geometric
  const yFeet = -(f.h * f.s) / 2 + 0.06;
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
      <Motes color={pal.band} />
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
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Canvas>
  );
}
