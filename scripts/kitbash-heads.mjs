// Kitbash: extract floating heads from the KayKit skeleton characters (CC0).
//   goblin_head.glb  = Minion head+jaw+eyes
//   wraith_head.glb  = Mage skull+jaw+eyes+hat (the hooded one)
// Centered on origin, rigs/anims stripped.
import { NodeIO } from "@gltf-transform/core";
import { prune, dedup } from "@gltf-transform/functions";
import { getBounds } from "@gltf-transform/core";

const SCRATCH =
  "C:/Users/wesis/AppData/Local/Temp/claude/C--projects-x1-world-new/e5511992-2266-4bb9-9a5a-6bfc9e31ccf3/scratchpad";
const JOBS = [
  { out: "goblin_head", src: "Skeleton_Minion", keep: /Head|Jaw|Eyes/ },
  { out: "wraith_head", src: "Skeleton_Mage", keep: /Skull|Jaw|Eyes|Hat/ },
];

const io = new NodeIO();
for (const job of JOBS) {
  const doc = await io.read(`${SCRATCH}/${job.src}.glb`);
  const root = doc.getRoot();
  root.listAnimations().forEach((a) => a.dispose());
  root.listSkins().forEach((s) => s.dispose());
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setAttribute("JOINTS_0", null);
      prim.setAttribute("WEIGHTS_0", null);
    }
  }
  const scene = root.listScenes()[0];
  // lift kept nodes to scene root at their world transforms
  const kept = [];
  for (const node of root.listNodes()) {
    if (node.getMesh() && job.keep.test(node.getName())) {
      const m = node.getWorldMatrix();
      kept.push({ node, m });
    }
  }
  for (const { node, m } of kept) {
    scene.addChild(node);
    node.setMatrix(m);
  }
  // drop everything else
  for (const node of root.listNodes()) {
    if (!kept.find((k) => k.node === node)) node.dispose();
  }
  await doc.transform(prune(), dedup());
  // center on origin
  const b = getBounds(scene);
  const c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  for (const { node } of kept) {
    if (node.getMesh()) {
      const t = node.getTranslation();
      node.setTranslation([t[0] - c[0], t[1] - c[1], t[2] - c[2]]);
    }
  }
  await io.write(`public/models/${job.out}.glb`, doc);
  const size = (b.max[0] - b.min[0]).toFixed(2) + "x" + (b.max[1] - b.min[1]).toFixed(2);
  console.log("kitbashed", job.out, "head size", size);
}
