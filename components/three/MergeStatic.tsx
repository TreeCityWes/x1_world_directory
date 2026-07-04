"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeBufferGeometries } from "three-stdlib";

const _m = new THREE.Matrix4();

/**
 * Collapses a static JSX subtree into one mesh per distinct material.
 *
 * The 55 landmark sites are ~7 primitives each — ~400 visible meshes whose
 * per-draw CPU cost (program binds, uniform uploads) halved explore's frame
 * rate on throttled CPUs vs the site-less menu scene. The primitives never
 * move relative to each other, so after mount we bake their transforms into
 * merged geometry (2–3 draws per site) and drop the originals.
 *
 * Only wrap content that is truly static: per-mesh visibility, animation,
 * or material swaps inside won't survive the merge.
 */
export default function MergeStatic({ children }: { children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null);

  useEffect(() => {
    const g = root.current;
    if (!g || g.userData.merged) return;
    g.userData.merged = true;
    g.updateMatrixWorld(true);
    const rootInv = _m.copy(g.matrixWorld).invert();

    const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
    const doomed: THREE.Mesh[] = [];
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const key = [
        mat.type,
        mat.color?.getHexString(),
        mat.emissive?.getHexString(),
        mat.emissiveIntensity,
        mat.roughness,
        mat.metalness,
        mat.transparent,
        mat.opacity,
      ].join("|");
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld));
      // mergeBufferGeometries needs identical attribute sets; the primitives
      // used here all carry position/normal/uv — strip anything else
      for (const name of Object.keys(geo.attributes)) {
        if (name !== "position" && name !== "normal" && name !== "uv") geo.deleteAttribute(name);
      }
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, geos: [] }));
      b.geos.push(geo);
      doomed.push(mesh);
    });
    if (doomed.length <= buckets.size) return; // nothing to gain

    const merged: THREE.Mesh[] = [];
    for (const { mat, geos } of buckets.values()) {
      const geo = mergeBufferGeometries(geos, false);
      geos.forEach((x) => x.dispose());
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      merged.push(mesh);
      g.add(mesh);
    }
    doomed.forEach((m) => m.removeFromParent());

    return () => {
      merged.forEach((m) => {
        m.geometry.dispose();
        m.removeFromParent();
      });
      g.userData.merged = false;
    };
  }, []);

  return <group ref={root}>{children}</group>;
}
