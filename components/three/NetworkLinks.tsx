"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { regions } from "@/lib/regions";
import { useGame } from "@/lib/gameStore";

/**
 * Network traces — thin glowing great-circle arcs linking each ecosystem node
 * to its nearest neighbors, hugging the surface. The "network world" made
 * literal (and thematically cyan = the consensus/glow token). Explore-only,
 * matching the full landmark set.
 */
const R = 2.4; // PLANET_RADIUS (literal — avoids a cycle with Planet.tsx)
const LINK_R = R * 1.004; // sit just above the ocean/hex shell to avoid z-fighting
const NEIGHBORS = 2; // each node links to its 2 nearest neighbors
const SEG = 20; // arc resolution

const _out = new THREE.Vector3();

// Constant-speed point along the great circle from a → b (both unit vectors).
function arcPoint(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-5) {
    out.copy(a);
    return;
  }
  const sinO = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinO;
  const s1 = Math.sin(t * omega) / sinO;
  out.set(a.x * s0 + b.x * s1, a.y * s0 + b.y * s1, a.z * s0 + b.z * s1);
}

export default function NetworkLinks() {
  const mode = useGame((s) => s.mode);
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const dirs = regions.map((r) => new THREE.Vector3(...r.dir));
    const seen = new Set<number>();
    const edges: [number, number][] = [];
    for (let i = 0; i < dirs.length; i++) {
      const ranked = dirs
        .map((d, j) => ({ j, a: dirs[i].angleTo(d) }))
        .filter((x) => x.j !== i)
        .sort((p, q) => p.a - q.a);
      for (let k = 0; k < Math.min(NEIGHBORS, ranked.length); k++) {
        const j = ranked[k].j;
        const key = i < j ? i * dirs.length + j : j * dirs.length + i;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([i, j]);
      }
    }
    const pts: number[] = [];
    for (const [i, j] of edges) {
      for (let s = 0; s < SEG; s++) {
        arcPoint(dirs[i], dirs[j], s / SEG, _out);
        pts.push(_out.x * LINK_R, _out.y * LINK_R, _out.z * LINK_R);
        arcPoint(dirs[i], dirs[j], (s + 1) / SEG, _out);
        pts.push(_out.x * LINK_R, _out.y * LINK_R, _out.z * LINK_R);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  // gentle "data pulse" so the network feels alive
  useFrame((state) => {
    if (matRef.current) {
      matRef.current.opacity = 0.22 + Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
    }
  });

  return (
    <lineSegments geometry={geometry} visible={mode === "explore"}>
      <lineBasicMaterial
        ref={matRef}
        color="#7dd3fc"
        transparent
        opacity={0.22}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
