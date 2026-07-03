// Packs the KayKit Halloween gltf+bin+texture into self-contained GLBs.
import { NodeIO } from "@gltf-transform/core";
import { prune, dedup } from "@gltf-transform/functions";

const io = new NodeIO();
for (const name of ["skull", "pumpkin_orange_jackolantern", "pumpkin_yellow_jackolantern"]) {
  const doc = await io.read(`/tmp/hallow/${name}.gltf`);
  await doc.transform(prune(), dedup());
  await io.write(`public/models/${name}.glb`, doc);
  console.log("packed", name);
}
