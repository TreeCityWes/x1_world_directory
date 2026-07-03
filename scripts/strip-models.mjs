// Strips animations/skins/weights from the KayKit GLBs and quantizes —
// static statues for the enemy pool, a fraction of the original size.
import { NodeIO } from "@gltf-transform/core";
import { prune, dedup, quantize } from "@gltf-transform/functions";
import { readdirSync } from "fs";

const io = new NodeIO();
for (const f of readdirSync("public/models").filter((x) => x.endsWith(".glb"))) {
  const path = `public/models/${f}`;
  const doc = await io.read(path);
  const root = doc.getRoot();
  root.listAnimations().forEach((a) => a.dispose());
  root.listSkins().forEach((s) => s.dispose());
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setAttribute("JOINTS_0", null);
      prim.setAttribute("WEIGHTS_0", null);
    }
  }
  await doc.transform(prune(), dedup(), quantize());
  await io.write(path, doc);
  console.log("stripped", f);
}
