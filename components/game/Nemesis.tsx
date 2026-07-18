"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import CharacterBody from "@/components/three/CharacterBody";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

// Nemesis — the hero's dark mirror. Reuses the selected character's actual
// model, then desaturates and crimsons every material so the silhouette is
// unmistakably "you, but wrong."
const NEMESIS_SUIT = new THREE.Color("#140a0e");
const NEMESIS_EMISSIVE = new THREE.Color("#8b1020");

function darkenMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const patch = (orig: THREE.Material) => {
      const m = (orig as THREE.MeshStandardMaterial).clone();
      if (m.color) m.color.copy(NEMESIS_SUIT);
      if (m.emissive) m.emissive.copy(NEMESIS_EMISSIVE);
      m.emissiveIntensity = 0.9;
      m.metalness = Math.max(m.metalness, 0.45);
      m.roughness = 0.4;
      return m;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(patch) : patch(mesh.material);
  });
}

/** A pulsing crimson aura ring at the feet — always on, intensifies visually
 *  during the boss windup because the parent group already shakes/red-particles. */
function DarkAura() {
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.set("#ff1f1f");
  }, []);
  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.24, 0.016, 8, 32]} />
      <meshBasicMaterial color="#ff1f1f" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export default function Nemesis({ scale = 1.05, charId = "ninja" }: { scale?: number; charId?: CharacterId }) {
  const root = useRef<THREE.Group>(null);
  const applied = useRef<CharacterId | null>(null);

  useEffect(() => {
    if (!root.current || applied.current === charId) return;
    applied.current = charId;
    darkenMaterials(root.current);
  }, [charId]);

  // fallback to ninja if an invalid id slips through
  const id = CHARACTERS[charId] ? charId : "ninja";

  return (
    <group ref={root} scale={scale}>
      <CharacterBody charId={id} />
      <DarkAura />
    </group>
  );
}
