"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

// x1.ninja logo palette: charcoal hood + electric-blue headband/X + gold
// katana furniture + steel blades.
const MASK = "#171c28";
const GOLD = "#f0c75e";
const STEEL = "#c7d0e2";

type MatOverride = Partial<{ color: string; emissive: string; emissiveIntensity: number }>;

/** Clone a GLB scene normalized: longest dimension -> target, feet on y=0.
 *  `tint` recolors everything (robot treatment); `recolor` retints specific
 *  materials by their authored name (brand accents on stock models). */
function normClone(
  scene: THREE.Object3D,
  target: number,
  opts?: { tint?: { color: string; metal?: number }; recolor?: Record<string, MatOverride> },
) {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const k = target / (Math.max(size.x, size.y, size.z) || 1);
  const center = box.getCenter(new THREE.Vector3());
  clone.scale.setScalar(k);
  clone.position.set(-center.x * k, -box.min.y * k, -center.z * k);
  if (opts?.tint || opts?.recolor) {
    const patch = (orig: THREE.Material) => {
      const m = (orig as THREE.MeshStandardMaterial).clone();
      if (opts.tint) {
        m.map = null; // the baked skin texture would fight the tint
        m.color?.set(opts.tint.color);
        m.metalness = opts.tint.metal ?? 0.5;
        m.roughness = 0.45;
      }
      const over = opts.recolor?.[m.name];
      if (over) {
        if (over.color) m.color?.set(over.color);
        if (over.emissive) m.emissive?.set(over.emissive);
        if (over.emissiveIntensity !== undefined) m.emissiveIntensity = over.emissiveIntensity;
      }
      return m;
    };
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(patch)
        : patch(mesh.material);
    });
  }
  return clone;
}

