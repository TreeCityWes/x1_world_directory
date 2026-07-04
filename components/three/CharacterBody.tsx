"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CHARACTERS, type CharacterId, type CharacterDef } from "@/lib/characters";

// x1.ninja logo palette: charcoal hood + electric-blue headband/X + gold
// katana furniture + steel blades.
const MASK = "#0c0f16";
const GOLD = "#f0c75e";
const STEEL = "#c7d0e2";

type MatOverride = Partial<{ color: string; emissive: string; emissiveIntensity: number }>;

/** Clone a GLB scene normalized: longest dimension -> target, feet on y=0.
 *  `tint` recolors everything (robot treatment); `recolor` retints specific
 *  materials by their authored name; `hide` drops primitives by material name. */
function normClone(
  scene: THREE.Object3D,
  target: number,
  opts?: {
    tint?: { color: string; metal?: number };
    recolor?: Record<string, MatOverride>;
    hide?: string[];
  },
) {
  const clone = scene.clone(true);
  if (opts?.hide?.length) {
    const doomed: THREE.Object3D[] = [];
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.some((m) => opts.hide!.includes(m?.name))) doomed.push(mesh);
    });
    doomed.forEach((m) => m.removeFromParent());
  }
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
    <group position={[0, 0.46, -0.11]} rotation={[0.12, 0, tilt]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.34, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* gold guard */}
      <mesh position={[0, -0.06, 0]}>
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
 * The x1.ninja mark, in the flesh: black-blue suit with gold trim, electric
 * headband with flowing tails, slim fierce eyes, glowing X on the chest.
 * Palette-driven so the locked "???" slot renders it greyed.
 */
function NinjaBody({
  pal,
  armLRef,
  armRRef,
  scarfRef,
}: {
  pal: CharacterDef["colors"];
  armLRef?: React.Ref<THREE.Group>;
  armRRef?: React.Ref<THREE.Group>;
  scarfRef?: React.Ref<THREE.Group>;
}) {
  return (
    <>
      {/* legs + split-toe tabi */}
      {[-1, 1].map((s) => (
        <group key={`leg${s}`}>
          <mesh position={[s * 0.052, 0.14, 0]} castShadow>
            <capsuleGeometry args={[0.034, 0.13, 4, 8]} />
            <meshStandardMaterial color={pal.suit} roughness={0.6} />
          </mesh>
          <mesh position={[s * 0.052, 0.03, 0.02]}>
            <boxGeometry args={[0.058, 0.05, 0.1]} />
            <meshStandardMaterial color={pal.hood} roughness={0.55} />
          </mesh>
        </group>
      ))}

      {/* torso — broad chest, tapered */}
      <mesh position={[0, 0.35, 0]} castShadow scale={[1.15, 1, 0.88]}>
        <capsuleGeometry args={[0.088, 0.15, 4, 14]} />
        <meshStandardMaterial color={pal.suit} roughness={0.55} metalness={0.08} />
      </mesh>
      {/* the glowing X — x1.ninja's mark on the chest */}
      <group position={[0, 0.39, 0.088]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.09, 0.02, 0.012]} />
          <meshStandardMaterial
            color={pal.band}
            emissive={pal.band}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.09, 0.02, 0.012]} />
          <meshStandardMaterial
            color={pal.band}
            emissive={pal.band}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* gold-trimmed belt + hanging tail */}
      <mesh position={[0, 0.245, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.082, 0.016, 10, 24]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.05, 0.19, 0.055]} rotation={[0.25, 0, 0.18]}>
        <boxGeometry args={[0.035, 0.09, 0.012]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* arms — compact, gold wrist wraps, wrapped fists */}
      <group ref={armLRef} position={[0.118, 0.45, 0]} rotation={[0, 0, 0.35]}>
        <mesh position={[0, -0.065, 0]} castShadow>
          <capsuleGeometry args={[0.031, 0.085, 4, 8]} />
          <meshStandardMaterial color={pal.suit} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.125, 0]}>
          <torusGeometry args={[0.028, 0.009, 8, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.155, 0]}>
          <sphereGeometry args={[0.031, 10, 10]} />
          <meshStandardMaterial color={pal.hood} roughness={0.55} />
        </mesh>
      </group>
      <group ref={armRRef} position={[-0.118, 0.45, 0]} rotation={[0, 0, -0.35]}>
        <mesh position={[0, -0.065, 0]} castShadow>
          <capsuleGeometry args={[0.031, 0.085, 4, 8]} />
          <meshStandardMaterial color={pal.suit} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.125, 0]}>
          <torusGeometry args={[0.028, 0.009, 8, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.155, 0]}>
          <sphereGeometry args={[0.031, 10, 10]} />
          <meshStandardMaterial color={pal.hood} roughness={0.55} />
        </mesh>
      </group>

      {/* head — charcoal hood, like the logo */}
      <mesh position={[0, 0.63, 0]} castShadow>
        <sphereGeometry args={[0.152, 24, 24]} />
        <meshStandardMaterial color={pal.hood} roughness={0.6} />
      </mesh>
      {/* mask opening slit */}
      <mesh position={[0, 0.625, 0]}>
        <sphereGeometry args={[0.156, 24, 8, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.13]} />
        <meshStandardMaterial color={MASK} roughness={0.6} />
      </mesh>
      {/* slim, fierce eyes — angled blades of light, not bug-eyes */}
      <mesh position={[0.048, 0.622, 0.146]} rotation={[0, 0.25, -0.22]} scale={[1, 0.42, 0.5]}>
        <sphereGeometry args={[0.023, 12, 10]} />
        <meshStandardMaterial
          color={pal.eyes}
          emissive={pal.eyes}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.048, 0.622, 0.146]} rotation={[0, -0.25, 0.22]} scale={[1, 0.42, 0.5]}>
        <sphereGeometry args={[0.023, 12, 10]} />
        <meshStandardMaterial
          color={pal.eyes}
          emissive={pal.eyes}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
      {/* the electric headband — the logo's signature */}
      <mesh position={[0, 0.685, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.143, 0.026, 10, 26]} />
        <meshStandardMaterial
          color={pal.band}
          emissive={pal.band}
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
      {/* knot + flowing tails (flutter with speed via scarfRef) */}
      <mesh position={[0, 0.69, -0.145]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color={pal.band} roughness={0.5} />
      </mesh>
      <group ref={scarfRef} position={[0, 0.685, -0.16]} rotation={[-0.5, 0, 0]}>
        <mesh position={[0.028, -0.02, -0.075]} rotation={[0, 0.15, 0.1]} castShadow>
          <boxGeometry args={[0.038, 0.011, 0.17]} />
          <meshStandardMaterial color={pal.band} roughness={0.6} />
        </mesh>
        <mesh position={[-0.028, -0.035, -0.06]} rotation={[0.12, -0.2, -0.1]} castShadow>
          <boxGeometry args={[0.038, 0.011, 0.14]} />
          <meshStandardMaterial color={pal.band} roughness={0.6} />
        </mesh>
      </group>

      {/* crossed katanas, like the logo */}
      <Katana tilt={-0.7} />
      <Katana tilt={0.7} />
    </>
  );
}

