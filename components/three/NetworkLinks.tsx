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
const _ca = new THREE.Color();
const _cb = new THREE.Color();
const _cm = new THREE.Color();

/** Network cyan — DESIGN.md glow / network hue. */
const BASE = new THREE.Color("#4f7dff");
/** How much endpoint accents tint the arc (rest stays BASE). */
const ACCENT_MIX = 0.28;

const OPACITY_BASE = 0.34;
const OPACITY_PULSE = 0.1;
const PULSE_HZ = 0.55;

/**
 * Great-circle arcs connecting each ecosystem landmark to its 2 nearest
 * neighbors. Explore-only; hidden during runs. Pulse skips for
 * prefers-reduced-motion and LOW_GPU (static opacity). One indexed
 * LineSegments draw call keeps it cheap.
 */
export default function NetworkLinks({ radius = 2.4 }: { radius?: number }) {
  const mode = useGame((s) => s.mode);

  const geo = useMemo(() => {
    if (mode !== "explore") return null;
    const segs = LOW_GPU ? 10 : 18;
    const pos: number[] = [];
    const col: number[] = [];
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
      _ca.set(r.accent).lerp(BASE, 1 - ACCENT_MIX);
      for (const o of others) {
        const other = regions.find((x) => x.id === o.id)!;
        _b.set(...other.dir);
        _cb.set(other.accent).lerp(BASE, 1 - ACCENT_MIX);
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          _p.copy(_a).lerp(_b, t).normalize().multiplyScalar(radius + 0.025);
          pos.push(_p.x, _p.y, _p.z);
          _cm.copy(_ca).lerp(_cb, t);
          col.push(_cm.r, _cm.g, _cm.b);
        }
        for (let i = 0; i < segs; i++) {
          idx.push(base + i, base + i + 1);
        }
        base += segs + 1;
      }
    }
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      indices: new Uint16Array(idx),
    };
  }, [mode, radius]);

  const matRef = useRef<THREE.LineBasicMaterial>(null);
  useFrame((state) => {
    if (!matRef.current || LOW_GPU || prefersReducedMotion.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = OPACITY_BASE + Math.sin(t * PULSE_HZ) * OPACITY_PULSE;
  });

  if (mode !== "explore" || !geo) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[geo.colors, 3]} />
        <bufferAttribute attach="index" args={[geo.indices, 1]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color="#ffffff"
        vertexColors
        transparent
        opacity={OPACITY_BASE}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
