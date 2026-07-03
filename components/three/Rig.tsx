"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { moveState } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";

// Composition: globe centered in the left pane, ninja upper third. In game
// mode the camera ORBITS to stay behind the run direction (third-person
// follow) so you never sprint blindly toward the screen; explore mode eases
// back to the fixed front view. WASD is camera-relative via moveState.camAz.
const LOOK_AT = new THREE.Vector3(0, 0.5, 0);

const wrapPI = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export default function Rig() {
  useFrame((state, dt) => {
    const cam = state.camera;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const playing = useGame.getState().mode !== "explore";

    // follow azimuth: behind the movement direction while running; home to 0 in explore
    let target = playing ? moveState.camAz : 0;
    if (playing && moveState.speed > 0.25) {
      target = Math.atan2(-moveState.vx, -moveState.vz);
    }
    const cur = moveState.camAz;
    moveState.camAz = cur + wrapPI(target - cur) * (1 - Math.exp(-2.2 * dt));

    const dist = Math.max(9.2, 8.6 / aspect) + (playing ? 0.9 : 0);
    const az = moveState.camAz + state.pointer.x * (playing ? 0.05 : 0.12);
    const ty = 3.2 - state.pointer.y * 0.55;

    cam.position.x = THREE.MathUtils.damp(cam.position.x, Math.sin(az) * dist, 3, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 2.5, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, Math.cos(az) * dist, 3, dt);
    cam.lookAt(LOOK_AT);
  });
  return null;
}
