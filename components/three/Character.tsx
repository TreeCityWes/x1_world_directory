"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { moveState } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
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
  const charId = useGame((s) => s.character);
  const yaw = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const scarf = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((state) => {
    // THEO hovers — a gentle AI float layered over the walk bob (runs after
    // the main frame handler below, so it adds on top of the walk offset)
    if (charId === "theo" && bob.current) {
      bob.current.position.y += 0.03 + Math.sin(state.clock.elapsedTime * 2.2) * 0.02;
    }
  });

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const speedNorm = Math.min(moveState.speed / 2.2, 1);
    phase.current += dt * (2 + moveState.speed * 4.5);

    // face the direction of travel (smoothed, no flips)
    if (yaw.current && moveState.speed > 0.08) {
      _target.setFromAxisAngle(Y, Math.atan2(moveState.vx, moveState.vz));
      yaw.current.quaternion.slerp(_target, 1 - Math.pow(0.0005, dt));
    }

    // decorative motion only — freeze it for reduced-motion users (facing stays)
    if (!prefersReducedMotion.current) {
      // idle bob + run bounce + lean into the run
      if (bob.current) {
        bob.current.position.y =
          0.02 * Math.sin(t * 2.2) + 0.05 * Math.abs(Math.sin(phase.current)) * speedNorm;
        bob.current.rotation.x = 0.22 * speedNorm;
      }

      // arms: gentle sway idle, big swing running
      const swing = Math.sin(phase.current) * (0.12 + 0.7 * speedNorm);
      if (armL.current) armL.current.rotation.x = swing;
      if (armR.current) armR.current.rotation.x = -swing;

      // scarf trails and flutters with speed
      if (scarf.current) {
        scarf.current.rotation.x =
          -0.35 - 0.55 * speedNorm + Math.sin(t * 7 + 1) * (0.06 + 0.12 * speedNorm);
      }
    }
  });

  return (
    <group position={[0, PLANET_RADIUS - 0.02, 0]} scale={0.5}>
      {/* hero lighting — the character must pop against the dark world */}
      <pointLight position={[0.5, 0.9, 0.9]} intensity={1.8} distance={2.8} color="#dbe6ff" />
      <pointLight position={[-0.6, 0.7, -0.8]} intensity={1.3} distance={2.6} color="#2f6bff" />
      {/* contact glow + hover ring under the character */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 28]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.011, 8, 32]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <group ref={yaw} rotation={[0, Math.PI, 0]}>
        <group ref={bob}>
          <CharacterBody charId={charId} armLRef={armL} armRRef={armR} scarfRef={scarf} />
        </group>
      </group>
    </group>
  );
}
