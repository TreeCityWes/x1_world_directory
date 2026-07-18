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

let shadowTex: THREE.CanvasTexture | null = null;
function getShadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.55, "rgba(0,0,0,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

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
  const auraRing = useRef<THREE.Mesh>(null);
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

    // pulse the identity ring so the aura breathes, not sits like a sticker
    if (auraRing.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      auraRing.current.scale.setScalar(pulse);
      (auraRing.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 3) * 0.1;
    }

    // face the direction of travel (smoothed, no flips)
    if (yaw.current && moveState.speed > 0.08) {
      _target.setFromAxisAngle(Y, Math.atan2(moveState.vx, moveState.vz));
      yaw.current.quaternion.slerp(_target, 1 - Math.pow(0.0005, dt));
    }

    // Reduced-motion freezes DECORATIVE motion (idle bob/sway/flutter) — but
    // the GAIT is functional feedback, not decoration: frozen legs on a body
    // the planet drags around is the "floating" bug (and the owner's own
    // Windows box has this flag set browser-wide, which is why every gait
    // tune looked broken to him). So: while actually MOVING, limbs animate
    // for everyone; at rest, reduced-motion holds a static pose.
    if (prefersReducedMotion.current && moveState.speed < 0.15) {
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
      // Jack is RIGGED (SkinnedHero): his GLB Walk/Run cycles own the bounce
      // and stride, so the procedural gait must NOT stack on top — a
      // double-bounce is exactly the old float. He keeps a light lean only.
      // The ninja is the procedural logo body: full gait treatment.
      const rigged = charId === "jack";
      if (bob.current) {
        bob.current.position.y = rigged
          ? hover
          : hover + 0.02 * Math.sin(t * 2.2) + 0.06 * Math.abs(Math.sin(phase.current)) * speedNorm;
        bob.current.rotation.x = (rigged ? 0.1 : 0.22) * speedNorm;
        bob.current.rotation.y = rigged ? 0 : Math.sin(phase.current) * 0.1 * speedNorm;
        bob.current.rotation.z = 0;
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
      {/* GROUNDING (LEG-ISSUE.md): a soft contact shadow feathered into the
          surface — it never bobs with the body, which is what sells feet
          touching ground instead of a hover pad */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshBasicMaterial
          map={getShadowTexture()}
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
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
      <mesh ref={auraRing} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
