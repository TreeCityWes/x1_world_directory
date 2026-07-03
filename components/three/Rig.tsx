"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The canvas pane IS the left screen, so the globe is framed dead-center in
// it: fully visible top to bottom, ninja in the upper third. Gentle mouse
// drift only — the planet does the spinning.
const LOOK_AT = new THREE.Vector3(0, 0.5, 0);

export default function Rig() {
  useFrame((state, dt) => {
    const cam = state.camera;
    const tx = state.pointer.x * 1.1;
    const ty = 3.2 - state.pointer.y * 0.55;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 2.5, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 2.5, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, 9.2, 2.5, dt);
    cam.lookAt(LOOK_AT);
  });
  return null;
}
