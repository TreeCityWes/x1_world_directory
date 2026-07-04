/**
 * Strip animation rigs from downloaded GLBs so they can be scaled like plain
 * meshes. SkinnedMesh renders from bone world-matrices and ignores ancestor
 * scaling (and three's clone() doesn't remap skeletons), so any skinned model
 * must be de-rigged offline before the game can normalize it.
 *
 *   node scripts/strip-models.mjs <in.glb> <out.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error("usage: node scripts/strip-models.mjs <in.glb> <out.glb>");
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();

for (const anim of root.listAnimations()) anim.dispose();
for (const skin of root.listSkins()) skin.dispose();
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    prim.setAttribute("JOINTS_0", null);
    prim.setAttribute("WEIGHTS_0", null);
  }
}

await doc.transform(prune(), dedup());

console.log(
  "materials:",
  root
    .listMaterials()
    .map((m) => {
      const c = m.getBaseColorFactor();
      const hex = c
        ? "#" +
          c
            .slice(0, 3)
            .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
            .join("")
        : "tex";
      return `${m.getName() || "(unnamed)"}=${hex}${m.getBaseColorTexture() ? "+tex" : ""}`;
    })
    .join(", "),
);

await io.write(dst, doc);
console.log("wrote", dst);
