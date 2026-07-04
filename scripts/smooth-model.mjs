/**
 * Soften faceted low-poly shading WITHOUT touching topology: for every
 * vertex, average the face normals of all triangles that share its
 * position (ignoring UV seams — Poly-style atlas models split every face,
 * so welding would corrupt the texture).
 *
 *   node scripts/smooth-model.mjs <in.glb> <out.glb>
 */
import { NodeIO } from "@gltf-transform/core";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error("usage: node scripts/smooth-model.mjs <in.glb> <out.glb>");
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];

for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMode() !== 4) continue; // triangles only
    const pos = prim.getAttribute("POSITION");
    if (!pos) continue;
    const count = pos.getCount();
    const idx = prim.getIndices();
    const triCount = (idx ? idx.getCount() : count) / 3;

    const key = (i, v) => {
      pos.getElement(i, v);
      return `${Math.round(v[0] * 1e4)},${Math.round(v[1] * 1e4)},${Math.round(v[2] * 1e4)}`;
    };

    // pass 1: accumulate area-weighted face normals per unique position
    const acc = new Map();
    const a = [], b = [], c = [], v = [];
    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getScalar(t * 3) : t * 3;
      const i1 = idx ? idx.getScalar(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getScalar(t * 3 + 2) : t * 3 + 2;
      pos.getElement(i0, a);
      pos.getElement(i1, b);
      pos.getElement(i2, c);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      for (const i of [i0, i1, i2]) {
        const k = key(i, v);
        const e = acc.get(k);
        if (e) { e[0] += nx; e[1] += ny; e[2] += nz; }
        else acc.set(k, [nx, ny, nz]);
      }
    }

    // pass 2: write normalized smooth normals
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const n = acc.get(key(i, v)) ?? [0, 1, 0];
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      out[i * 3] = n[0] / len;
      out[i * 3 + 1] = n[1] / len;
      out[i * 3 + 2] = n[2] / len;
    }
    const old = prim.getAttribute("NORMAL");
    const nrm = doc.createAccessor().setType("VEC3").setArray(out).setBuffer(buffer);
    prim.setAttribute("NORMAL", nrm);
    if (old && old.listParents().length <= 1) old.dispose();
    console.log("smoothed prim:", count, "verts,", acc.size, "unique positions");
  }
}

await io.write(dst, doc);
console.log("wrote", dst);
