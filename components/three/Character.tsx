"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { moveState } from "@/lib/gameState";
import { prefersReducedMotion } from "@/lib/motion";
import { PLANET_RADIUS } from "./Planet";

// x1.ninja logo palette: charcoal hood + electric-blue headband/X + gold
// katana furniture + steel blades.
const HOOD = "#3d4454";
const SUIT = "#232936";
const MASK = "#171c28";
const BLUE = "#2f6bff";
const GOLD = "#f0c75e";
const STEEL = "#c7d0e2";
const EYES = "#e8eefc";

const Y = new THREE.Vector3(0, 1, 0);
const _target = new THREE.Quaternion();

/** One katana for the crossed pair on the back. */
function Katana({ tilt }: { tilt: number }) {
  return (
    <group position={[0, 0.46, -0.085]} rotation={[0.12, 0, tilt]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.34, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* gold guard */}
      <mesh position={[0, -0.06, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.01, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* wrapped grip with gold pommel */}
      <mesh position={[0, -0.115, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
        <meshStandardMaterial color={MASK} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.17, 0]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * The x1 ninja. It stays at the top of the planet — the world rotates
 * underneath it — but it turns to face its direction of travel, bobs, leans,
 * swings its limbs, and its scarf flutters harder the faster it runs.
 */
export default function Character() {
  const yaw = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const scarf = useRef<THREE.Group>(null);
  const phase = useRef(0);

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
      {/* hero lighting — the ninja must pop against the dark world */}
      <pointLight position={[0.5, 0.9, 0.9]} intensity={1.8} distance={2.8} color="#dbe6ff" />
      <pointLight position={[-0.6, 0.7, -0.8]} intensity={1.3} distance={2.6} color="#2f6bff" />
      {/* contact glow + hover ring under the ninja */}
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
          {/* hooded head — charcoal like the logo */}
          <mesh position={[0, 0.66, 0]} castShadow>
            <sphereGeometry args={[0.14, 24, 24]} />
            <meshStandardMaterial color={HOOD} roughness={0.6} />
          </mesh>
          {/* the electric-blue headband — the logo's signature */}
          <mesh position={[0, 0.705, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.132, 0.024, 10, 24]} />
            <meshStandardMaterial
              color={BLUE}
              emissive={BLUE}
              emissiveIntensity={0.35}
              roughness={0.45}
            />
          </mesh>
          {/* headband knot + tails at the back */}
          <mesh position={[0, 0.705, -0.14]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color={BLUE} roughness={0.5} />
          </mesh>
          {/* mask opening: a curved band hugging the hood (no boxy corners) */}
          <mesh position={[0, 0.66, 0]}>
            <sphereGeometry args={[0.144, 24, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.14]} />
            <meshStandardMaterial color={MASK} roughness={0.6} />
          </mesh>
          {/* glowing eyes floating just proud of the band */}
          <mesh position={[0.042, 0.652, 0.139]}>
            <sphereGeometry args={[0.015, 10, 10]} />
            <meshStandardMaterial color={EYES} emissive={EYES} emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[-0.042, 0.652, 0.139]}>
            <sphereGeometry args={[0.015, 10, 10]} />
            <meshStandardMaterial color={EYES} emissive={EYES} emissiveIntensity={1.4} />
          </mesh>

          {/* blue scarf: collar + trailing tail */}
          <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.052, 0.02, 10, 20]} />
            <meshStandardMaterial color={BLUE} roughness={0.7} />
          </mesh>
          <group ref={scarf} position={[0, 0.545, -0.05]}>
            <mesh position={[0, 0, -0.1]} castShadow>
              <boxGeometry args={[0.055, 0.014, 0.2]} />
              <meshStandardMaterial color={BLUE} roughness={0.7} />
            </mesh>
          </group>

          {/* torso */}
          <mesh position={[0, 0.37, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.24, 4, 12]} />
            <meshStandardMaterial color={SUIT} roughness={0.55} metalness={0.1} />
          </mesh>
          {/* gold belt */}
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.062, 0.012, 10, 22]} />
            <meshStandardMaterial
              color={GOLD}
              emissive={GOLD}
              emissiveIntensity={0.35}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>

          {/* crossed katanas, like the logo */}
          <Katana tilt={-0.7} />
          <Katana tilt={0.7} />

          {/* arms (pivot at shoulder) */}
          <group ref={armL} position={[0.075, 0.49, 0]} rotation={[0, 0, 0.5]}>
            <mesh position={[0, -0.11, 0]} castShadow>
              <capsuleGeometry args={[0.026, 0.18, 4, 8]} />
              <meshStandardMaterial color={SUIT} roughness={0.6} />
            </mesh>
          </group>
          <group ref={armR} position={[-0.075, 0.49, 0]} rotation={[0, 0, -0.5]}>
            <mesh position={[0, -0.11, 0]} castShadow>
              <capsuleGeometry args={[0.026, 0.18, 4, 8]} />
              <meshStandardMaterial color={SUIT} roughness={0.6} />
            </mesh>
          </group>

        </group>
      </group>
    </group>
  );
}
