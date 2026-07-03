"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { moveState } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";

// The canvas pane IS the left screen, so the globe is framed dead-center in
// it: fully visible top to bottom, ninja in the upper third. Gentle mouse
// drift only — the planet does the spinning.
const LOOK_AT = new THREE.Vector3(0, 0.5, 0);

export default function Rig() {
  useFrame((state, dt) => {
    const cam = state.camera;
    // narrow/portrait panes (mobile) need a longer lens or the globe crops
    const aspect = state.size.width / Math.max(1, state.size.height);
    const playing = useGame.getState().mode !== "explore";
    // survival runs: pull back a touch and lean with velocity for motion feel
    const dist = Math.max(9.2, 8.6 / aspect) + (playing ? 0.9 : 0);
    const lean = playing ? moveState.vx * 0.35 : 0;
    const tx = state.pointer.x * 1.1 + lean;
    const ty = 3.2 - state.pointer.y * 0.55 + (playing ? moveState.vz * 0.15 : 0);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 2.5, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 2.5, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, dist, 2.5, dt);
    cam.lookAt(LOOK_AT);
  });
  return null;
}
