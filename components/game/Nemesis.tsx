"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

// soft radial band shared by the boss aura — crimson tint applied in material
function getAuraTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 32, 64, 64, 60);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.65, "rgba(255,255,255,0.12)");
  g.addColorStop(0.82, "rgba(255,255,255,0.95)");
  g.addColorStop(0.92, "rgba(255,255,255,0.95)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** A pulsing crimson aura ring at the feet — soft-edged so it matches the
 *  unified energy-ring language. */
function DarkAura() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 3) * 0.15;
  });
  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.26, 48]} />
      <meshBasicMaterial
        map={getAuraTexture()}
        color="#ff1f1f"
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
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
