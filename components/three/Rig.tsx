"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { moveState } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";

/**
 * Two cameras in one:
 * - EXPLORE: the classic marketing shot — whole globe framed, front view.
 * - PLAY: an N64-style chase cam (Mario Galaxy framing): close behind and
 *   above the ninja, looking PAST him so the surface ahead fills the frame.
 *   Lakitu rule: the camera follows forward/lateral running but NEVER flips
 *   when you walk toward it — no wild swings on "down".
 */
const EXPLORE_LOOK = new THREE.Vector3(0, 0.5, 0);
const _look = new THREE.Vector3();

const wrapPI = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export default function Rig() {
  useFrame((state, dt) => {
    const cam = state.camera;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const playing = useGame.getState().mode !== "explore";

    if (playing) {
      // follow azimuth — only for DELIBERATE movement (keys held, not
      // knockback shoves) that is away-ish/lateral (≤ ~105°)
      if (moveState.inputActive && moveState.speed > 0.25) {
        const mAz = Math.atan2(-moveState.vx, -moveState.vz);
        const delta = wrapPI(mAz - moveState.camAz);
        if (Math.abs(delta) < 1.85) {
          moveState.camAz += delta * (1 - Math.exp(-2.6 * dt));
        }
      }
      const az = moveState.camAz + state.pointer.x * 0.05;
      // NEAR TOP-DOWN (Vampire Survivors legibility on a sphere): high above
      // the ninja, tilted slightly behind his facing. From up here the visible
      // cap covers ~55° ahead / ~80° behind — the whole action bubble.
      const dh = 1.7;
      const px = Math.sin(az) * dh;
      const pz = Math.cos(az) * dh;
      const py = 6.6 * Math.max(1, 0.9 / aspect) - state.pointer.y * 0.3;
      _look.set(-Math.sin(az) * 0.8, 2.25, -Math.cos(az) * 0.8); // just ahead of the ninja
      cam.position.x = THREE.MathUtils.damp(cam.position.x, px, 3.2, dt);
      cam.position.y = THREE.MathUtils.damp(cam.position.y, py, 3.2, dt);
      cam.position.z = THREE.MathUtils.damp(cam.position.z, pz, 3.2, dt);
      cam.lookAt(_look);
      return;
    }

    // explore: ease the follow angle home, classic front view
    moveState.camAz += wrapPI(0 - moveState.camAz) * (1 - Math.exp(-2.2 * dt));
    const az = moveState.camAz + state.pointer.x * 0.12;
    const dist = Math.max(9.2, 8.6 / aspect);
    const ty = 3.2 - state.pointer.y * 0.55;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, Math.sin(az) * dist, 2.5, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 2.5, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, Math.cos(az) * dist, 2.5, dt);
    cam.lookAt(EXPLORE_LOOK);
  });
  return null;
}
