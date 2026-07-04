"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { moveState } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { CHARACTERS } from "@/lib/characters";
import { prefersReducedMotion } from "@/lib/motion";
import CharacterBody from "./CharacterBody";
import { PLANET_RADIUS } from "./Planet";

const Y = new THREE.Vector3(0, 1, 0);
const _target = new THREE.Quaternion();

/**
 * The playable character. It stays at the top of the planet — the world
 * rotates underneath it — but it turns to face its direction of travel, bobs,
 * leans, swings its limbs, and its scarf flutters harder the faster it runs.
 */
export default function Character() {
  // Explore mode is always the X1 Ninja — you only pick a hero in the game.
  // (The store's `character` persists your last game pick via localStorage,
  // which would otherwise leak Jack/THEO/CAPY into the walkable globe.)
  const charId = useGame((s) => (s.mode === "explore" ? "ninja" : s.character));
  // the aura wears the character's identity color — cyan is not a default
  const aura = CHARACTERS[charId].colors.band;
  const yaw = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const scarf = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const speedNorm = Math.min(moveState.speed / 2.2, 1);
    // ~2.5 steps/s at full sprint — the old cadence (1.3/s) read as a glide
    phase.current += dt * (2.5 + moveState.speed * 8);
    // THEO's AI float — an offset composed into the single bob write below.
    // NEVER accumulate into position.y: a += here once leaked (reduced-motion
    // skipped the reset) and characters drifted off the planet.
    const hover = charId === "theo" ? 0.03 + Math.sin(t * 2.2) * 0.02 : 0;

    // face the direction of travel (smoothed, no flips)
    if (yaw.current && moveState.speed > 0.08) {
      _target.setFromAxisAngle(Y, Math.atan2(moveState.vx, moveState.vz));
      yaw.current.quaternion.slerp(_target, 1 - Math.pow(0.0005, dt));
    }

    // decorative motion freezes for reduced-motion users — but the pose is
    // still WRITTEN every frame so nothing ever accumulates or goes stale
    if (prefersReducedMotion.current) {
      if (bob.current) {
        bob.current.position.y = charId === "theo" ? 0.03 : 0;
        bob.current.rotation.x = 0;
        bob.current.rotation.y = 0;
        bob.current.rotation.z = 0;
      }
      if (armL.current) armL.current.rotation.x = 0;
      if (armR.current) armR.current.rotation.x = 0;
      if (legL.current) legL.current.rotation.set(0, 0, 0);
      if (legR.current) legR.current.rotation.set(0, 0, 0);
    } else {
      // Gait tuning per LEG-ISSUE.md: the legs always animated, but (a) the
      // fore/aft stride lives on the camera's depth axis, and (b) the big
      // whole-body bounce lifted feet off the ground TOGETHER — which is
      // exactly what floating looks like. So: bounce small, stride visible
      // via a full-cycle SCISSOR on z (legs spread/cross, reads from
      // behind), and a planted contact shadow does the grounding.
      if (bob.current) {
        bob.current.position.y =
          hover + 0.02 * Math.sin(t * 2.2) + 0.06 * Math.abs(Math.sin(phase.current)) * speedNorm;
        bob.current.rotation.x = 0.22 * speedNorm;
        bob.current.rotation.y =
          Math.sin(phase.current) * (charId === "jack" ? 0.16 : 0.1) * speedNorm;
        // Jack's carved legs (splitJackLegs) do the striding now — the
        // waddle roll stays as a light accent, not the whole gait
        bob.current.rotation.z =
          charId === "jack" ? Math.sin(phase.current) * 0.09 * speedNorm : 0;
      }

      // arms: gentle sway idle, big swing running
      const swing = Math.sin(phase.current) * (0.12 + 0.7 * speedNorm);
      if (armL.current) armL.current.rotation.x = swing;
      if (armR.current) armR.current.rotation.x = -swing;
      // legs: fore/aft stride + full-cycle scissor (spread ↔ cross) — the
      // scissor is the part the behind-the-runner camera actually sees
      const scissor = 0.3 * speedNorm * Math.sin(phase.current);
      if (legL.current) {
        legL.current.rotation.x = -swing * 1.4;
        legL.current.rotation.z = scissor;
      }
      if (legR.current) {
        legR.current.rotation.x = swing * 1.4;
        legR.current.rotation.z = scissor;
      }

      // scarf trails and flutters with speed
      if (scarf.current) {
        scarf.current.rotation.x =
          -0.35 - 0.55 * speedNorm + Math.sin(t * 7 + 1) * (0.06 + 0.12 * speedNorm);
      }
    }
  });

  return (
    // scale 0.42: heroes read small against the horde — the world should
    // dwarf the runner (owner call; hitboxes unchanged, visual only)
    <group position={[0, PLANET_RADIUS - 0.02, 0]} scale={0.42}>
      {/* hero lighting — ONE tight white kicker. The old wide-radius pair
          (white + aura-colored) painted big green/blue pools on the ground
          that followed the runner — read as a glitch, not a glow. */}
      <pointLight position={[0.4, 0.8, 0.55]} intensity={1.1} distance={1.4} color="#dbe6ff" />
      {/* GROUNDING (LEG-ISSUE.md): a dark contact shadow PLANTED on the
          surface — it never bobs with the body, which is what sells feet
          touching ground instead of a hover pad */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.19, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.38} depthWrite={false} />
      </mesh>
      {/* identity glow + ring, softened — additive discs read as hover FX */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 28]} />
        <meshBasicMaterial
          color={aura}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.011, 8, 32]} />
        <meshBasicMaterial
          color={aura}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <group ref={yaw} rotation={[0, Math.PI, 0]}>
        <group ref={bob}>
          <CharacterBody
            charId={charId}
            armLRef={armL}
            armRRef={armR}
            legLRef={legL}
            legRRef={legR}
            scarfRef={scarf}
          />
        </group>
      </group>
    </group>
  );
}
