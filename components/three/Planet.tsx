"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { regions, type Region } from "@/lib/regions";
import { useWorld } from "@/lib/store";
import { moveState } from "@/lib/gameState";
import { prefersReducedMotion } from "@/lib/motion";
import { run, useGame } from "@/lib/gameStore";
import { touchStick } from "@/lib/touchInput";
import { useKeyboard } from "@/lib/useKeyboard";
import Landmark from "@/components/three/Landmarks";
import GameLayer from "@/components/game/GameLayer";

export const PLANET_RADIUS = 2.4;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

// Movement feel — tuned for "physical toy planet"
const ACC = 1.9; // rad/s² from held keys
const DAMP = 2.8; // exponential damping → inertia / glide
const MAX_SPEED = 0.6; // rad/s — a stroll, not a sprint (panel keeps up)
const NEAR_ANGLE = 0.28; // rad from the top at which a region counts as "near"
const SITE_SCALE = 0.44; // 55 landmarks — keep them small so the world breathes

// Classic additive fresnel glow — the planet's atmosphere.
const ATMOSPHERE = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vNormal;
    void main() {
      // same classic halo, but clamped: pow(negative, 3.0) is UNDEFINED in
      // GLSL and produced NaN fragments that flashed randomly in the sky
      float f = clamp(0.66 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
      gl_FragColor = vec4(0.18, 0.32, 0.68, 1.0) * (f * f * f);
    }
  `,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});

/** Subtle hex-grid texture for the planet shell — drawn once on a canvas. */
function makeHexTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "rgba(80, 130, 255, 0.55)";
  ctx.lineWidth = 1.1;
  const s = 20; // hex radius
  const h = Math.sqrt(3) * s;
  for (let col = 0; col * 1.5 * s < c.width + s; col++) {
    for (let row = 0; row * h < c.height + h; row++) {
      const cx = col * 1.5 * s;
      const cy = row * h + (col % 2 ? h / 2 : 0);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k + 30);
        const x = cx + s * Math.cos(a);
        const y = cy + s * Math.sin(a);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Slow-drifting dust/satellite specks around the planet — depth + life. */
function OrbitDust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const n = 260;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = i * 2.399963;
      const rad = 3.15 + ((i * 97) % 100) / 100 * 1.3;
      arr[i * 3] = Math.cos(t) * rad;
      arr[i * 3 + 1] = Math.sin(i * 3.7) * 1.6;
      arr[i * 3 + 2] = Math.sin(t) * rad;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.016} sizeAttenuation transparent opacity={0.45} />
    </points>
  );
}

/**
 * The world itself — and the "walking" illusion. The character never moves;
 * WASD (and drag) rotates this whole group underneath them, with inertia.
 * Also runs the proximity check that decides which region is "near".
 */
export default function Planet() {
  const group = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const keys = useKeyboard();
  const vel = useRef({ x: 0, y: 0, z: 0 }); // angular velocity around world axes
  const touchAz = useRef(0); // camera azimuth FROZEN at stick-press (see below)
  const touchHeld = useRef(false);
  const dragging = useRef(false); // true while drag-spinning — gates the idle drift
  const lastNear = useRef<string | null>(null);
  const lastClosest = useRef<string | null>(null);
  const setNear = useWorld((s) => s.setNear);
  const setClosest = useWorld((s) => s.setClosest);
  const gl = useThree((s) => s.gl);

  const hexMap = useMemo(() => makeHexTexture(), []);
  const gameMode = useGame((s) => s.mode);
  const activeSites = useGame((s) => s.activeSites);

  const anchors = useMemo(
    () =>
      regions.map((r) => ({
        region: r,
        local: new THREE.Vector3(...r.dir), // unit direction, planet-local
      })),
    [],
  );

  // Drag to spin (mouse + touch): horizontal = turntable, vertical = roll.
  useEffect(() => {
    const el = gl.domElement;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      if (useGame.getState().mode !== "explore") return; // drag-spin is explore-only
      dragging.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (useGame.getState().mode !== "explore") return;
      if (!dragging.current) return;
      vel.current.x += (e.clientY - lastY) * 0.0055;
      vel.current.y += (e.clientX - lastX) * 0.0055;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging.current = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const k = keys.current;
    const v = vel.current;
    const gMode = useGame.getState().mode;
    const playing = gMode === "play";
    const inputAllowed = gMode === "explore" || playing;
    const mult = playing ? run.speedMult : 1;
    const maxSpeed = MAX_SPEED * mult;

    // accelerate from input (keyboard OR mobile D-pad), camera-relative:
    // "forward" is always away from the camera, whatever its orbit angle
    if (inputAllowed) {
      const az = moveState.camAz;
      // The stick's reference frame FREEZES at press. Mapping it against the
      // live camera azimuth creates a feedback loop (stick turns ninja →
      // camera follows → same thumb now means a new direction → camera
      // chases forever = the mobile swooping bug). Frozen frame = push left,
      // camera swings once, settles.
      if (touchStick.active && !touchHeld.current) touchAz.current = az;
      touchHeld.current = touchStick.active;
      const kFwd = (k.forward ? 1 : 0) - (k.back ? 1 : 0);
      const kSide = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      // desired surface direction in world space — keyboard uses the live
      // camera frame, stick uses its press-time frame; NORMALIZED so
      // diagonals aren't √2 faster than cardinal runs
      const ta = touchAz.current;
      let mx = -Math.sin(az) * kFwd + Math.cos(az) * kSide;
      let mz = -Math.cos(az) * kFwd - Math.sin(az) * kSide;
      mx += -Math.sin(ta) * touchStick.y + Math.cos(ta) * touchStick.x;
      mz += -Math.cos(ta) * touchStick.y - Math.sin(ta) * touchStick.x;
      const mlen = Math.hypot(mx, mz);
      if (mlen > 1) {
        mx /= mlen;
        mz /= mlen;
      }
      if (mlen > 0.001) moveState.inputAz = Math.atan2(-mx, -mz);
      // map to planet angular velocity (ω_x moves the ninja -Z, ω_z moves +X)
      v.x += ACC * mult * dt * -mz;
      v.z += ACC * mult * dt * mx;
      moveState.inputActive =
        kFwd !== 0 || kSide !== 0 || touchStick.x !== 0 || touchStick.y !== 0;
    } else {
      moveState.inputActive = false;
    }

    // knockback from enemy contact + heavy legs while shoving through them
    if (moveState.pushVX !== 0 || moveState.pushVZ !== 0) {
      v.x += moveState.pushVX;
      v.z += moveState.pushVZ;
      moveState.pushVX = 0;
      moveState.pushVZ = 0;
    }
    const contactDrag = moveState.contactSlow ? Math.exp(-2.2 * dt) : 1;
    moveState.contactSlow = false;
    v.x *= contactDrag;
    v.z *= contactDrag;

    // …damp for inertia, clamp the COMBINED surface speed (diagonals included)
    const d = Math.exp(-DAMP * dt);
    v.x *= d;
    v.y = THREE.MathUtils.clamp(v.y * d, -maxSpeed, maxSpeed);
    v.z *= d;
    const surf = Math.hypot(v.x, v.z);
    if (surf > maxSpeed) {
      const s = maxSpeed / surf;
      v.x *= s;
      v.z *= s;
    }

    // explore-only idle drift so a still world still feels alive (DESIGN.md);
    // never during a run — the ninja must stay pole-locked under the chase cam
    if (
      gMode === "explore" &&
      !dragging.current &&
      !moveState.inputActive &&
      surf < 0.02 &&
      !prefersReducedMotion.current
    ) {
      v.y = 0.04;
    }

    // freeze the world under modals — no inertia drift beneath the pause /
    // level-up / death cards (combat is frozen; the ground must be too)
    if (gMode !== "explore" && gMode !== "play") {
      v.x = v.y = v.z = 0;
    }

    // rotate the world under the character's feet (world-space axes)
    g.quaternion.premultiply(_q.setFromAxisAngle(X_AXIS, v.x * dt));
    g.quaternion.premultiply(_q.setFromAxisAngle(Y_AXIS, v.y * dt));
    g.quaternion.premultiply(_q.setFromAxisAngle(Z_AXIS, v.z * dt));

    // share apparent surface velocity with the character (facing + walk cycle)
    moveState.vx = v.z * PLANET_RADIUS;
    moveState.vz = -v.x * PLANET_RADIUS;
    moveState.speed = Math.hypot(moveState.vx, moveState.vz);

    // walking is fresh intent: release stale hovers (R3F only re-checks hover
    // on MOUSE moves, so a landmark rotating out from under a still cursor
    // stays "hovered" forever) and any click/E lock, so the panel follows
    // the closest landmark again.
    if (moveState.speed > 0.35) {
      const st = useWorld.getState();
      if (st.hoveredId) st.setHovered(null);
      if (st.selectedId) st.select(null);
    }

    // the world no longer "breathes" — the scale pulse throbbed against the
    // fixed atmosphere shell and read as flicker; the idle spin carries the life

    // proximity panel updates only matter while exploring
    if (gMode === "explore") {
      let closest: string | null = null;
      let best = Infinity;
      for (const a of anchors) {
        _v.copy(a.local).applyQuaternion(g.quaternion);
        const angle = Math.acos(THREE.MathUtils.clamp(_v.dot(UP), -1, 1));
        if (angle < best) {
          best = angle;
          closest = a.region.id;
        }
      }
      // "near" = closest AND within interaction range
      const nearest = best < NEAR_ANGLE ? closest : null;
      if (nearest !== lastNear.current) {
        lastNear.current = nearest;
        setNear(nearest);
      }
      if (closest !== lastClosest.current) {
        lastClosest.current = closest;
        setClosest(closest);
      }
    } else if (lastNear.current !== null) {
      lastNear.current = null;
      setNear(null);
    }
  });

  return (
    <>
      <group ref={group}>
        {/* the ocean — dark navy, not black */}
        <mesh ref={sphere} receiveShadow>
          <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
          <meshPhysicalMaterial
            color="#16234a"
            roughness={0.5}
            metalness={0.25}
            clearcoat={0.4}
            clearcoatRoughness={0.4}
          />
        </mesh>
        {/* subtle hex-grid shell */}
        <mesh scale={1.0015}>
          <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
          <meshBasicMaterial
            map={hexMap}
            transparent
            opacity={0.14}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* the ecosystem: all landmarks while exploring; only active powerup
            sites during a survival run */}
        {anchors
          .filter(({ region }) => gameMode === "explore" || activeSites.includes(region.id))
          .map(({ region, local }, i) => (
            <RegionSite
              key={region.id}
              region={region}
              normal={local}
              index={i}
              forceLit={gameMode !== "explore"}
            />
          ))}

        {/* glowing network traces between ecosystem nodes (explore only) */}

        {/* X1 Ninja Survivors — enemies, shurikens, coins, katanas */}
        <GameLayer planet={group} />
      </group>

      <OrbitDust />

      {/* atmosphere glow (doesn't rotate — it's light, not land) */}
      <mesh scale={1.08}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <primitive object={ATMOSPHERE} attach="material" />
      </mesh>
    </>
  );
}

function RegionSite({
  region,
  normal,
  index,
  forceLit = false,
}: {
  region: Region;
  normal: THREE.Vector3;
  index: number;
  /** during a survival run every visible site is a glowing powerup */
  forceLit?: boolean;
}) {
  // lit = the one project the side panel is currently showing
  const panelLit = useWorld(
    (s) => (s.selectedId ?? s.nearId ?? s.hoveredId ?? s.closestId) === region.id,
  );
  const lit = forceLit || panelLit;
  const select = useWorld((s) => s.select);
  const setHoveredId = useWorld((s) => s.setHovered);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const site = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Group>(null);

  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, normal), [normal]);
  const pos = useMemo(() => normal.clone().multiplyScalar(PLANET_RADIUS * 0.995), [normal]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // the focused landmark pulses gently
    if (pulse.current) {
      const s = lit ? 1 + Math.sin(t * 6 + index) * 0.05 : 1;
      pulse.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={site} position={pos} quaternion={quat} scale={SITE_SCALE}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          select(region.id);
        }}
        onPointerOver={() => {
          setHovered(true);
          setHoveredId(region.id);
        }}
        onPointerOut={() => {
          setHovered(false);
          setHoveredId(null);
        }}
      >
        <group ref={pulse}>
          <Landmark kind={region.kind} accent={region.accent} />
        </group>
        {/* glowing circular project pad */}
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 32]} />
          <meshBasicMaterial
            color={region.accent}
            transparent
            opacity={lit ? 0.3 : 0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.006, 8, 40]} />
          <meshBasicMaterial color={region.accent} transparent opacity={lit ? 1 : 0.4} />
        </mesh>
        {/* generous invisible hit target */}
        <mesh position={[0, 0.18, 0]} visible={false}>
          <sphereGeometry args={[0.24, 8, 8]} />
        </mesh>
        {/* exactly ONE landmark is lit: the one in the side panel */}
        {lit && (
          <pointLight position={[0, 0.35, 0]} color={region.accent} distance={1.6} intensity={2} />
        )}
      </group>
    </group>
  );
}
