"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { regions } from "@/lib/regions";
import { useGame } from "@/lib/gameStore";
import { prefersReducedMotion } from "@/lib/motion";
import { LOW_GPU } from "@/lib/quality";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * Great-circle arcs connecting each ecosystem landmark to its 2 nearest
 * neighbors. Explore-only; hidden during runs and for reduced-motion users.
 * One indexed LineSegments draw call keeps it cheap.
 */
export default function NetworkLinks({ radius = 2.4 }: { radius?: number }) {
  const mode = useGame((s) => s.mode);

  const [positions, indices] = useMemo(() => {
    if (mode !== "explore" || prefersReducedMotion.current) return [null, null];
    const segs = LOW_GPU ? 10 : 18;
    const pos: number[] = [];
    const idx: number[] = [];
    let base = 0;
    for (const r of regions) {
      const others = regions
        .filter((x) => x.id !== r.id)
        .map((x) => ({
          id: x.id,
          ang: _a.set(...r.dir).angleTo(_b.set(...x.dir)),
        }))
        .sort((x, y) => x.ang - y.ang)
        .slice(0, 2);
      _a.set(...r.dir);
      for (const o of others) {
        _b.set(...regions.find((x) => x.id === o.id)!.dir);
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          _p.copy(_a).lerp(_b, t).normalize().multiplyScalar(radius + 0.025);
          pos.push(_p.x, _p.y, _p.z);
        }
        for (let i = 0; i < segs; i++) {
          idx.push(base + i, base + i + 1);
        }
        base += segs + 1;
      }
    }
    return [new Float32Array(pos), new Uint16Array(idx)];
  }, [mode, radius]);

  const matRef = useRef<THREE.LineBasicMaterial>(null);
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.22 + Math.sin(t * 0.6) * 0.08;
  });

  if (mode !== "explore" || !positions || !indices) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color="#4f7dff"
        transparent
        opacity={0.22}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
