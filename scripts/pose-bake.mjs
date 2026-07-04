/**
 * Bake an animation pose into a skinned GLB's vertices, then strip the rig.
 * De-rigged models freeze in their rest pose (usually a T-pose); this poses
 * the skeleton from an animation's first keyframe, applies the skinning math
 * on the CPU, and writes plain static meshes.
 *
 *   node scripts/pose-bake.mjs <in.glb> <out.glb> [animNameRegex=idle]
 */
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";
import { Matrix4, Vector3, Quaternion } from "three";

const [src, dst, animPattern = "idle"] = process.argv.slice(2);
if (!src || !dst) {
  console.error("usage: node scripts/pose-bake.mjs <in.glb> <out.glb> [animNameRegex]");
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();

// ---- 1. pose the skeleton from the chosen animation's first keyframe ----
const anims = root.listAnimations();
const rx = new RegExp(animPattern, "i");
const anim = anims.find((a) => rx.test(a.getName())) ?? anims[0];
if (!anim) {
  console.error("no animations found — nothing to bake");
  process.exit(1);
}
console.log("baking pose from animation:", anim.getName() || "(unnamed)");

for (const channel of anim.listChannels()) {
  const node = channel.getTargetNode();
  const sampler = channel.getSampler();
  if (!node || !sampler) continue;
  const out = sampler.getOutput();
  if (!out) continue;
  const el = out.getElement(0, []);
  const path = channel.getTargetPath();
  if (path === "translation") node.setTranslation(el);
  else if (path === "rotation") node.setRotation(el);
  else if (path === "scale") node.setScale(el);
}

// ---- 2. CPU-skin every skinned primitive into the posed positions ----
const _m = new Matrix4();
const _skin = new Matrix4();
const _p = new Vector3();
const _n = new Vector3();
const _acc = new Vector3();
const _nacc = new Vector3();
const _q = new Quaternion();

for (const node of root.listNodes()) {
  const skin = node.getSkin();
  const mesh = node.getMesh();
  if (!skin || !mesh) continue;

  const joints = skin.listJoints();
  const ibmAcc = skin.getInverseBindMatrices();
  // per-joint: world(joint) * inverseBind — vertices land in scene space
  const jointMats = joints.map((j, i) => {
    const world = new Matrix4().fromArray(j.getWorldMatrix());
    const ibm = new Matrix4().fromArray(ibmAcc.getElement(i, []));
    return world.multiply(ibm);
  });
  // skinned vertices ignore the mesh node's own transform (glTF spec), but
  // once de-rigged three applies it — pre-invert so the net result matches
  const invNode = new Matrix4().fromArray(node.getWorldMatrix()).invert();

  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const nrm = prim.getAttribute("NORMAL");
    const jnt = prim.getAttribute("JOINTS_0");
    const wgt = prim.getAttribute("WEIGHTS_0");
    if (!pos || !jnt || !wgt) continue;

    const j4 = [];
    const w4 = [];
    const v3 = [];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v3);
      jnt.getElement(i, j4);
      wgt.getElement(i, w4);
      _acc.set(0, 0, 0);
      _nacc.set(0, 0, 0);
      const hasN = !!nrm;
      const n3 = hasN ? nrm.getElement(i, []) : null;
      for (let k = 0; k < 4; k++) {
        const w = w4[k];
        if (!w) continue;
        _skin.copy(jointMats[j4[k]]);
        _p.set(v3[0], v3[1], v3[2]).applyMatrix4(_skin);
        _acc.addScaledVector(_p, w);
        if (hasN) {
          _n.set(n3[0], n3[1], n3[2]).transformDirection(_skin);
          _nacc.addScaledVector(_n, w);
        }
      }
      _acc.applyMatrix4(invNode);
      pos.setElement(i, [_acc.x, _acc.y, _acc.z]);
      if (hasN) {
        // rotate normals back into node space (ignore node translation)
        _q.setFromRotationMatrix(_m.copy(invNode));
        _nacc.applyQuaternion(_q).normalize();
        nrm.setElement(i, [_nacc.x, _nacc.y, _nacc.z]);
      }
    }
  }
}

// ---- 3. strip the rig ----
for (const a of root.listAnimations()) a.dispose();
for (const s of root.listSkins()) s.dispose();
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    prim.setAttribute("JOINTS_0", null);
    prim.setAttribute("WEIGHTS_0", null);
  }
}
await doc.transform(prune(), dedup());
await io.write(dst, doc);
console.log("wrote", dst);