/** One katana for the crossed pair on the back. */
function Katana({ tilt }: { tilt: number }) {
  return (
    <group position={[0, 0.46, -0.085]} rotation={[0.12, 0, tilt]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.34, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* gold guard */}
      <mesh position={[0, -0.06, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.01, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* wrapped grip with gold pommel */}
      <mesh position={[0, -0.115, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
        <meshStandardMaterial color={MASK} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.17, 0]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * The character mesh itself — shared by the in-game Character (which animates
 * arms/scarf via the optional refs) and the select-screen preview turntable.
 * ~0.8 units tall, feet on y=0, facing +Z.
 */
export default function CharacterBody({
  charId,
  armLRef,
  armRRef,
  scarfRef,
}: {
  charId: CharacterId;
  armLRef?: React.Ref<THREE.Group>;
  armRRef?: React.Ref<THREE.Group>;
  scarfRef?: React.Ref<THREE.Group>;
}) {
  const pal = CHARACTERS[charId].colors;
  const capyGltf = useGLTF("/models/capybara.glb");
  const broGltf = useGLTF("/models/cryptobro.glb");
  const hatGltf = useGLTF("/models/tophat.glb");
  const ninjaGltf = useGLTF("/models/ninja.glb");
  const jackGltf = useGLTF("/models/jack.glb");
  const capyBody = useMemo(() => normClone(capyGltf.scene, 0.95), [capyGltf]);
  const theoBody = useMemo(
    () => normClone(broGltf.scene, 0.85, { tint: { color: "#9aa3b2", metal: 0.65 } }),
    [broGltf],
  );
  const theoHat = useMemo(() => normClone(hatGltf.scene, 0.3), [hatGltf]);
  const ninjaBody = useMemo(
    () =>
      normClone(ninjaGltf.scene, 0.82, {
        recolor: {
          // brand pass: charcoal-blue suit, electric-blue belt + eyes
          Ninja_Main: { color: "#141925" },
          Belt: { color: "#1e6fff", emissive: "#1e6fff", emissiveIntensity: 0.5 },
          Eye_White: { color: "#7dd3fc", emissive: "#7dd3fc", emissiveIntensity: 0.9 },
        },
      }),
    [ninjaGltf],
  );
  const jackBody = useMemo(
    () => normClone(jackGltf.scene, 0.95, { recolor: { White: { color: "#f5f5f5" } } }),
    [jackGltf],
  );
  const xenTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.font = "900 74px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0b0b0d";
    ctx.fillText("XEN", 128, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  if (charId === "capy") return <primitive object={capyBody} />;

  if (charId === "jack")
    return (
      <group>
        <primitive object={jackBody} />
        {/* the XEN tee — his whole personality */}
        <mesh position={[0, 0.62, 0.078]}>
          <planeGeometry args={[0.24, 0.12]} />
          <meshBasicMaterial map={xenTex} transparent depthWrite={false} />
        </mesh>
      </group>
    );

  if (charId === "ninja") return <primitive object={ninjaBody} />;

  if (charId === "theo")
    return (
      <group>
        <primitive object={theoBody} />
        <primitive object={theoHat} position={[0, 0.82, 0]} />
        {/* burning red eyes, per the owner's spec */}
        <mesh position={[0.05, 0.68, 0.13]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#ff3d3d" emissive="#ff3d3d" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh position={[-0.05, 0.68, 0.13]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#ff3d3d" emissive="#ff3d3d" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>
    );

  return (
    <>
      {/* hooded head — charcoal like the logo */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial color={pal.hood} roughness={0.6} />
      </mesh>
      {/* the electric-blue headband — the logo's signature */}
      <mesh position={[0, 0.705, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.132, 0.024, 10, 24]} />
        <meshStandardMaterial
          color={pal.band}
          emissive={pal.band}
          emissiveIntensity={0.35}
          roughness={0.45}
        />
      </mesh>
      {/* headband knot + tails at the back */}
      <mesh position={[0, 0.705, -0.14]}>
        <sphereGeometry args={[0.03, 10, 10]} />
        <meshStandardMaterial color={pal.band} roughness={0.5} />
      </mesh>
      {/* mask opening: a curved band hugging the hood (no boxy corners) */}
      <mesh position={[0, 0.66, 0]}>
        <sphereGeometry args={[0.144, 24, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.14]} />
        <meshStandardMaterial color={MASK} roughness={0.6} />
      </mesh>
      {/* glowing eyes floating just proud of the band */}
      <mesh position={[0.042, 0.652, 0.139]}>
        <sphereGeometry args={[0.015, 10, 10]} />
        <meshStandardMaterial color={pal.eyes} emissive={pal.eyes} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[-0.042, 0.652, 0.139]}>
        <sphereGeometry args={[0.015, 10, 10]} />
        <meshStandardMaterial color={pal.eyes} emissive={pal.eyes} emissiveIntensity={1.4} />
      </mesh>

      {/* blue scarf: collar + trailing tail */}
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.052, 0.02, 10, 20]} />
        <meshStandardMaterial color={pal.band} roughness={0.7} />
      </mesh>
      <group ref={scarfRef} position={[0, 0.545, -0.05]} rotation={[-0.35, 0, 0]}>
        <mesh position={[0, 0, -0.1]} castShadow>
          <boxGeometry args={[0.055, 0.014, 0.2]} />
          <meshStandardMaterial color={pal.band} roughness={0.7} />
        </mesh>
      </group>

      {/* torso */}
      <mesh position={[0, 0.37, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.24, 4, 12]} />
        <meshStandardMaterial color={pal.suit} roughness={0.55} metalness={0.1} />
      </mesh>
      {/* gold belt */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.062, 0.012, 10, 22]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.35}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* crossed katanas, like the logo */}
      <Katana tilt={-0.7} />
      <Katana tilt={0.7} />

      {/* arms (pivot at shoulder) */}
      <group ref={armLRef} position={[0.075, 0.49, 0]} rotation={[0, 0, 0.5]}>
        <mesh position={[0, -0.11, 0]} castShadow>
          <capsuleGeometry args={[0.026, 0.18, 4, 8]} />
          <meshStandardMaterial color={pal.suit} roughness={0.6} />
        </mesh>
      </group>
      <group ref={armRRef} position={[-0.075, 0.49, 0]} rotation={[0, 0, -0.5]}>
        <mesh position={[0, -0.11, 0]} castShadow>
          <capsuleGeometry args={[0.026, 0.18, 4, 8]} />
          <meshStandardMaterial color={pal.suit} roughness={0.6} />
        </mesh>
      </group>
    </>
  );
}

useGLTF.preload("/models/capybara.glb");
useGLTF.preload("/models/cryptobro.glb");
useGLTF.preload("/models/tophat.glb");
useGLTF.preload("/models/ninja.glb");
useGLTF.preload("/models/jack.glb");