/**
 * The character mesh itself — shared by the in-game Character (which animates
 * arms/headband tails via the optional refs) and the select-screen turntable.
 * Built ~0.66–0.8 units tall, feet on y=0, facing +Z.
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
  const jackGltf = useGLTF("/models/jack.glb");
  const capyBody = useMemo(() => normClone(capyGltf.scene, 0.95), [capyGltf]);
  const theoBody = useMemo(
    () => normClone(broGltf.scene, 0.62, { tint: { color: "#9aa3b2", metal: 0.65 } }),
    [broGltf],
  );
  // the hat IS the persona — oversized, with the band recolored THEO-cyan
  const theoHat = useMemo(
    () =>
      normClone(hatGltf.scene, 0.48, {
        recolor: { F44336: { color: "#22d3ee", emissive: "#22d3ee", emissiveIntensity: 0.8 } },
      }),
    [hatGltf],
  );
  const jack = useMemo(() => {
    const body = normClone(jackGltf.scene, 0.78, {
      recolor: { White: { color: "#f5f5f5" } },
      hide: ["Hair"], // the model ships with a ponytail; Jack's is a buzz cut
    });
    const box = new THREE.Box3().setFromObject(body);
    return { body, top: box.max.y, front: box.max.z };
  }, [jackGltf]);
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
        <primitive object={jack.body} />
        {/* brown buzz cut hugging the skull */}
        <mesh position={[0, jack.top - 0.055, -0.006]} scale={[1, 0.85, 1.04]}>
          <sphereGeometry args={[0.062, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#4a3320" roughness={0.85} />
        </mesh>
        {/* the XEN tee — pinned to the measured chest */}
        <mesh position={[0, jack.top * 0.66, jack.front + 0.003]}>
          <planeGeometry args={[0.17, 0.085]} />
          <meshBasicMaterial map={xenTex} transparent alphaTest={0.4} />
        </mesh>
      </group>
    );

  if (charId === "theo")
    return (
      <group>
        <primitive object={theoBody} />
        <primitive object={theoHat} position={[0, 0.53, 0]} />
        {/* burning red eyes, proud of the faceplate */}
        <mesh position={[0.052, 0.47, 0.16]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial
            color="#ff3d3d"
            emissive="#ff3d3d"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[-0.052, 0.47, 0.16]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial
            color="#ff3d3d"
            emissive="#ff3d3d"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
      </group>
    );

  return <NinjaBody pal={pal} armLRef={armLRef} armRRef={armRRef} scarfRef={scarfRef} />;
}

useGLTF.preload("/models/capybara.glb");
useGLTF.preload("/models/cryptobro.glb");
useGLTF.preload("/models/tophat.glb");
useGLTF.preload("/models/jack.glb");
