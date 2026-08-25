"use client";

import { HEX, THEME, rgba } from "@/lib/theme";

/* eslint-disable react-hooks/immutability, react-hooks/purity */
// This file is the 60fps game simulation hot path. It deliberately mutates
// module-scope pooled objects (world, run) inside useFrame, not during render.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { mergeVertices } from "three-stdlib";
import * as THREE from "three";
import { regions } from "@/lib/regions";
import {
  finaleDmgMult,
  finaleHpMult,
  finalePower,
  finaleSpeedMult,
  shouldRequestFinale,
  winTarget,
} from "@/lib/finale";
import {
  DEX_GATE_DMG_BASE,
  DEX_GATE_DMG_SPREAD,
  siteKindDim,
} from "@/lib/siteCapture";
import { monoFont } from "@/lib/canvasFont";
import { sfx, duckMusic } from "@/lib/sound";
import Nemesis from "@/components/game/Nemesis";
import { BugMob, GasWisp, RugMob } from "@/components/game/Mobs";
import { moveState } from "@/lib/gameState";
import {
  charDef,
  DIFFICULTIES,
  ENEMY_TYPES,
  armorMult,
  critChance,
  currentSpeedMult,
  effectiveRunSeconds,
  fireCooldown,
  haloAngle,
  lifestealPct,
  magnetAngle,
  regenRate,
  rollChoices,
  run,
  shurikenDamage,
  useGame,
  xpMult,
  type EnemyTypeId,
} from "@/lib/gameStore";

/**
 * X1 Ninja Survivors — the spherical arena. Lives INSIDE the rotating planet
 * group, so every entity is a unit direction in planet-local space carried by
 * the world's rotation. The ninja never moves (he's at the world-space pole);
 * "chasing" means rotating an enemy's direction vector toward whichever local
 * point is currently under him. Vampire Survivors, but the arena is a planet.
 */

const R = 2.4; // PLANET_RADIUS (kept literal to avoid a cycle with Planet.tsx)
const UP = new THREE.Vector3(0, 1, 0);

// pools
const MAX_ENEMIES = 56;
const MAX_SHURIKENS = 40;
const MAX_GEMS = 90;
const MAX_KATANAS = 4;
const MAX_WAKE = 16;
const MAX_PARTS = 96;
const MAX_FLAMES = 64;

const CONTACT_BASE = 0.055; // player's angular "radius"
const SHURIKEN_SPEED = 1.7; // rad/s
const SHURIKEN_TTL = 1.1;
const GEM_PICKUP = 0.055;
const CAPTURE_ANGLE = 0.12; // must actually step onto the pad (arc ≈ 0.29 wu)
const ACTIVE_SITES = 3;
const SITE_RESPAWN = 2.5;

type Enemy = {
  alive: boolean;
  type: EnemyTypeId;
  dir: THREE.Vector3;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  dmg: number;
  xp: number;
  gemSplit: number;
  t: number;
  biteAt: number; // next time this enemy may bite (discrete attacks, not dps)
  recoilUntil: number; // after a bite it backs off briefly
  hitFlashUntil: number; // white emissive flash when struck
  bossKind: "whale" | "nemesis";
  markedUntil: number; // THEO scan mark: +50% damage taken, +50% xp
  lungeAt: number; // bosses: next telegraphed charge
  windupUntil: number; // bosses: rearing back before the charge
};
type Shuriken = { alive: boolean; pos: THREE.Vector3; axis: THREE.Vector3; ttl: number; dmg: number; spin: number; kind: string; pierce: number; evo: boolean; trailAt: number };
type PendingSpawn = { active: boolean; type: EnemyTypeId; dir: THREE.Vector3; at: number };
type DmgNum = { alive: boolean; dir: THREE.Vector3; t0: number; val: number; crit: boolean; kill: boolean };
type CaptureFx = { active: boolean; dir: THREE.Vector3; t0: number };
type Gem = { alive: boolean; dir: THREE.Vector3; xp: number; t: number };
type Wake = { alive: boolean; dir: THREE.Vector3; life: number; kind: "gold" | "cyan" };
type Flame = { alive: boolean; dir: THREE.Vector3; life: number; maxLife: number; smoke: boolean };
type Boom = { alive: boolean; dir: THREE.Vector3; t0: number };
type Part = {
  alive: boolean;
  dir: THREE.Vector3;
  axis: THREE.Vector3;
  tangent: THREE.Vector3;
  speed: number;
  life: number;
  color: string;
};

const _q = new THREE.Quaternion();
const _qInv = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _aPos = new THREE.Vector3();
const _aT = new THREE.Vector3();
const _aSite = new THREE.Vector3();
const REGION_BY_ID = new Map(regions.map((r) => [r.id, r]));

// Jack's XEN coin face: bold white X on transparency (black disc behind it)
let xCoinTex: THREE.CanvasTexture | null = null;
function getXCoinTexture() {
  if (xCoinTex) return xCoinTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;

  // metallic gold rim so the coin reads as a charged projectile, not a sticker
  const rg = ctx.createRadialGradient(64, 64, 10, 64, 64, 58);
  rg.addColorStop(0, "#0b0b0d");
  rg.addColorStop(0.72, "#181408");
  rg.addColorStop(0.92, "#b8861b");
  rg.addColorStop(1, "#5c3d05");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 128, 128);

  // soft gold glow behind the white X
  ctx.shadowColor = HEX.gold;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = HEX.gold;
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(36, 36);
  ctx.lineTo(92, 92);
  ctx.moveTo(92, 36);
  ctx.lineTo(36, 92);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = HEX.white;
  ctx.lineWidth = 20;
  ctx.stroke();

  xCoinTex = new THREE.CanvasTexture(c);
  return xCoinTex;
}

// spawn-warning marker: white-hot center that tightens into a red landing bloom
let warnTex: THREE.CanvasTexture | null = null;
function getWarnTexture() {
  if (warnTex) return warnTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  g.addColorStop(0, "rgba(255, 255, 245, 0.95)");
  g.addColorStop(0.32, "rgba(255, 190, 70, 0.55)");
  g.addColorStop(0.7, "rgba(255, 90, 40, 0.18)");
  g.addColorStop(1, "rgba(255, 40, 20, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  warnTex = new THREE.CanvasTexture(c);
  return warnTex;
}

// soft energy ring shared by shield / slash / scan / magnet — replaces
// hard-edged geometry with a feathered radial band so FX read as glow volumes
let energyRingTex: THREE.CanvasTexture | null = null;
function getEnergyRingTexture() {
  if (energyRingTex) return energyRingTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 28, 64, 64, 60);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.38, "rgba(255,255,255,0.05)");
  g.addColorStop(0.48, "rgba(255,255,255,0.9)");
  g.addColorStop(0.58, "rgba(255,255,255,0.9)");
  g.addColorStop(0.68, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  energyRingTex = new THREE.CanvasTexture(c);
  return energyRingTex;
}

// floating damage numbers — only crits and boss hits, so chaos stays readable
const dmgTexCache = new Map<string, THREE.CanvasTexture>();
function getDmgTexture(text: string, crit: boolean, kill: boolean) {
  const key = `${text}|${crit}|${kill}`;
  const hit = dmgTexCache.get(key);
  if (hit) return hit;
  if (dmgTexCache.size > 80) {
    const [k, t] = dmgTexCache.entries().next().value!;
    t.dispose();
    dmgTexCache.delete(k);
  }
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const size = crit ? 44 : kill ? 38 : 34;
  ctx.font = monoFont(900, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // colored glow behind the text so it cuts through bright enemies/bloom
  const glow = crit ? HEX.coin : kill ? HEX.dmgKill : HEX.inkLight;
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = glow;
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.5;
  ctx.fillText(text, 64, 32);
  ctx.restore();
  ctx.lineWidth = 7;
  ctx.strokeStyle = HEX.dmgOutline;
  ctx.strokeText(text, 64, 32);
  ctx.fillStyle = glow;
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  dmgTexCache.set(key, tex);
  return tex;
}

// floating site-name banners over active targets — free advertising.
// Bounded by the region count in practice; hard cap + evict for safety.
const siteLabelCache = new Map<string, THREE.CanvasTexture>();
function getSiteLabel(name: string) {
  const hit = siteLabelCache.get(name);
  if (hit) return hit;
  if (siteLabelCache.size > 80) {
    const [k, t] = siteLabelCache.entries().next().value!;
    t.dispose();
    siteLabelCache.delete(k);
  }
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  let size = 56;
  ctx.font = monoFont(800, size);
  while (ctx.measureText(name).width > 430 && size > 26) {
    size -= 4;
    ctx.font = monoFont(800, size);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = Math.min(500, ctx.measureText(name).width + 40);
  const h = size + 28;
  const x = 256 - w / 2;
  const y = 64 - h / 2;
  const r = 18;
  ctx.fillStyle = rgba(HEX.space, 0.72);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(HEX.siteLabel, 0.45);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(HEX.labelOutline, 0.95);
  ctx.strokeText(name, 256, 64);
  ctx.fillStyle = HEX.siteLabel;
  ctx.fillText(name, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  siteLabelCache.set(name, tex);
  return tex;
}

// vertical flame sprite: white-hot core → amber → red tip, feathered alpha
let flameTex: THREE.CanvasTexture | null = null;
function getFlameTexture() {
  if (flameTex) return flameTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(32, 128, 32, 0);
  g.addColorStop(0, "rgba(255,60,40,0)");
  g.addColorStop(0.25, "rgba(255,90,40,0.35)");
  g.addColorStop(0.5, "rgba(255,160,60,0.7)");
  g.addColorStop(0.75, "rgba(255,220,120,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 128);
  // horizontal feather so the edges are soft
  const rg = ctx.createRadialGradient(32, 64, 8, 32, 64, 54);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.6, "rgba(255,255,255,0.6)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 64, 128);
  ctx.globalCompositeOperation = "source-over";
  flameTex = new THREE.CanvasTexture(c);
  return flameTex;
}
const _t = new THREE.Vector3();
const _f0 = new THREE.Vector3();

// The cast: goblin = BUG, gremlin = GAS wisp, rug = THE RUG (all procedural,
// Mobs.tsx); boss alternates the whale GLB and the Nemesis shadow.
// only the whale GLB is real — regular mobs are procedural (Mobs.tsx)
const WHALE_GLB = "/models/whale.glb";
// THE WHALE boss — unmistakably the biggest thing on the field
const BOSS_SIZE = 1.05;
useGLTF.preload(WHALE_GLB);

// The pool is partitioned into fixed per-type slot ranges.
const TYPE_RANGES: Record<EnemyTypeId, [number, number]> = {
  goblin: [0, 26],
  gremlin: [26, 42],
  rug: [42, 52],
  boss: [52, 56],
};
function typeForSlot(i: number): EnemyTypeId {
  if (i < 26) return "goblin";
  if (i < 42) return "gremlin";
  if (i < 52) return "rug";
  return "boss";
}
function tangentToward(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Vector3) {
  // unit tangent at `from` pointing along the great circle toward `to`
  out.copy(to).addScaledVector(from, -from.dot(to));
  const len = out.length();
  if (len < 1e-6) return null;
  return out.multiplyScalar(1 / len);
}

function rotateToward(dir: THREE.Vector3, target: THREE.Vector3, maxAngle: number) {
  const full = dir.angleTo(target);
  if (full < 1e-5) return;
  _axis.crossVectors(dir, target);
  if (_axis.lengthSq() < 1e-10) return;
  _axis.normalize();
  dir.applyQuaternion(_q.setFromAxisAngle(_axis, Math.min(maxAngle, full))).normalize();
}

function randomDirNear(center: THREE.Vector3, minAng: number, maxAng: number) {
  _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  _axis.crossVectors(center, _v2);
  if (_axis.lengthSq() < 1e-6) _axis.set(1, 0, 0);
  _axis.normalize();
  const ang = minAng + Math.random() * (maxAng - minAng);
  const dir = center.clone().applyQuaternion(_q.setFromAxisAngle(_axis, ang));
  // random swing around the center so spawns surround the player
  dir.applyQuaternion(_q.setFromAxisAngle(center, Math.random() * Math.PI * 2));
  return dir.normalize();
}

// Module-scope singleton: GameLayer mounts once; mutating outside React state
// is deliberate (60fps hot path — same pattern as lib/gameState.ts).
const world = {
      enemies: Array.from({ length: MAX_ENEMIES }, (): Enemy => ({
        alive: false, type: "goblin", dir: new THREE.Vector3(), hp: 0, maxHp: 0,
        speed: 0, radius: 0, dmg: 0, xp: 0, gemSplit: 1, t: 0, biteAt: 0, recoilUntil: 0, hitFlashUntil: 0, bossKind: "whale", markedUntil: 0, lungeAt: 0, windupUntil: 0,
      })),
      shurikens: Array.from({ length: MAX_SHURIKENS }, (): Shuriken => ({
        alive: false, pos: new THREE.Vector3(), axis: new THREE.Vector3(), ttl: 0, dmg: 0, spin: 0, kind: "shuriken", pierce: 1, evo: false, trailAt: 0,
      })),
      // sized to outrun the densest burst (1+floor(block/3)) across the ~3
      // spawn ticks that can be in flight at once → spawns stay telegraphed
      pending: Array.from({ length: 40 }, (): PendingSpawn => ({ active: false, type: "goblin", dir: new THREE.Vector3(), at: 0 })),
      dmgNums: Array.from({ length: 10 }, (): DmgNum => ({ alive: false, dir: new THREE.Vector3(), t0: 0, val: 0, crit: false, kill: false })),
      captureFx: Array.from({ length: 3 }, (): CaptureFx => ({ active: false, dir: new THREE.Vector3(), t0: 0 })),
      gems: Array.from({ length: MAX_GEMS }, (): Gem => ({
        alive: false, dir: new THREE.Vector3(), xp: 0, t: 0,
      })),
      pLocal: new THREE.Vector3(0, 1, 0),
      facingLocal: new THREE.Vector3(0, 0, -1),
      facingWorld: new THREE.Vector3(0, 0, -1),
      fireAt: 0,
      spawnAt: 0,
      bossAtBlock: 0,
  bossCount: 0,
  finalWanted: false, // finale requested — spawn may be retried (see lib/finale.ts)
  finalSpawned: false,
  finalIdx: -1,
      siteIds: [] as string[],
      siteRespawnAt: 0,
  captured: new Set<string>(),
      syncAt: 0,
  knockAt: 0,
  novaAt: 0,
  wakeAt: 0,
  whaleWakeAt: 0,
  arcAt: 0,
  scanAt: 0,
  capyShieldAt: 0,
  // character signature FX timestamps (run.t clock)
  slashFxAt: -10,
  slashDir: new THREE.Vector3(1, 0, 0),
  slashFull: false, // Validator Sweep: the blade travels the whole circle
  scanFxAt: -10,
  arcFlash: 0,
  arcPoints: [] as THREE.Vector3[],
  arcDirty: false,
  flameAt: 0,
  flames: Array.from({ length: MAX_FLAMES }, (): Flame => ({ alive: false, dir: new THREE.Vector3(), life: 0, maxLife: 1, smoke: false })),
  booms: Array.from({ length: 6 }, (): Boom => ({ alive: false, dir: new THREE.Vector3(), t0: 0 })),
  wake: Array.from({ length: MAX_WAKE }, (): Wake => ({ alive: false, dir: new THREE.Vector3(), life: 0, kind: "gold" })),
  parts: Array.from(
    { length: MAX_PARTS },
    (): Part => ({ alive: false, dir: new THREE.Vector3(), axis: new THREE.Vector3(), tangent: new THREE.Vector3(), speed: 0, life: 0, color: HEX.white }),
  ),
      started: false,
};

// halo flame gradient: white-hot base -> ember -> red tip
const FLAME_A = THEME.flameA;
const FLAME_B = THEME.flameB;
const FLAME_C = THEME.flameC;
const _col = new THREE.Color();

// arc lightning: a jagged bright core tube inside a soft glow tube — a real
// BOLT, not a hairline (GL line width is ignored on most Windows GPUs)
const ARC_MAT_CORE = new THREE.MeshBasicMaterial({
  color: THEME.arcCore,
  transparent: true,
  opacity: 1,
  toneMapped: false,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ARC_MAT_GLOW = new THREE.MeshBasicMaterial({
  color: THEME.arcGlow,
  transparent: true,
  opacity: 0.4,
  toneMapped: false,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ARC_CORE = new THREE.Mesh(new THREE.BufferGeometry(), ARC_MAT_CORE);
const ARC_GLOW = new THREE.Mesh(new THREE.BufferGeometry(), ARC_MAT_GLOW);
ARC_CORE.visible = ARC_GLOW.visible = false;
ARC_CORE.frustumCulled = ARC_GLOW.frustumCulled = false;

export default function GameLayer({ planet }: { planet: React.RefObject<THREE.Group | null> }) {
  const mode = useGame((s) => s.mode);

  // THE WHALE (boss #1) is the only GLB left — regular mobs are procedural
  // crypto creatures now (Mobs.tsx). Clones only for the boss slots.
  const whaleGltf = useGLTF(WHALE_GLB);
  const whaleHatGltf = useGLTF("/models/tophat.glb"); // fat-cat accessory
  // the real CC0 shuriken model, flattened into one normalized geometry the
  // whole projectile pool can share
  const shurikenGltf = useGLTF("/models/shuriken.glb");
  const shurikenGeo = useMemo(() => {
    let src: THREE.Mesh | null = null;
    shurikenGltf.scene.updateMatrixWorld(true);
    shurikenGltf.scene.traverse((o) => {
      if (!src && (o as THREE.Mesh).isMesh) src = o as THREE.Mesh;
    });
    if (!src) return null;
    const mesh = src as THREE.Mesh;
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    g.center();
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new THREE.Vector3());
    const k = 0.085 / (Math.max(size.x, size.y, size.z) || 1);
    g.scale(k, k, k);
    // the star must lie flat (spin plane = XZ): flatten the thinnest axis to Y
    if (size.y > size.x || size.y > size.z) {
      if (size.x <= size.z) g.rotateZ(Math.PI / 2);
      else g.rotateX(Math.PI / 2);
    }
    return g;
  }, [shurikenGltf]);
  const enemyClones = useMemo(() => {
    return Array.from({ length: MAX_ENEMIES }, (_, i) => {
      if (typeForSlot(i) !== "boss") return null;
      const clone = whaleGltf.scene.clone(true);
      // measure & normalize: longest dimension -> TARGET_SIZE, centered
      const box = new THREE.Box3().setFromObject(clone);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const k = BOSS_SIZE / maxDim;
      const center = box.getCenter(new THREE.Vector3());
      clone.scale.setScalar(k);
      clone.position.set(-center.x * k, -center.y * k, -center.z * k);
      // menace pass: darken the hide, smolder crimson, smooth the low-poly
      // facets (weld duplicated verts, then average normals)
      clone.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          if (mesh.geometry) {
            mesh.geometry = mergeVertices(mesh.geometry);
            mesh.geometry.computeVertexNormals();
          }
          const m = (mesh.material as THREE.MeshStandardMaterial).clone();
          m.color?.multiplyScalar(0.72);
          m.emissive?.set(THEME.bossMenace);
          m.emissiveIntensity = 0.4;
          m.flatShading = false;
          m.needsUpdate = true;
          mesh.material = m;
        }
      });
      // fat-cat pass: gold-banded top hat + monocle-and-chain. The menace was
      // all in the shader — one accessory flips the read from "animal" to
      // "whale (investor)" (GLM design review; ninja_game/ASSETS.md agrees).
      // Whale local space after centering: y ±0.164, z ±0.525, nose +z.
      const gold = new THREE.MeshStandardMaterial({
        color: THEME.gold,
        metalness: 0.8,
        roughness: 0.3,
        emissive: THEME.goldEmissive,
        emissiveIntensity: 0.35,
      });
      const hat = whaleHatGltf.scene.clone(true);
      hat.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const m = (mesh.material as THREE.MeshStandardMaterial).clone();
        if (m.name === "F44336" || m.name === "FFCC88") {
          m.color?.set(THEME.gold);
          m.emissive?.set(THEME.goldEmissive);
          m.emissiveIntensity = 0.35;
        }
        mesh.material = m;
      });
      // measured whale top surface (clone space): back hump peaks y≈0.164 at
      // z≈-0.1..0.11; head tapers 0.143→0.095 toward the nose at z 0.52.
      // A small hat buried in that hull was invisible at game distance — go
      // BIG on the back hump instead: half the whale's width, unmissable.
      const hbox = new THREE.Box3().setFromObject(hat);
      const hsize = hbox.getSize(new THREE.Vector3());
      const hk = 0.55 / (Math.max(hsize.x, hsize.z) || 1);
      const hcenter = hbox.getCenter(new THREE.Vector3());
      hat.scale.setScalar(hk);
      hat.position.set(-hcenter.x * hk, -hbox.min.y * hk, -hcenter.z * hk);
      const hatSeat = new THREE.Group();
      hatSeat.add(hat);
      hatSeat.position.set(0, 0.15, 0.02); // seated on the back hump
      hatSeat.rotation.x = 0.1; // tipped toward the nose, jauntily
      clone.add(hatSeat);
      // monocle ON the right eye (head half-width ≈0.07 at z 0.4 — the first
      // attempt floated 0.1 off the hull in empty space)
      const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 24), gold);
      monocle.position.set(0.078, 0.055, 0.4);
      monocle.rotation.y = Math.PI / 2;
      clone.add(monocle);
      for (let c = 0; c < 3; c++) {
        const link = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), gold);
        link.position.set(0.085, 0.01 - c * 0.035, 0.37 - c * 0.02);
        clone.add(link);
      }
      clone.name = "whale-boss"; // headless verification finds it by name
      return clone;
    });
  }, [whaleGltf, whaleHatGltf]);

  const enemyRefs = useRef<(THREE.Group | null)[]>([]);
  const arrowRefs = useRef<(THREE.Mesh | null)[]>([]);
  const labelRefs = useRef<(THREE.Sprite | null)[]>([]);
  const labelIds = useRef<(string | null)[]>([null, null, null]);
  const shurikenRefs = useRef<(THREE.Mesh | null)[]>([]);
  const gemRefs = useRef<(THREE.Mesh | null)[]>([]);
  const katanaRefs = useRef<(THREE.Group | null)[]>([]);
  const wakeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const partRefs = useRef<(THREE.Mesh | null)[]>([]);
  const haloRef = useRef<THREE.Mesh | null>(null);
  const haloFillRef = useRef<THREE.Mesh | null>(null);
  const magnetRef = useRef<THREE.Mesh | null>(null);
  const flameRefs = useRef<(THREE.Sprite | null)[]>([]);
  const slashRef = useRef<THREE.Mesh | null>(null);
  const swordRef = useRef<THREE.Group | null>(null);
  const scanRef = useRef<THREE.Mesh | null>(null);
  const reticleRef = useRef<THREE.Mesh | null>(null);
  const coinRefs = useRef<(THREE.Group | null)[]>([]);
  const pulseRefs = useRef<(THREE.Group | null)[]>([]);
  const boomRefs = useRef<(THREE.Group | null)[]>([]);
  const shieldRef = useRef<THREE.Mesh | null>(null);
  const markRefs = useRef<(THREE.Mesh | null)[]>([]);
  const warnRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dmgRefs = useRef<(THREE.Sprite | null)[]>([]);
  const beamRefs = useRef<(THREE.Group | null)[]>([]);

  // The 56 pooled mobs are ~15-20 meshes each — over a thousand objects whose
  // matrices three recomposed EVERY frame (profiled at ~20% of frame time on
  // a throttled CPU) even though only the slot root moves. Freeze the rigid
  // children; the two animated exceptions (scan halo, GasWisp smoke) call
  // updateMatrix() by hand after their writes.
  useEffect(() => {
    for (const g of enemyRefs.current) {
      if (!g) continue;
      g.traverse((o) => {
        if (o === g) return; // the slot root chases the player every frame
        o.updateMatrix();
        o.matrixAutoUpdate = false;
      });
    }
  }, []);

  const spawnEnemy = (type: EnemyTypeId, dir?: THREE.Vector3) => {
    const [lo, hi] = TYPE_RANGES[type];
    let e: Enemy | undefined;
    for (let i = lo; i < hi; i++) {
      if (!world.enemies[i].alive) {
        e = world.enemies[i];
        break;
      }
    }
    if (!e) return;
    const T = ENEMY_TYPES[type];
    const scale = 1 + run.block * 0.1;
    e.alive = true;
    e.type = type;
    e.dir.copy(dir ?? randomDirNear(world.pLocal, 0.9, 1.8));
    e.maxHp = e.hp = T.hp * scale;
    e.speed = T.speed * Math.min(1.6, 1 + run.block * 0.02);
    e.radius = T.radius;
    e.dmg = T.dmg;
    e.xp = T.xp;
    e.gemSplit = T.gemSplit;
    e.t = Math.random() * 10;
    e.biteAt = 0;
    e.recoilUntil = 0;
    e.hitFlashUntil = 0;
    e.markedUntil = 0; // pool slot reuse must not inherit THEO's scan mark
    e.lungeAt =
      type === "boss"
        ? run.t + 4
        : type === "rug"
          ? run.t + 2.5 + Math.random() * 2 // rugs pull on a staggered clock
          : Number.POSITIVE_INFINITY;
    e.windupUntil = 0;
    // spawn impact: a small dust/ember burst at the hatch point
    const impactColor =
      type === "boss" ? HEX.crimson : type === "rug" ? HEX.amber : type === "gremlin" ? HEX.cyanHot : HEX.success;
    spawnBurst(dir ?? world.pLocal, impactColor, type === "boss" ? 10 : 6);
    // boss ladder: THE WHALE first, then your dark mirror — alternating after
    if (type === "boss") e.bossKind = world.bossCount++ % 2 === 0 ? "whale" : "nemesis";
    return e;
  };

  // Jack Levin: the X coin detonates — area damage around the blast point
  const explodeXCoin = (at: THREE.Vector3, dmg: number) => {
    sfx.kill();
    spawnBurst(at, HEX.gold, 6);
    // the detonation is the show: expanding gold shock ring + white core
    const b = world.booms.find((x) => !x.alive) ?? world.booms[0];
    b.alive = true;
    b.dir.copy(at);
    b.t0 = run.t;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (at.angleTo(e.dir) < 0.26) dealDamage(e, dmg);
    }
  };

  const dropGems = (at: THREE.Vector3, xp: number, split: number) => {
    const per = Math.max(1, Math.round(xp / split));
    for (let i = 0; i < split; i++) {
      const g = world.gems.find((x) => !x.alive);
      if (!g) return;
      g.alive = true;
      g.dir.copy(split > 1 ? randomDirNear(at, 0.01, 0.06) : at);
      g.xp = per;
      g.t = 0;
    }
  };

  // ALL damage funnels through here: crit roll, lifesteal, damage tally.
  // Score/lifesteal only count damage that actually landed (no overkill).
  const dealDamage = (e: Enemy, base: number, alwaysCrit = false) => {
    if (e.markedUntil > run.t) base *= 1.5; // THEO scan mark
    const crit = alwaysCrit || Math.random() < critChance();
    const dmg = base * (crit ? 2 : 1);
    const applied = Math.max(0, Math.min(e.hp, dmg));
    e.hp -= dmg;
    const killed = e.hp <= 0;
    e.hitFlashUntil = run.t + (e.type === "boss" ? 0.14 : 0.09);
    if (e.type !== "boss") e.recoilUntil = Math.max(e.recoilUntil, run.t + 0.1);
    run.damage += applied;
    const steal = lifestealPct();
    if (steal > 0 && applied > 0) run.hp = Math.min(run.maxHp, run.hp + applied * steal);
    // damage numbers: crits, boss hits, and killing blows — capped by pool size
    if ((crit || e.type === "boss" || killed) && applied > 0) {
      const d = world.dmgNums.find((x) => !x.alive);
      if (d) {
        d.alive = true;
        d.dir.copy(e.dir);
        d.t0 = run.t;
        d.val = Math.round(dmg);
        d.crit = crit;
        d.kill = killed;
      }
    }
    return dmg;
  };

  const spawnBurst = (at: THREE.Vector3, color: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const p = world.parts.find((x) => !x.alive);
      if (!p) return;
      p.alive = true;
      p.dir.copy(at);
      p.tangent.set(0, 0, 0);
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      p.axis.crossVectors(at, _v2).normalize();
      p.speed = 0.7 + Math.random() * 0.9;
      p.life = 0.45;
      p.color = color;
    }
  };

  const spawnTrail = (at: THREE.Vector3, color: string, tangent: THREE.Vector3) => {
    const p = world.parts.find((x) => !x.alive);
    if (!p) return;
    p.alive = true;
    p.dir.copy(at);
    p.tangent.copy(tangent).normalize();
    p.axis.set(0, 0, 0);
    p.speed = 0.08 + Math.random() * 0.14;
    p.life = 0.22 + Math.random() * 0.16;
    p.color = color;
  };

  const pickSites = (count: number, exclude: string[]) => {
    // never spawn a powerup under the ninja's feet (free instant capture)
    const pool = regions.filter(
      (r) =>
        !exclude.includes(r.id) &&
        !world.captured.has(r.id) &&
        _v.set(...r.dir).angleTo(world.pLocal) > CAPTURE_ANGLE + 0.2,
    );
    const out: string[] = [];
    const rng = run.rng ?? Math.random;
    while (out.length < count && pool.length > 0) {
      const i = Math.floor(rng() * pool.length);
      out.push(pool[i].id);
      pool.splice(i, 1);
    }
    return out;
  };

  const applySitePower = (id: string) => {
    const region = regions.find((r) => r.id === id);
    if (!region) return;
    const rng = run.rng ?? Math.random;
    const count = (run.kindCaptures[region.kind] ?? 0) + 1;
    run.kindCaptures[region.kind] = count;
    // same-kind DR: 0.72^(n-1); dexGate dmg: 8–10.5% × dim (was 0.82 / 9–12%)
    const dim = siteKindDim(count);
    switch (region.kind) {
      case "validatorTower":
        run.perm.speed++;
        run.permAdd.speed += (0.045 + rng() * 0.015) * dim;
        break;
      case "chartBeacon":
        run.perm.rate++;
        run.permAdd.rate += (0.04 + rng() * 0.02) * dim;
        break;
      case "dexGate":
        run.perm.dmg++;
        run.permAdd.dmg += (DEX_GATE_DMG_BASE + rng() * DEX_GATE_DMG_SPREAD) * dim;
        break;
      case "explorerFort":
        run.maxHp += 15;
        run.hp = Math.min(run.maxHp, run.hp + 15);
        // never SHORTEN an active shield (CAPY's cycle shares this slot)
        run.fx.shield = Math.max(run.fx.shield, run.t + 8);
        break;
      case "socialBeacon":
        run.hp = Math.min(run.maxHp, run.hp + 35);
        break;
      case "gameArcade":
        run.perm.xp++;
        run.permAdd.xp += (0.09 + rng() * 0.03) * dim;
        break;
      case "oracleShrine":
        run.perm.magnet++;
        run.permAdd.magnet += (0.06 + rng() * 0.04) * dim;
        for (const g of world.gems) if (g.alive) g.t = -1; // flag: full magnet
        break;
      case "bridgePortal":
        for (const e of world.enemies) {
          if (e.alive && e.dir.angleTo(world.pLocal) < 0.55 && e.type !== "boss") {
            e.hp = 0;
          }
        }
        break;
    }
    // weekly mutator: every site capture also clears the screen like a bridge portal
    if (run.mutator.bridgeSurge && region.kind !== "bridgePortal") {
      for (const e of world.enemies) {
        if (e.alive && e.dir.angleTo(world.pLocal) < 0.55 && e.type !== "boss") {
          e.hp = 0;
        }
      }
    }
  };

  function syncMeshes() {
    // compass arrows — hover on the surface just ahead of the ninja, each
    // pointing along the great circle toward an active (uncaptured) target
    for (let i = 0; i < 3; i++) {
      const m = arrowRefs.current[i];
      if (!m) continue;
      const id = world.siteIds[i];
      const reg = id ? REGION_BY_ID.get(id) : undefined;
      // name banner floats over the target itself (sprites face the camera)
      const label = labelRefs.current[i];
      if (label) {
        if (!reg || world.captured.has(reg.id)) {
          label.visible = false;
        } else {
          label.visible = true;
          label.position.set(reg.dir[0], reg.dir[1], reg.dir[2]).multiplyScalar(R + 0.42);
          if (labelIds.current[i] !== reg.id) {
            labelIds.current[i] = reg.id;
            (label.material as THREE.SpriteMaterial).map = getSiteLabel(reg.name);
            (label.material as THREE.SpriteMaterial).needsUpdate = true;
          }
        }
      }
      if (!reg || world.captured.has(reg.id)) {
        m.visible = false;
        continue;
      }
      _aSite.set(reg.dir[0], reg.dir[1], reg.dir[2]);
      const ang = world.pLocal.angleTo(_aSite);
      _axis.crossVectors(world.pLocal, _aSite);
      if (ang < 0.42 || _axis.lengthSq() < 1e-6) {
        m.visible = false; // target on screen (or antipodal) — no arrow needed
        continue;
      }
      m.visible = true;
      _q.setFromAxisAngle(_axis.normalize(), 0.3);
      _aPos.copy(world.pLocal).applyQuaternion(_q);
      m.position.copy(_aPos).multiplyScalar(R + 0.08);
      m.quaternion.setFromUnitVectors(UP, _aPos);
      const t = tangentToward(_aPos, _aSite, _aT);
      if (t) {
        _f0.set(0, 0, 1).applyQuaternion(m.quaternion);
        _f0.addScaledVector(_aPos, -_aPos.dot(_f0)).normalize();
        const yaw = Math.atan2(_v.crossVectors(_f0, t).dot(_aPos), _f0.dot(t));
        m.rotateY(yaw);
      }
      m.rotateX(Math.PI / 2);
      // smaller, quieter arrows — they were reading as giant glowing obstacles
      const flashId = useGame.getState().flashSiteId;
      const flashing = flashId === id;
      const accent = flashing ? HEX.gold : reg.accent;
      const pulse = flashing ? 2.0 : 1.0;
      m.scale.setScalar((flashing ? 1.12 : 0.74) + Math.sin(run.t * 5 + i * 2.1) * 0.08);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.set(accent);
      mat.emissive.set(accent);
      mat.emissiveIntensity = pulse + Math.sin(run.t * 5 + i * 2.1) * 0.35;
      const shaft = m.children[0] as THREE.Mesh | undefined;
      if (shaft) {
        const sm = shaft.material as THREE.MeshStandardMaterial;
        sm.color.set(accent);
        sm.emissive.set(accent);
        sm.emissiveIntensity = (flashing ? 1.4 : 0.7) + Math.sin(run.t * 5 + i * 2.1) * 0.25;
      }
    }
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const grp = enemyRefs.current[i];
      const e = world.enemies[i];
      if (!grp) continue;
      grp.visible = e.alive;
      if (e.alive) {
        // everything floats: heads bob, the whale swims
        const whaleBoss = e.type === "boss" && e.bossKind === "whale";
        const hover = whaleBoss
          ? 0.12 + Math.sin(e.t * 1.6) * 0.03
          : e.type === "boss"
            ? 0.01 + Math.sin(e.t * 2.5) * 0.015
            : 0.11 + Math.sin(e.t * 4) * 0.03;
        grp.position.copy(e.dir).multiplyScalar(R + hover);
        grp.quaternion.setFromUnitVectors(UP, e.dir);
        // face the ninja (yaw around the local up axis)
        const t = tangentToward(e.dir, world.pLocal, _t);
        if (t) {
          _f0.set(0, 0, 1).applyQuaternion(grp.quaternion);
          _f0.addScaledVector(e.dir, -e.dir.dot(_f0)).normalize();
          const yaw = Math.atan2(_axis.crossVectors(_f0, t).dot(e.dir), _f0.dot(t));
          grp.rotateY(yaw);
        }
        // per-type body language
        if (e.type === "boss") {
          grp.children[0].visible = e.bossKind === "whale";
          grp.children[1].visible = e.bossKind === "nemesis";
          if (whaleBoss) {
            grp.rotateZ(Math.sin(e.t * 1.6) * 0.14); // vast swim roll
            grp.rotateX(Math.sin(e.t * 1.1) * 0.1);
          } else {
            grp.rotateX(Math.sin(e.t * 2) * 0.06); // slow menace
          }
        } else {
          grp.rotateX(Math.sin(e.t * 6) * 0.14); // chatter
          // the rug PULL: rear up like a cobra during the windup — the
          // dodgeable tell — then nose-down as it snaps forward
          if (e.type === "rug") {
            if (run.t < e.windupUntil) grp.rotateX(-0.55);
            else if (run.t < e.windupUntil + 0.45) grp.rotateX(0.3);
          }
        }
        // windup shake: boss coils before its charge, the rug quivers mid-rear
        const windup = (e.type === "boss" || e.type === "rug") && run.t < e.windupUntil;
        const wob = 1 + Math.sin(e.t * 9) * 0.04;
        const shake = windup ? 1 + Math.sin(run.t * 30) * 0.07 : 1;
        const recoil = e.type !== "boss" && e.recoilUntil > run.t ? 0.82 : 1;
        grp.scale.set(shake * recoil, wob * (windup ? 1.1 : 1) * recoil, shake * recoil);
        // hit flash: brief white/amber emissive pop across the whole body
        const flashing = e.hitFlashUntil > run.t;
        if (flashing || grp.userData.hitState) {
          grp.userData.hitState = flashing;
          const flashColor = e.type === "boss" ? THEME.bossFlash : THEME.white;
          grp.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
            if (!mat || !mat.emissive) return;
            if (!mesh.userData.hitBase) {
              mesh.userData.hitBase = { emissive: mat.emissive.clone(), intensity: mat.emissiveIntensity };
            }
            if (flashing) {
              mat.emissive.set(flashColor);
              mat.emissiveIntensity = e.type === "boss" ? 3.2 : 4;
            } else {
              mat.emissive.copy(mesh.userData.hitBase.emissive);
              mat.emissiveIntensity = mesh.userData.hitBase.intensity;
            }
          });
        }
        // THEO's scan mark — the ground ring breathes via opacity only
        // (its transform is baked by the pool freeze; no matrix writes)
        const halo = markRefs.current[i];
        if (halo) {
          const marked = e.markedUntil > run.t;
          halo.visible = marked;
          if (marked) {
            (halo.material as THREE.MeshBasicMaterial).opacity =
              0.55 + Math.sin(run.t * 6 + i) * 0.2;
          }
        }
      }
    }
    for (let i = 0; i < MAX_SHURIKENS; i++) {
      const mesh = shurikenRefs.current[i];
      const coin = coinRefs.current[i];
      const s = world.shurikens[i];
      if (!mesh) continue;
      const isCoin = s.alive && s.kind === "xcoin";
      // xcoin renders from its own pool: black disc + spinning white X
      if (coin) {
        coin.visible = isCoin;
        if (isCoin) {
          coin.position.copy(s.pos).multiplyScalar(R + 0.07);
          coin.quaternion.setFromUnitVectors(UP, s.pos);
          coin.rotateX(Math.PI / 2); // stand the disc upright
          coin.rotateZ(s.spin * 0.6); // arcade spin around the vertical
          coin.scale.setScalar(s.evo ? 1.45 : 1);
        }
      }
      // THEO's pulses are cyan data-diamonds from their own pool
      const isPulse = s.alive && s.kind === "pulse";
      const packet = pulseRefs.current[i];
      if (packet) {
        packet.visible = isPulse;
        if (isPulse) {
          packet.position.copy(s.pos).multiplyScalar(R + 0.07);
          // orient +X along the travel direction so the ray streak trails
          // behind (velocity = axis × pos for the great-circle motion)
          _v2.crossVectors(s.axis, s.pos).normalize();
          _axis.crossVectors(s.pos, _v2).normalize();
          _m4.makeBasis(_v2, _f0.copy(s.pos), _axis);
          packet.quaternion.setFromRotationMatrix(_m4);
          // energy flicker on the bolt — subtler than the old diamond throb
          packet.scale.setScalar((s.evo ? 1.5 : 1) * (1 + Math.sin(run.t * 16 + i) * 0.1));
        }
      }
      mesh.visible = s.alive && !isCoin && !isPulse;
      if (mesh.visible) {
        mesh.position.copy(s.pos).multiplyScalar(R + 0.07);
        mesh.quaternion.setFromUnitVectors(UP, s.pos);
        mesh.rotateY(s.spin);
        mesh.scale.setScalar(s.evo ? 1.7 : 1);
      }
    }
    // ---- character signature FX: slash sweep, scan ring, lock-on reticle ----
    {
      const wkind = charDef().weapon.kind;
      const slash = slashRef.current;
      const sword = swordRef.current;
      {
        const age = run.t - world.slashFxAt;
        const show = world.started && wkind === "slash" && age >= 0 && age < 0.24;
        const k = age / 0.24;
        const reach = 0.34 * (1 + 0.3 * (run.upgrades.multishot ?? 0));
        if (slash) {
          slash.visible = show;
          if (show) {
            slash.position.copy(world.pLocal).multiplyScalar(R + 0.035);
            // basis: arc centered on the slash direction, flat on the surface
            _axis.crossVectors(world.pLocal, world.slashDir).normalize();
            _m4.makeBasis(_v.copy(world.slashDir), _axis, _f0.copy(world.pLocal));
            slash.quaternion.setFromRotationMatrix(_m4);
            slash.scale.setScalar(R * Math.sin(reach) * (0.55 + 0.45 * k));
            (slash.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
          }
        }
        // the blade itself sweeps across the arc (full circle on Validator Sweep)
        if (sword) {
          sword.visible = show;
          if (show) {
            sword.position.copy(world.pLocal).multiplyScalar(R + 0.07);
            _axis.crossVectors(world.pLocal, world.slashDir).normalize();
            _m4.makeBasis(_v.copy(world.slashDir), _axis, _f0.copy(world.pLocal));
            sword.quaternion.setFromRotationMatrix(_m4);
            const sweep = world.slashFull
              ? -Math.PI + Math.PI * 2 * k
              : -1.15 + 2.3 * k;
            sword.rotateZ(sweep);
            sword.scale.setScalar((R * Math.sin(reach)) / 0.63);
          }
        }
      }
      const scan = scanRef.current;
      if (scan) {
        const age = run.t - world.scanFxAt;
        const show = world.started && age >= 0 && age < 0.6;
        scan.visible = show;
        if (show) {
          const k = age / 0.6;
          scan.position.copy(world.pLocal).multiplyScalar(R + 0.03);
          scan.quaternion.setFromUnitVectors(UP, world.pLocal);
          scan.rotateX(Math.PI / 2);
          scan.scale.setScalar(Math.max(0.02, R * Math.sin(1.2 * k)));
          (scan.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
        }
      }
      const ret = reticleRef.current;
      if (ret) {
        let target: Enemy | null = null;
        if (world.started && wkind === "pulse") {
          let bestScore = -Infinity;
          for (const e of world.enemies) {
            if (!e.alive) continue;
            const ang = e.dir.angleTo(world.pLocal);
            if (ang > 1.4) continue;
            const t2 = tangentToward(world.pLocal, e.dir, _v2);
            if (!t2) continue;
            const facingDot = world.facingLocal.lengthSq() > 0.5 ? t2.dot(world.facingLocal) : 1;
            const score = facingDot * 2 - ang;
            if (score > bestScore) {
              bestScore = score;
              target = e;
            }
          }
        }
        ret.visible = !!target;
        if (target) {
          ret.position.copy(target.dir).multiplyScalar(R + 0.02);
          ret.quaternion.setFromUnitVectors(UP, target.dir);
          ret.rotateY(run.t * 2.5);
          ret.rotateX(Math.PI / 2);
          ret.rotateZ(Math.PI / 4);
          ret.scale.setScalar((target.radius + 0.05) * 1.6);
        }
      }
      // Validator Shield / fort shield — the immune window is a visible hex
      // barrier for ANY character (green = protection in the color bible), not
      // just CAPY: capturing a fort shields Jack/THEO/Ninja too
      const shield = shieldRef.current;
      if (shield) {
        const active = world.started && run.t < run.fx.shield;
        shield.visible = active;
        if (active) {
          shield.position.copy(world.pLocal).multiplyScalar(R + 0.05);
          shield.quaternion.setFromUnitVectors(UP, world.pLocal);
          shield.rotateX(Math.PI / 2);
          shield.rotateZ(run.t * 1.4);
          shield.scale.setScalar(R * Math.sin(0.17) * (1 + Math.sin(run.t * 6) * 0.05));
          (shield.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(run.t * 6) * 0.12;
        }
      }
      // spawn warnings — red rings tighten where an enemy is about to hatch
      for (let i = 0; i < world.pending.length; i++) {
        const w = warnRefs.current[i];
        const p = world.pending[i];
        if (!w) continue;
        w.visible = p.active && world.started;
        if (w.visible) {
          const remain = Math.max(0, p.at - run.t);
          const k = 1 - remain / 0.7; // 0 → 1 as it hatches
          const late = remain < 0.2;
          w.position.copy(p.dir).multiplyScalar(R + 0.02);
          w.quaternion.setFromUnitVectors(UP, p.dir);
          w.rotateX(Math.PI / 2);
          const base = 0.28 - 0.18 * k;
          const pop = late ? 1 + Math.sin(k * Math.PI) * 0.28 : 1;
          w.scale.setScalar(base * pop);
          const mat = w.material as THREE.MeshBasicMaterial;
          mat.color.set(late ? THEME.warnLate : THEME.warnEarly);
          mat.opacity = 0.35 + 0.45 * k + Math.sin(run.t * 8) * 0.08;
        }
      }
      // floating damage numbers (crits + bosses only)
      for (let i = 0; i < world.dmgNums.length; i++) {
        const spr = dmgRefs.current[i];
        const d = world.dmgNums[i];
        if (!spr) continue;
        const age = run.t - d.t0;
        if (d.alive && age >= 0.7) d.alive = false;
        spr.visible = d.alive && world.started;
        if (spr.visible) {
          const k = age / 0.7;
          spr.position.copy(d.dir).multiplyScalar(R + 0.3 + k * 0.22);
          const mat = spr.material as THREE.SpriteMaterial;
          const key = `${d.val}|${d.crit}|${d.kill}`;
          if (spr.userData.k !== key) {
            spr.userData.k = key;
            mat.map = getDmgTexture(String(d.val), d.crit, d.kill);
            mat.needsUpdate = true;
          }
          mat.opacity = 1 - k * k;
          const s = d.crit ? 0.46 : d.kill ? 0.4 : 0.32;
          const pop = 1 + 0.3 * (1 - k) * (d.crit || d.kill ? 1 : 0.5);
          spr.scale.set(s * pop, (s / 2) * pop, 1);
        }
      }
      // capture celebration — gold beam + pulse from the claimed site
      for (let i = 0; i < world.captureFx.length; i++) {
        const g = beamRefs.current[i];
        const cfx = world.captureFx[i];
        if (!g) continue;
        const age = run.t - cfx.t0;
        if (cfx.active && age >= 1.3) cfx.active = false;
        g.visible = cfx.active && world.started;
        if (g.visible) {
          const k = age / 1.3;
          g.position.copy(cfx.dir).multiplyScalar(R);
          g.quaternion.setFromUnitVectors(UP, cfx.dir);
          const beam = g.children[0] as THREE.Mesh;
          const ringFx = g.children[1] as THREE.Mesh;
          const ring2 = g.children[2] as THREE.Mesh;
          const core = g.children[3] as THREE.Mesh;
          const outer = g.children[4] as THREE.Mesh;
          // the pillar ERUPTS (fast ease-out rise) then burns off
          const rise = 1 - Math.pow(1 - Math.min(1, k * 2.4), 3);
          beam.scale.set(1 - k * 0.5, 0.25 + rise * 1.5, 1 - k * 0.5);
          (beam.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k * k);
          outer.scale.set(1 - k * 0.3, 0.25 + rise * 1.5, 1 - k * 0.3);
          (outer.material as THREE.MeshBasicMaterial).opacity = 0.26 * (1 - k * k);
          // white-hot core POPS in the first quarter, gone by half
          const kc = Math.min(1, k * 4);
          core.visible = k < 0.5;
          core.scale.setScalar(Math.max(0.001, 0.05 + 0.17 * (1 - Math.pow(1 - kc, 3))));
          (core.material as THREE.MeshBasicMaterial).opacity = 0.9 * Math.max(0, 1 - k * 2.2);
          // gold shockwave first, cyan echo chasing it
          const k1 = Math.min(1, k * 1.7);
          ringFx.scale.setScalar(Math.max(0.02, 0.6 * (1 - Math.pow(1 - k1, 2))));
          (ringFx.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k1);
          const k2 = Math.max(0, Math.min(1, (k - 0.28) / 0.72));
          ring2.visible = k2 > 0;
          ring2.scale.setScalar(Math.max(0.02, 0.75 * (1 - Math.pow(1 - k2, 2))));
          (ring2.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k2);
        }
      }
      // XEN detonations — the blast is the show, not the coin
      for (let i = 0; i < world.booms.length; i++) {
        const g = boomRefs.current[i];
        const b = world.booms[i];
        if (!g) continue;
        const age = run.t - b.t0;
        if (b.alive && age >= 0.4) b.alive = false;
        const show = b.alive && world.started;
        g.visible = show;
        if (show) {
          const k = age / 0.4;
          g.position.copy(b.dir).multiplyScalar(R + 0.04);
          g.quaternion.setFromUnitVectors(UP, b.dir);
          g.rotateX(Math.PI / 2);
          const ring = g.children[0] as THREE.Mesh;
          const core = g.children[1] as THREE.Mesh;
          ring.scale.setScalar(Math.max(0.02, R * Math.sin(0.26) * k));
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
          core.scale.setScalar(Math.max(0.001, 0.09 * (1 - k)));
          (core.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k * k);
        }
      }
    }
    for (let i = 0; i < MAX_GEMS; i++) {
      const mesh = gemRefs.current[i];
      const gm = world.gems[i];
      if (!mesh) continue;
      mesh.visible = gm.alive;
      if (gm.alive) {
        // hover just above the surface with a gentle bob (gm.t is the magnet
        // flag — animate off the run clock instead)
        const bob = 0.045 + Math.sin(run.t * 3 + i) * 0.012;
        mesh.position.copy(gm.dir).multiplyScalar(R + bob);
        // stand the coin upright on the surface (disc plane vertical)…
        mesh.quaternion.setFromUnitVectors(UP, gm.dir);
        mesh.rotateX(Math.PI / 2);
        // …and give it the classic arcade spin around its vertical axis
        mesh.rotateZ(run.t * 4 + i);
      }
    }
    for (let i = 0; i < MAX_WAKE; i++) {
      const mesh = wakeRefs.current[i];
      const w = world.wake[i];
      if (!mesh) continue;
      mesh.visible = w.alive;
      if (w.alive) {
        mesh.position.copy(w.dir).multiplyScalar(R + 0.015);
        mesh.quaternion.setFromUnitVectors(UP, w.dir);
        mesh.rotateX(-Math.PI / 2);
        const m = mesh.material as THREE.MeshBasicMaterial;
        m.color.set(w.kind === "cyan" ? HEX.cyan : HEX.coin);
        m.opacity = (w.kind === "cyan" ? 0.35 : 0.45) * (w.life / 1.1);
        const sc = 0.7 + 0.5 * (1 - w.life / 1.1);
        mesh.scale.setScalar(w.kind === "cyan" ? sc * 1.15 : sc);
      }
    }
    for (let i = 0; i < MAX_PARTS; i++) {
      const mesh = partRefs.current[i];
      const p = world.parts[i];
      if (!mesh) continue;
      mesh.visible = p.alive;
      if (p.alive) {
        mesh.position.copy(p.dir).multiplyScalar(R + 0.08);
        const m = mesh.material as THREE.MeshBasicMaterial;
        m.color.set(p.color);
        const lifeRatio = Math.max(0, Math.min(1, p.life / 0.45));
        m.opacity = Math.min(1, lifeRatio * 2.2);
        // trail particles stretch along their projectile path; sparks stay uniform
        if (p.tangent.lengthSq() > 0.001) {
          _v2.copy(p.tangent).normalize();
          _axis.crossVectors(p.dir, _v2).normalize();
          _m4.makeBasis(_v2, _axis, p.dir);
          mesh.quaternion.setFromRotationMatrix(_m4);
          const thickness = 0.018 * Math.sin(lifeRatio * Math.PI);
          const length = 0.09 * Math.sin(lifeRatio * Math.PI);
          mesh.scale.set(length, thickness, thickness);
        } else {
          mesh.quaternion.set(0, 0, 0, 1);
          // puff up in the middle of the spark's life, then shrink to nothing
          mesh.scale.setScalar(0.048 * Math.sin(lifeRatio * Math.PI));
        }
      }
    }
    // Ion Halo: molten filled disc + bright rim, hugging the surface
    const haloMesh = haloRef.current;
    const haloFill = haloFillRef.current;
    {
      const h = haloAngle();
      const show = h > 0 && world.started;
      const pulse = 1 + Math.sin(run.t * 5) * 0.04;
      if (haloMesh) {
        haloMesh.visible = show;
        if (show) {
          haloMesh.position.copy(world.pLocal).multiplyScalar(R + 0.025);
          haloMesh.quaternion.setFromUnitVectors(UP, world.pLocal);
          haloMesh.rotateX(Math.PI / 2);
          haloMesh.scale.setScalar(R * Math.sin(h) * pulse);
          (haloMesh.material as THREE.MeshBasicMaterial).opacity = run.upgrades.meltdown
            ? 0.55
            : 0.35;
        }
      }
      if (haloFill) {
        haloFill.visible = show;
        if (show) {
          haloFill.position.copy(world.pLocal).multiplyScalar(R + 0.018);
          haloFill.quaternion.setFromUnitVectors(UP, world.pLocal);
          haloFill.rotateX(-Math.PI / 2);
          haloFill.scale.setScalar(R * Math.sin(h) * pulse);
          (haloFill.material as THREE.MeshBasicMaterial).opacity =
            (run.upgrades.meltdown ? 0.22 : 0.13) + Math.sin(run.t * 5) * 0.04;
        }
      }
    }
    // Ion Halo flames: rise off the ring, shrink, cool from white-hot to red
    for (let i = 0; i < MAX_FLAMES; i++) {
      const mesh = flameRefs.current[i];
      const f = world.flames[i];
      if (!mesh) continue;
      mesh.visible = f.alive;
      if (f.alive) {
        const age = 1 - f.life / f.maxLife; // 0 → 1
        const m = mesh.material as THREE.SpriteMaterial;
        if (f.smoke) {
          // minimalist smoke: faint dark puff drifting up above the flames
          mesh.position.copy(f.dir).multiplyScalar(R + 0.06 + age * 0.16);
          const sc = 0.04 + age * 0.07;
          mesh.scale.set(sc, sc, 1);
          m.blending = THREE.NormalBlending;
          m.color.set(THEME.smoke);
          m.opacity = 0.18 * (1 - age);
          m.rotation = run.t * 0.5 + i;
        } else {
          mesh.position.copy(f.dir).multiplyScalar(R + 0.02 + age * 0.09);
          const w = 0.045 * (1 - age * 0.7);
          const h = 0.09 * (1 - age * 0.7);
          mesh.scale.set(w, h, 1);
          m.blending = THREE.AdditiveBlending;
          if (age < 0.5) _col.lerpColors(FLAME_A, FLAME_B, age * 2);
          else _col.lerpColors(FLAME_B, FLAME_C, (age - 0.5) * 2);
          m.color.copy(_col);
          m.opacity = 0.85 * (1 - age * age);
          m.rotation = run.t * (2 + i * 0.15) + i;
        }
      }
    }
    // Coin Magnet: shimmering cyan ring at the exact pickup radius
    const magnetMesh = magnetRef.current;
    if (magnetMesh) {
      const show = world.started;
      magnetMesh.visible = show;
      if (show) {
        magnetMesh.position.copy(world.pLocal).multiplyScalar(R + 0.012);
        magnetMesh.quaternion.setFromUnitVectors(UP, world.pLocal);
        magnetMesh.rotateX(Math.PI / 2);
        magnetMesh.rotateZ(run.t * 0.8); // slow shimmer spin
        magnetMesh.scale.setScalar(R * Math.sin(magnetAngle()));
        (magnetMesh.material as THREE.MeshBasicMaterial).opacity =
          0.14 + ((run.upgrades.magnet ?? 0) > 0 ? 0.1 : 0) + Math.sin(run.t * 2.5) * 0.05;
      }
    }
    // arc lightning flash — midpoint-displaced jag swept as core + glow tubes
    if (world.arcDirty) {
      world.arcDirty = false;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < world.arcPoints.length - 1; i++) {
        const a = world.arcPoints[i];
        const b = world.arcPoints[i + 1];
        pts.push(a);
        const len = a.distanceTo(b);
        for (let s = 1; s < 3; s++) {
          const p = a.clone().lerp(b, s / 3);
          p.x += (Math.random() - 0.5) * len * 0.28;
          p.y += (Math.random() - 0.5) * len * 0.28;
          p.z += (Math.random() - 0.5) * len * 0.28;
          p.setLength(Math.max(p.length(), R + 0.06)); // stay off the surface
          pts.push(p);
        }
      }
      pts.push(world.arcPoints[world.arcPoints.length - 1]);
      if (pts.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pts);
        // Chain Reaction is the evolved tier — visibly thicker bolt
        const w = run.upgrades.chainreaction ? 1.7 : 1;
        ARC_CORE.geometry.dispose();
        ARC_GLOW.geometry.dispose();
        ARC_CORE.geometry = new THREE.TubeGeometry(curve, pts.length * 4, 0.014 * w, 5, false);
        ARC_GLOW.geometry = new THREE.TubeGeometry(curve, pts.length * 4, 0.038 * w, 5, false);
      }
    }
    const arcOn = world.started && run.t < world.arcFlash;
    ARC_CORE.visible = ARC_GLOW.visible = arcOn;
    if (arcOn) {
      const fade = Math.min(1, (world.arcFlash - run.t) / 0.12);
      ARC_MAT_CORE.opacity = fade;
      ARC_MAT_GLOW.opacity = 0.45 * fade;
    }
  }

  useFrame((state, rawDt) => {
    const g = planet.current;
    if (!g) return;
    const store = useGame.getState();

    // reset pools when a fresh run starts
    if (store.mode === "play" && !world.started) {
      world.started = true;
      for (const e of world.enemies) e.alive = false;
      for (const s of world.shurikens) s.alive = false;
      for (const gm of world.gems) gm.alive = false;
      world.fireAt = 0;
      world.spawnAt = 0;
      world.knockAt = 0;
      world.novaAt = 0;
      world.wakeAt = 0;
      world.whaleWakeAt = 0;
      world.arcAt = 0;
      world.arcFlash = 0;
      world.arcDirty = false;
      world.flameAt = 0;
      for (const f of world.flames) f.alive = false;
      for (const w of world.wake) w.alive = false;
      for (const p of world.parts) p.alive = false;
      world.bossAtBlock = 0;
      world.bossCount = 0;
      world.scanAt = 0;
      world.capyShieldAt = 0;
      world.slashFxAt = -10;
      world.slashFull = false;
      world.scanFxAt = -10;
      for (const b of world.booms) b.alive = false;
      for (const p of world.pending) p.active = false;
      for (const d of world.dmgNums) d.alive = false;
      for (const cf of world.captureFx) cf.active = false;
      world.finalWanted = false;
      world.finalSpawned = false;
      world.finalIdx = -1;
      world.captured.clear();
      world.siteIds = pickSites(ACTIVE_SITES, []);
      store.setActiveSites(world.siteIds);
    }
    if (
      store.mode === "explore" ||
      store.mode === "menu" ||
      store.mode === "dead" ||
      store.mode === "won" ||
      store.mode === "timeup"
    ) {
      if (world.started) {
        world.started = false;
        for (const e of world.enemies) e.alive = false;
        for (const s of world.shurikens) s.alive = false;
        for (const gm of world.gems) gm.alive = false;
        // stale run targets bled into explore: arrows/banners/halos key off
        // siteIds + captured, so clear them BEFORE the final sync
        world.siteIds = [];
        world.captured.clear();
        syncMeshes();
      }
      return;
    }
    if (store.mode !== "play") {
      // freeze any queued knockback so it doesn't lurch on resume
      moveState.pushVX = 0;
      moveState.pushVZ = 0;
      syncMeshes(); // levelup: frozen but visible
      return;
    }

    const captureSlow = run.t < run.captureSlowUntil ? 0.2 : 1;
    const dt = Math.min(rawDt, 0.05) * captureSlow;
    run.t += dt;
    run.speedMult = currentSpeedMult();
    const D = DIFFICULTIES[run.difficulty];
    const newBlock = Math.floor(run.t / D.blockSeconds);
    if (newBlock !== run.block) run.block = newBlock;

    // player's position & facing in planet-local space
    _qInv.copy(g.quaternion).invert();
    world.pLocal.copy(UP).applyQuaternion(_qInv).normalize();
    if (moveState.speed > 0.1) {
      world.facingWorld.set(moveState.vx, 0, moveState.vz).normalize();
    }
    world.facingLocal.copy(world.facingWorld).applyQuaternion(_qInv);
    const f = tangentToward(world.pLocal, _v.copy(world.pLocal).add(world.facingLocal), world.facingLocal)
      ? world.facingLocal
      : world.facingLocal; // tangentized below anyway
    f.addScaledVector(world.pLocal, -world.pLocal.dot(f));
    if (f.lengthSq() > 1e-8) f.normalize();

    // ---- spawner ----
    const interval = Math.max(0.25, (1.25 * Math.pow(0.9, run.block)) / D.enemyMult);
    if (run.t >= world.spawnAt) {
      world.spawnAt = run.t + interval;
      const burstWant = 1 + Math.floor(run.block / 3);
      let pendingFree = 0;
      for (const slot of world.pending) if (!slot.active) pendingFree++;
      // never flood all 40 telegraph slots in one tick — late-game bursts
      // stay warned instead of falling through to silent instant spawns
      const n = Math.min(burstWant, pendingFree, 10);
      for (let i = 0; i < n; i++) {
        // weighted pick
        const entries = (Object.keys(ENEMY_TYPES) as EnemyTypeId[])
          .map((id) => ({ id, w: ENEMY_TYPES[id].weight(run.block) }))
          .filter((x) => x.w > 0);
        const total = entries.reduce((s, x) => s + x.w, 0);
        let r = Math.random() * total;
        let type: EnemyTypeId = "goblin";
        for (const x of entries) {
          r -= x.w;
          if (r <= 0) {
            type = x.id;
            break;
          }
        }
        // telegraph the spawn: a red warning ring pulses for 0.7s first.
        // If all 40 pending slots are busy the field is already saturated —
        // defer the rest of this burst (they hatch next tick as rings clear)
        // rather than spawning an untelegraphed enemy.
        const p = world.pending.find((x) => !x.active);
        if (!p) break;
        p.active = true;
        p.type = type;
        p.dir.copy(randomDirNear(world.pLocal, 0.9, 1.8));
        p.at = run.t + 0.7;
        sfx.telegraph();
      }
    }
    // telegraphed spawns hatch — keep the telegraph alive until a pool slot
    // frees (mirrors the boss retry); never clear a ring with no payoff
    for (const p of world.pending) {
      if (p.active && run.t >= p.at) {
        if (spawnEnemy(p.type, p.dir)) p.active = false;
      }
    }
    // Bear Market boss every 5 blocks — if the pool is full (e.g. the final
    // Nemesis is hogging a slot), retry next frame instead of skipping forever
    if (run.block > 0 && run.block % 5 === 0 && world.bossAtBlock !== run.block) {
      const boss = spawnEnemy("boss");
      if (boss) {
        world.bossAtBlock = run.block;
        sfx.boss();
        useGame.setState({
          bossCard: boss.bossKind === "whale" ? "THE WHALE SURFACES" : "YOUR SHADOW ARRIVES",
          bossCardAt: run.t,
        });
      }
    }
    // THE FINAL NEMESIS must always appear — retry until a boss slot frees.
    // Victory is gated on world.finalSpawned, so a full pool at the last
    // capture can never let the run end without the finale (COMBAT-01 bypass).
    if (world.finalWanted && !world.finalSpawned) {
      const fb = spawnEnemy("boss");
      if (fb) {
        fb.bossKind = "nemesis";
        // Scale the finale to the player's POWER (lib/finale.ts), not a flat
        // 2.5×. Damage/speed are only lightly bumped so the fight threatens
        // without being a random-death tax. Nameplate telegraph only
        // (COMBAT-01) — never routed through world.pending.
        const power = finalePower({
          level: run.level,
          permDmg: run.permAdd.dmg,
          damageUpgrades: run.upgrades.damage ?? 0,
          multishotUpgrades: run.upgrades.multishot ?? 0,
          firerateUpgrades: run.upgrades.firerate ?? 0,
          enemyMult: DIFFICULTIES[run.difficulty].enemyMult,
        });
        fb.maxHp = fb.hp = Math.round(fb.maxHp * finaleHpMult(power));
        fb.dmg = Math.round(fb.dmg * finaleDmgMult(power));
        fb.speed *= finaleSpeedMult(power);
        world.finalIdx = world.enemies.indexOf(fb);
        world.finalSpawned = true;
        run.finalBossAlive = true;
        useGame.setState({ bossCard: "THE FINAL NEMESIS AWAKENS", bossCardAt: run.t });
        sfx.boss();
      }
    }

    // regeneration (Uptime) ticks continuously
    if (regenRate() > 0) run.hp = Math.min(run.maxHp, run.hp + regenRate() * dt);

    // ---- enemies: chase + separation + contact damage ----
    const shielded = run.t < run.fx.shield;
    const halo = haloAngle();
    const meltdown = !!run.upgrades.meltdown;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      const lunge = e.type === "gremlin" ? 1 + 0.6 * Math.sin(e.t * 5) : 1;
      const inHalo = halo > 0 && e.dir.angleTo(world.pLocal) < halo + e.radius / R;
      // Core Meltdown: the halo is a tar pit
      const slow = inHalo && meltdown ? 0.45 : 1;
      // telegraphed charges: bosses rear back 0.8s (red flare) then CHARGE;
      // rugs do a quick 0.35s rear-up then a short snap-forward — the pull.
      // Net rug pressure is a touch higher than a flat walk, but now it
      // arrives in dodgeable bursts instead of a glue-to-you glide.
      let bossMult = 1;
      if (e.type === "boss" || e.type === "rug") {
        const rug = e.type === "rug";
        if (run.t >= e.lungeAt) {
          e.windupUntil = run.t + (rug ? 0.35 : 0.8);
          e.lungeAt = run.t + (rug ? 4.5 : 6.5) + Math.random() * 2;
          if (!rug) spawnBurst(e.dir, HEX.crimson, 6);
        }
        if (run.t < e.windupUntil) bossMult = rug ? 0.05 : 0.12;
        else if (run.t < e.windupUntil + (rug ? 0.45 : 1.1)) bossMult = rug ? 3.2 : 2.5;
      }
      // after biting, an enemy backs off briefly instead of gluing to you
      const recoiling = run.t < e.recoilUntil;
      if (recoiling) {
        rotateToward(e.dir, world.pLocal, -e.speed * 0.7 * dt);
      } else {
        rotateToward(e.dir, world.pLocal, e.speed * lunge * slow * bossMult * dt);
      }
      // Ion Halo burns everything inside — tuned to weaken, not erase, the horde
      if (inHalo) dealDamage(e, (5 + 2 * (run.upgrades.halo ?? 0)) * dt);
      const contact = (CONTACT_BASE * R + e.radius) / R;
      if (e.dir.angleTo(world.pLocal) < contact) {
        moveState.contactSlow = true;
        // discrete BITE with a cooldown — you can graze the horde and escape.
        // Global 0.4s i-frame after ANY bite: a fresh wave landing at once
        // can't dump a dozen bites in a single frame (fairness, not mercy).
        if (!shielded && run.t >= e.biteAt && run.t - run.lastHitAt >= 0.4) {
          e.biteAt = run.t + 1.0;
          e.recoilUntil = run.t + 0.45;
          run.hp -= e.dmg * 0.8 * armorMult(); // one chunk, not a melt
          run.lastHitAt = run.t;
          run.killedBy = e.type === "boss" ? "boss:" + e.bossKind : e.type;
          sfx.bite();
          // knockback: shove the ninja away from the enemy (world-space tangent)
          if (run.t >= world.knockAt) {
            world.knockAt = run.t + 0.3;
            const t = tangentToward(world.pLocal, e.dir, _t);
            if (t) {
              // push direction = away from the enemy, converted to world space
              _v.copy(t).multiplyScalar(-1).applyQuaternion(g.quaternion);
              const MAG = 0.35;
              moveState.pushVX += -_v.z * MAG; // ω_x moves the ninja along -Z
              moveState.pushVZ += _v.x * MAG; // ω_z moves the ninja along +X
            }
          }
        }
      }
    }
    // separation (cheap O(n²) — pools are small)
    for (let i = 0; i < world.enemies.length; i++) {
      const a = world.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < world.enemies.length; j++) {
        const b = world.enemies[j];
        if (!b.alive) continue;
        const minAng = (a.radius + b.radius) / R;
        if (a.dir.angleTo(b.dir) < minAng) {
          _axis.crossVectors(b.dir, a.dir);
          if (_axis.lengthSq() > 1e-10) {
            _axis.normalize();
            a.dir.applyQuaternion(_q.setFromAxisAngle(_axis, 0.5 * dt));
            b.dir.applyQuaternion(_q.setFromAxisAngle(_axis, -0.5 * dt));
          }
        }
      }
    }

    // ---- shurikens: auto-fire with aim assist ----
    const weaponKind = charDef().weapon.kind;
    if (run.t >= world.fireAt) {
      world.fireAt = run.t + fireCooldown();
      // aim: nearest enemy in frontal cone, else facing
      const aim = f.lengthSq() > 0.5 ? _v.copy(f) : _v.set(1, 0, 0);
      let bestScore = -1;
      for (const e of world.enemies) {
        if (!e.alive) continue;
        const ang = e.dir.angleTo(world.pLocal);
        if (ang > 1.4) continue;
        const t = tangentToward(world.pLocal, e.dir, _v2);
        if (!t) continue;
        const facingDot = f.lengthSq() > 0.5 ? t.dot(f) : 1;
        // aim assist stays FRONTAL: ±53° on the move (so the multishot fan
        // never launches stars behind the shoulder), a bit wider when
        // standing still. THEO's pulses lock on anywhere — that's his kit.
        const coneMin = moveState.speed > 0.15 ? 0.6 : 0.2;
        if (facingDot < coneMin && weaponKind !== "pulse") continue;
        const score = facingDot * 2 - ang;
        if (score > bestScore) {
          bestScore = score;
          aim.copy(t);
        }
      }
      sfx.throw();
      if (weaponKind === "slash") {
        // CAPY: Bad Block Slash — a wide, always-visible cleave. Multishot is
        // "Wider Cleave" here: each level extends the arc and the reach.
        const ms = run.upgrades.multishot ?? 0;
        if (f.lengthSq() > 0.5) {
          world.slashDir.copy(f);
        } else {
          // idle: cleave toward the nearest enemy instead of a stale heading
          let best = Infinity;
          for (const e of world.enemies) {
            if (!e.alive) continue;
            const a = world.pLocal.angleTo(e.dir);
            if (a < best) {
              const tg = tangentToward(world.pLocal, e.dir, _v2);
              if (tg) {
                best = a;
                world.slashDir.copy(tg);
              }
            }
          }
        }
        world.slashFxAt = run.t;
        world.slashFull = false;
        for (const e of world.enemies) {
          if (!e.alive) continue;
          if (world.pLocal.angleTo(e.dir) > 0.32 * (1 + 0.3 * ms)) continue;
          const t2 = tangentToward(world.pLocal, e.dir, _v2);
          if (t2 && t2.dot(world.slashDir) < -0.2 - 0.25 * ms) continue;
          dealDamage(e, shurikenDamage() * 2.2);
          e.recoilUntil = Math.max(e.recoilUntil, run.t + 0.25);
          spawnBurst(e.dir, HEX.success, 4);
        }
      }
      const count = weaponKind === "slash" ? 0 : 1 + (run.upgrades.multishot ?? 0);
      // launch flash at the player — keep it subtle for shurikens so a single
      // throw doesn't read like a fan of stray stars
      if (weaponKind !== "slash") {
        const launchColor =
          weaponKind === "xcoin" ? HEX.gold : weaponKind === "pulse" ? HEX.cyanHot : HEX.shuriken;
        const launchN = weaponKind === "xcoin" ? 5 : weaponKind === "pulse" ? 3 : 1;
        spawnBurst(world.pLocal, launchColor, launchN);
      }
      for (let i = 0; i < count; i++) {
        const s = world.shurikens.find((x) => !x.alive);
        if (!s) break;
        const spread = (i - (count - 1) / 2) * 0.18;
        _v2.copy(aim).applyQuaternion(_q.setFromAxisAngle(world.pLocal, spread));
        s.alive = true;
        s.pos.copy(world.pLocal);
        s.axis.crossVectors(world.pLocal, _v2).normalize();
        s.ttl = weaponKind === "xcoin" ? 0.85 : SHURIKEN_TTL;
        s.dmg = shurikenDamage();
        s.spin = 0;
        s.kind = weaponKind;
        s.pierce = charDef().weapon.pierce ?? 1;
        s.evo = false;
        s.trailAt = run.t + 0.02 + i * 0.01;
      }
    }
    for (const s of world.shurikens) {
      if (!s.alive) continue;
      s.ttl -= dt;
      // ~1.4 rev/s: fast enough to feel thrown, slow enough that the
      // 4-point star SILHOUETTE reads (20 rad/s was a strobing blur)
      s.spin += dt * 9;
      if (s.ttl <= 0) {
        if (s.kind === "xcoin") explodeXCoin(s.pos, s.dmg);
        s.alive = false;
        continue;
      }
      const speed = s.kind === "xcoin" ? 1.15 : s.kind === "pulse" ? 2.2 : SHURIKEN_SPEED;
      s.pos.applyQuaternion(_q.setFromAxisAngle(s.axis, speed * dt)).normalize();
      // projectile trail: staggered so multishot salvos don't drain the pool instantly
      if (run.t >= s.trailAt) {
        const tcolor = s.kind === "xcoin" ? HEX.gold : s.kind === "pulse" ? HEX.cyanHot : HEX.shuriken;
        _v2.crossVectors(s.axis, s.pos).normalize();
        spawnTrail(s.pos, tcolor, _v2);
        s.trailAt = run.t + 0.045;
      }
      for (const e of world.enemies) {
        if (!e.alive) continue;
        if (s.pos.angleTo(e.dir) < (e.radius + 0.05) / R + 0.02) {
          if (s.kind === "xcoin") {
            explodeXCoin(s.pos, s.dmg);
            s.alive = false;
            break;
          }
          dealDamage(e, s.dmg);
          // per-weapon hit language: blue cuts / cyan pixels (coins boom gold)
          if (s.kind === "shuriken") spawnBurst(e.dir, HEX.shuriken, 2);
          if (s.kind === "pulse") {
            spawnBurst(e.dir, HEX.cyanHot, 2);
            e.recoilUntil = run.t + 0.7; // debugged: glitches backwards
            // AI chaining — the pulse forks to the nearest other enemy
            let chained: Enemy | null = null;
            let bestAng = 0.45;
            for (const c of world.enemies) {
              if (!c.alive || c === e) continue;
              const ang = c.dir.angleTo(e.dir);
              if (ang < bestAng) {
                bestAng = ang;
                chained = c;
              }
            }
            if (chained) {
              dealDamage(chained, s.dmg * 0.5);
              chained.recoilUntil = run.t + 0.4;
              spawnBurst(chained.dir, HEX.cyanHot, 3);
            }
          }
          s.pierce -= 1;
          if (s.pierce <= 0) {
            s.alive = false;
            break;
          }
        }
      }
    }

    // ---- CAPY signature: Validator Shield cycles on a visible clock ----
    if (weaponKind === "slash" && run.t >= world.capyShieldAt) {
      world.capyShieldAt = run.t + 10;
      run.fx.shield = Math.max(run.fx.shield, run.t + 2.5);
    }

    // ---- THEO signature: FTS5 Scan — mark everything, farm everything ----
    if (weaponKind === "pulse" && run.t >= world.scanAt) {
      world.scanAt = run.t + 8;
      world.scanFxAt = run.t; // expanding ring visual
      let found = 0;
      for (const e of world.enemies) {
        if (!e.alive || e.dir.angleTo(world.pLocal) > 1.2) continue;
        e.markedUntil = run.t + 3;
        spawnBurst(e.dir, HEX.cyanHot, 2);
        found++;
      }
      if (found > 0) sfx.capture();
    }

    // ---- Arc Node: lightning that chains through the herd ----
    const arcLv = run.upgrades.arcnode ?? 0;
    if (arcLv > 0 && run.t >= world.arcAt) {
      world.arcAt = run.t + 2.2;
      const chainReaction = !!run.upgrades.chainreaction;
      const maxTargets = chainReaction ? 99 : 1 + arcLv;
      const jumpRange = chainReaction ? 0.5 : 0.4;
      const hit: Enemy[] = [];
      let from = world.pLocal;
      for (let hop = 0; hop < maxTargets; hop++) {
        let best: Enemy | null = null;
        let bestAng = hop === 0 ? 0.85 : jumpRange;
        for (const e of world.enemies) {
          if (!e.alive || hit.includes(e)) continue;
          const ang = from.angleTo(e.dir);
          if (ang < bestAng) {
            bestAng = ang;
            best = e;
          }
        }
        if (!best) break;
        hit.push(best);
        from = best.dir;
      }
      if (hit.length > 0) {
        world.arcFlash = run.t + 0.2;
        world.arcDirty = true;
        world.arcPoints = [
          world.pLocal.clone().multiplyScalar(R + 0.12),
          ...hit.map((e) => e.dir.clone().multiplyScalar(R + 0.1)),
        ];
        for (const e of hit) {
          dealDamage(e, 16 + 7 * arcLv, chainReaction);
          spawnBurst(e.dir, HEX.cyan, 3);
        }
      }
    }

    // ---- Blade Storm evolution: periodic 360° shuriken nova ----
    if (run.upgrades.bladestorm && run.t >= world.novaAt) {
      world.novaAt = run.t + 3;
      // the evolution speaks each character's language: shuriken nova /
      // exploding coin ring / chaining pulse burst / full-circle cleave
      const novaKind = charDef().weapon.kind;
      if (novaKind === "slash") {
        // CAPY — Validator Sweep
        world.slashFxAt = run.t;
        world.slashFull = true;
        for (const e of world.enemies) {
          if (!e.alive) continue;
          if (world.pLocal.angleTo(e.dir) > 0.42) continue;
          dealDamage(e, shurikenDamage() * 2.2);
          e.recoilUntil = Math.max(e.recoilUntil, run.t + 0.35);
          spawnBurst(e.dir, HEX.success, 4);
        }
      } else {
        _v2.set(1, 0, 0);
        _v2.addScaledVector(world.pLocal, -world.pLocal.dot(_v2)).normalize();
        for (let i = 0; i < 12; i++) {
          const s = world.shurikens.find((x) => !x.alive);
          if (!s) break;
          const t = _v.copy(_v2).applyQuaternion(
            _q.setFromAxisAngle(world.pLocal, (i * Math.PI * 2) / 12),
          );
          s.alive = true;
          s.pos.copy(world.pLocal);
          s.axis.crossVectors(world.pLocal, t).normalize();
          // pool slots are reused — ALWAYS restamp kind/pierce/ttl
          s.kind = novaKind;
          s.pierce = charDef().weapon.pierce ?? 1;
          s.ttl = novaKind === "xcoin" ? 0.85 : SHURIKEN_TTL;
          s.dmg = shurikenDamage();
          s.spin = 0;
          s.evo = true; // evolved tier: bigger, brighter, unmistakable
        }
      }
    }

    // ---- Golden Whirlwind evolution: the sprint itself wounds ----
    if (run.upgrades.whirlwind && moveState.speed > 0.7 && run.t >= world.wakeAt) {
      world.wakeAt = run.t + 0.16;
      const w = world.wake.find((x) => !x.alive);
      if (w) {
        w.alive = true;
        w.dir.copy(world.pLocal);
        w.life = 1.1;
        w.kind = "gold";
      }
    }
    // ---- Whale boss: cyan ocean wake as it swims ----
    if (run.t >= world.whaleWakeAt) {
      let whaleDir: THREE.Vector3 | null = null;
      for (const e of world.enemies) {
        if (e.alive && e.type === "boss" && e.bossKind === "whale") {
          whaleDir = e.dir;
          break;
        }
      }
      if (whaleDir) {
        world.whaleWakeAt = run.t + 0.13;
        const w = world.wake.find((x) => !x.alive);
        if (w) {
          w.alive = true;
          w.dir.copy(whaleDir);
          w.life = 0.95;
          w.kind = "cyan";
        }
      }
    }
    for (const w of world.wake) {
      if (!w.alive) continue;
      w.life -= dt;
      if (w.life <= 0) {
        w.alive = false;
        continue;
      }
      if (w.kind !== "gold") continue;
      for (const e of world.enemies) {
        if (!e.alive) continue;
        if (w.dir.angleTo(e.dir) < (e.radius + 0.08) / R + 0.02) {
          dealDamage(e, 45 * dt);
        }
      }
    }

    // ---- Ion Halo flames: fire licking up from the ring ----
    if (halo > 0 && run.t >= world.flameAt) {
      world.flameAt = run.t + 0.03;
      for (let n = 0; n < 3; n++) {
        const f = world.flames.find((x) => !x.alive);
        if (!f) break;
        f.alive = true;
        f.smoke = false;
        f.dir.copy(randomDirNear(world.pLocal, halo, halo));
        f.maxLife = 0.35 + Math.random() * 0.25;
        f.life = f.maxLife;
      }
      // sparse smoke: one faint puff for every ~4 flame ticks, drifting higher
      if (Math.random() < 0.25) {
        const f = world.flames.find((x) => !x.alive);
        if (f) {
          f.alive = true;
          f.smoke = true;
          f.dir.copy(randomDirNear(world.pLocal, halo, halo));
          f.maxLife = 0.9 + Math.random() * 0.4;
          f.life = f.maxLife;
        }
      }
    }
    for (const f of world.flames) {
      if (!f.alive) continue;
      f.life -= dt;
      if (f.life <= 0) f.alive = false;
    }

    // ---- particles (death bursts / launch sparks) ----
    for (const p of world.parts) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.speed *= Math.max(0.35, 1 - dt * 1.8); // drag so sparks settle instead of streaking
      p.dir.applyQuaternion(_q.setFromAxisAngle(p.axis, p.speed * dt)).normalize();
    }

    // ---- orbiting katanas (Crimson Tempest: 4 burning blades, 2× dps) ----
    const hasTempest = !!run.upgrades.tempest;
    const kCount = hasTempest ? 4 : (run.upgrades.katana ?? 0);
    for (let i = 0; i < MAX_KATANAS; i++) {
      const mesh = katanaRefs.current[i];
      if (!mesh) continue;
      if (i >= kCount) {
        mesh.visible = false;
        continue;
      }
      const phi = run.t * 2.4 + (i * Math.PI * 2) / Math.max(1, kCount);
      _v2.set(1, 0, 0);
      _v2.addScaledVector(world.pLocal, -world.pLocal.dot(_v2)).normalize();
      _v2.applyQuaternion(_q.setFromAxisAngle(world.pLocal, phi));
      _axis.crossVectors(world.pLocal, _v2).normalize();
      const kpos = _v
        .copy(world.pLocal)
        .applyQuaternion(_q.setFromAxisAngle(_axis, hasTempest ? 0.2 : 0.16));
      mesh.visible = true;
      mesh.position.copy(kpos).multiplyScalar(R + 0.1);
      mesh.quaternion.setFromUnitVectors(UP, kpos);
      mesh.rotateY(phi * 2);
      // the BLADE carries the burn (children[0]); guard/grip stay physical
      const km = (mesh.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      km.emissive.set(hasTempest ? THEME.tempest : THEME.gold);
      km.emissiveIntensity = hasTempest ? 1.6 : 0.8;
      const kdps = hasTempest ? 150 : 70;
      for (const e of world.enemies) {
        if (!e.alive) continue;
        if (kpos.angleTo(e.dir) < (e.radius + 0.06) / R + 0.02) {
          dealDamage(e, kdps * dt);
        }
      }
    }

    // ---- deaths (with a satisfying pop) ----
    for (const e of world.enemies) {
      if (!e.alive || e.hp > 0) continue;
      e.alive = false;
      run.kills++;
      sfx.kill();
      spawnBurst(e.dir, ENEMY_TYPES[e.type].color, e.type === "boss" ? 14 : 6);
      dropGems(e.dir, e.markedUntil > run.t ? Math.round(e.xp * 1.25) : e.xp, e.gemSplit);
      if (world.finalIdx >= 0 && world.enemies[world.finalIdx] === e) {
        world.finalIdx = -1;
        run.finalBossAlive = false;
        if (world.captured.size >= winTarget(regions.length)) {
          useGame.getState().setActiveSites([]);
          useGame.getState().win();
        }
      }
    }

    // ---- gems: magnet + pickup + level-ups ----
    const magnet = magnetAngle();
    for (const gm of world.gems) {
      if (!gm.alive) continue;
      const ang = gm.dir.angleTo(world.pLocal);
      if (gm.t === -1 || ang < magnet) {
        rotateToward(gm.dir, world.pLocal, (gm.t === -1 ? 4 : 2.2) * dt);
      }
      if (ang < GEM_PICKUP) {
        gm.alive = false;
        sfx.coin();
        const lucky = Math.random() < (charDef().luck - 1) * 0.45;
        run.xp += gm.xp * xpMult() * (lucky ? 2 : 1);
      }
    }
    if (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = 8 + (run.level - 1) * 7;
      const choices = rollChoices();
      if (choices.length > 0) {
        sfx.levelup();
        store.offerLevelUp(choices);
      } else {
        // everything maxed — the level still pays out (heal + burst of glory)
        run.hp = Math.min(run.maxHp, run.hp + 30);
        spawnBurst(world.pLocal, HEX.coin, 10);
        store.syncHud();
      }
    }

    // ---- powerup sites ----
    for (const id of [...world.siteIds]) {
      const region = regions.find((r) => r.id === id);
      if (!region) continue;
      _v.set(...region.dir);
      if (_v.angleTo(world.pLocal) < CAPTURE_ANGLE) {
        applySitePower(id);
        sfx.capture();
        // celebration: erupting light pillar + twin shockwaves + sparks
        const cfx = world.captureFx.find((x) => !x.active) ?? world.captureFx[0];
        cfx.active = true;
        cfx.dir.copy(_v);
        cfx.t0 = run.t;
        run.captureSlowUntil = run.t + 0.55;
        spawnBurst(_v, HEX.siteLabel, 14);
        spawnBurst(_v, HEX.cyan, 7);
        world.captured.add(id);
        useGame.setState((s) => ({ capturedIds: [...s.capturedIds, id] }));
        run.captured = world.captured.size;
        // tutorial: first capture triggers the celebration step
        if (store.tutorialPhase === "move") store.setTutorialPhase("levelup");
        // request the FINAL BOSS near the end (win-target remaining + soft
        // level gate; win-target-met bypass). Spawn retries in the main loop
        // so it can NEVER be skipped; victory is gated on it having spawned.
        const target = winTarget(regions.length);
        if (
          shouldRequestFinale({
            remaining: target - world.captured.size,
            level: run.level,
            totalSites: target,
          })
        ) {
          world.finalWanted = true;
        }
        if (world.captured.size >= target && world.finalSpawned && !run.finalBossAlive) {
          store.setActiveSites([]);
          store.win();
          return;
        }
        world.siteIds = world.siteIds.filter((x) => x !== id);
        world.siteRespawnAt = run.t + SITE_RESPAWN;
        store.setActiveSites(world.siteIds);
      }
    }
    if (world.siteIds.length < ACTIVE_SITES && run.t >= world.siteRespawnAt) {
      world.siteIds = [...world.siteIds, ...pickSites(1, world.siteIds)];
      world.siteRespawnAt = run.t + SITE_RESPAWN;
      store.setActiveSites(world.siteIds);
    }

    // ---- end-of-run: clock, death, HUD sync ----
    // duck the ambient music when the screen is crowded or a boss is alive
    let activeEnemies = 0;
    let bossAlive = false;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      activeEnemies++;
      if (e.type === "boss") bossAlive = true;
    }
    const density = activeEnemies / MAX_ENEMIES;
    const duck = bossAlive ? 0.2 : density > 0.45 ? 0.45 : 1 - density * 0.5;
    duckMusic(duck);
    run.bossAlive = bossAlive;

    // the run is a time attack — when the clock runs out, bank the score. (win()
    // fires earlier in the capture handler if you complete the map first.)
    if (run.t >= effectiveRunSeconds()) {
      store.timeUp();
    } else if (run.hp <= 0) {
      run.hp = 0;
      store.die();
    } else if (run.t >= world.syncAt || (run.t - run.lastHitAt < 0.1 && run.t >= world.syncAt - 0.2)) {
      world.syncAt = run.t + 0.25;
      store.syncHud();
    }

    syncMeshes();
  });


  if (mode === "explore") {
    // nothing rendered while exploring (pools exist but stay invisible)
  }

  return (
    <group>
      {Array.from({ length: MAX_ENEMIES }).map((_, i) => {
        const kind = typeForSlot(i);
        return (
          <group key={`e${i}`} ref={(el) => { enemyRefs.current[i] = el; }} visible={false}>
            {kind === "boss" ? (
              <>
                <primitive object={enemyClones[i]!} />
                <Nemesis scale={1.05} charId={run.character} />
              </>
            ) : kind === "goblin" ? (
              <group scale={0.2}>
                <BugMob />
              </group>
            ) : kind === "gremlin" ? (
              <group scale={0.22}>
                <GasWisp />
              </group>
            ) : (
              <group scale={0.32}>
                <RugMob />
              </group>
            )}
            {/* THEO scan-lock: a flat cyan ring on the GROUND under the mob
                — same visual language as the red spawn-warning rings, and
                nothing floats near the sprite (chips/diamonds up there read
                as glowing-box glitches from the top-down camera) */}
            <mesh
              ref={(el) => { markRefs.current[i] = el; }}
              visible={false}
              position={[0, 0.02, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.26, 0.3, 26]} />
              <meshBasicMaterial
                color={HEX.cyanHot}
                transparent
                opacity={0.7}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: MAX_SHURIKENS }).map((_, i) => (
        <mesh
          key={`s${i}`}
          ref={(el) => { shurikenRefs.current[i] = el; }}
          visible={false}
          geometry={shurikenGeo ?? undefined}
        >
          {!shurikenGeo && <boxGeometry args={[0.05, 0.008, 0.05]} />}
          <meshStandardMaterial color={HEX.steel} emissive={HEX.theoEye} emissiveIntensity={0.8} metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      {/* Jack's XEN coins — black disc, bold white X on both faces */}
      {Array.from({ length: MAX_SHURIKENS }).map((_, i) => (
        <group key={`xc${i}`} ref={(el) => { coinRefs.current[i] = el; }} visible={false}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.055, 0.016, 22]} />
            <meshStandardMaterial
              color={HEX.coinDisc}
              metalness={0.7}
              roughness={0.3}
              emissive={HEX.coinRim}
              emissiveIntensity={0.9}
            />
          </mesh>
          {[-1, 1].map((f) => (
            <mesh key={f} position={[0, f * 0.0095, 0]} rotation={[f === 1 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.048, 22]} />
              <meshBasicMaterial map={getXCoinTexture()} transparent toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* THEO's prompt pulse — a LASER BOLT: white-hot core inside a cyan
          glow sheath, elongated along the travel direction. Ray gun, not
          thrown cutlery. */}
      {Array.from({ length: MAX_SHURIKENS }).map((_, i) => (
        <group key={`pp${i}`} ref={(el) => { pulseRefs.current[i] = el; }} visible={false}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.011, 0.15, 3, 8]} />
            <meshBasicMaterial color={HEX.pulseCore} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.028, 0.16, 3, 10]} />
            <meshBasicMaterial
              color={HEX.pulseGlow}
              transparent
              opacity={0.4}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {/* XEN detonations — expanding gold shock ring + white-hot core */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={`bm${i}`} ref={(el) => { boomRefs.current[i] = el; }} visible={false}>
          <mesh>
            <ringGeometry args={[0.86, 1, 40]} />
            <meshBasicMaterial
              color={HEX.gold}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial
              color={HEX.boomCore}
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {/* CAPY Validator Shield — green hex barrier during the immune window */}
      <mesh ref={shieldRef} visible={false}>
        <ringGeometry args={[0.82, 1, 48]} />
        <meshBasicMaterial
          map={getEnergyRingTexture()}
          color={HEX.success}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* spawn warning markers — soft radial bloom tightening until the hatch */}
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={`wr${i}`} ref={(el) => { warnRefs.current[i] = el; }} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={getWarnTexture()}
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* floating damage numbers (crits + bosses) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <sprite key={`dn${i}`} ref={(el) => { dmgRefs.current[i] = el; }} visible={false}>
          <spriteMaterial transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      {/* capture celebration — a light pillar SHOOTS skyward, two shock
          rings chase each other outward, sparks fly (spawned on capture) */}
      {Array.from({ length: 3 }).map((_, i) => (
        <group key={`cb${i}`} ref={(el) => { beamRefs.current[i] = el; }} visible={false}>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.02, 0.06, 1.3, 12, 1, true]} />
            <meshBasicMaterial
              color={HEX.siteLabel}
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.82, 1, 36]} />
            <meshBasicMaterial
              color={HEX.coin}
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
            <ringGeometry args={[0.9, 1, 36]} />
            <meshBasicMaterial
              color={HEX.cyan}
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          {/* white-hot core flash — the POP of the claim */}
          <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color={HEX.captureCore}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* wide soft outer pillar around the hot beam */}
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.09, 0.16, 1.3, 12, 1, true]} />
            <meshBasicMaterial
              color={HEX.gold}
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {/* CAPY's blade — a proper steel katana flash with a gold guard */}
      <group ref={swordRef} visible={false}>
        <mesh position={[0.36, 0, 0]}>
          <boxGeometry args={[0.5, 0.014, 0.05]} />
          <meshStandardMaterial
            color={HEX.bladeSteel}
            emissive={HEX.bladeEmissive}
            emissiveIntensity={1.1}
            metalness={0.95}
            roughness={0.12}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.09, 0, 0]}>
          <boxGeometry args={[0.05, 0.024, 0.07]} />
          <meshStandardMaterial color={HEX.gold} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* compass arrows to the active capture targets — head + shaft so they
          read as ARROWS, not tiny traffic cones */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`ar${i}`} ref={(el) => { arrowRefs.current[i] = el; }} visible={false}>
          <coneGeometry args={[0.032, 0.08, 4]} />
          <meshStandardMaterial emissiveIntensity={1.1} toneMapped={false} />
          <mesh position={[0, -0.075, 0]}>
            <boxGeometry args={[0.022, 0.08, 0.012]} />
            <meshStandardMaterial color={HEX.white} emissive={HEX.white} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </mesh>
      ))}
      {/* site-name banners over the active targets */}
      {Array.from({ length: 3 }).map((_, i) => (
        <sprite key={`lb${i}`} ref={(el) => { labelRefs.current[i] = el; }} visible={false} scale={[0.92, 0.23, 1]}>
          <spriteMaterial transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {Array.from({ length: MAX_GEMS }).map((_, i) => (
        // faceted arcade coin: upright gold disc, spinning on its vertical axis
        <mesh key={`g${i}`} ref={(el) => { gemRefs.current[i] = el; }} visible={false}>
          <cylinderGeometry args={[0.04, 0.04, 0.012, 8]} />
          <meshStandardMaterial
            color={HEX.coin}
            emissive={HEX.goldEmissive}
            emissiveIntensity={0.9}
            metalness={0.9}
            roughness={0.18}
          />
          {[-1, 1].map((f) => (
            <mesh
              key={f}
              position={[0, f * 0.0065, 0]}
              rotation={[f === 1 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.018, 0.024, 8]} />
              <meshBasicMaterial
                color={HEX.white}
                transparent
                opacity={0.55}
                toneMapped={false}
              />
            </mesh>
          ))}
        </mesh>
      ))}
      {/* orbiting katanas — an actual sword (steel blade, gold tsuba,
          wrapped grip), not a glowing yellow bar */}
      {Array.from({ length: MAX_KATANAS }).map((_, i) => (
        <group key={`k${i}`} ref={(el) => { katanaRefs.current[i] = el; }} visible={false}>
          <mesh position={[0, 0, 0.055]}>
            <boxGeometry args={[0.013, 0.005, 0.17]} />
            <meshStandardMaterial
              color={HEX.katanaBlade}
              emissive={HEX.gold}
              emissiveIntensity={0.8}
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>
          <mesh position={[0, 0, -0.033]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.008, 12]} />
            <meshStandardMaterial color={HEX.gold} metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -0.072]}>
            <boxGeometry args={[0.013, 0.013, 0.068]} />
            <meshStandardMaterial color={HEX.grip} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, -0.11]}>
            <sphereGeometry args={[0.011, 8, 8]} />
            <meshStandardMaterial color={HEX.gold} metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: MAX_WAKE }).map((_, i) => (
        <mesh key={`w${i}`} ref={(el) => { wakeRefs.current[i] = el; }} visible={false}>
          <circleGeometry args={[0.09, 20]} />
          <meshBasicMaterial
            color={HEX.coin}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {Array.from({ length: MAX_PARTS }).map((_, i) => (
        <mesh key={`p${i}`} ref={(el) => { partRefs.current[i] = el; }} visible={false}>
          <octahedronGeometry args={[1]} />
          <meshBasicMaterial transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {/* Ion Halo — bright rim + molten fill */}
      <mesh ref={haloRef} visible={false}>
        <ringGeometry args={[0.97, 1, 64]} />
        <meshBasicMaterial
          map={getEnergyRingTexture()}
          color={HEX.halo}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={haloFillRef} visible={false}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial
          color={HEX.haloFill}
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Ion Halo flames — soft vertical sprites instead of low-poly cones */}
      {Array.from({ length: MAX_FLAMES }).map((_, i) => (
        <sprite key={`f${i}`} ref={(el) => { flameRefs.current[i] = el; }} visible={false}>
          <spriteMaterial
            map={getFlameTexture()}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
      {/* CAPY — Bad Block Slash sweep: a STEEL flash, not a green wash —
          the sword-ness is the identity (green stays on his shield/aura) */}
      <mesh ref={slashRef} visible={false}>
        <ringGeometry args={[0.28, 1, 48, 1, -1.15, 2.3]} />
        <meshBasicMaterial
          map={getEnergyRingTexture()}
          color={HEX.slash}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* THEO — FTS5 scan ring */}
      <mesh ref={scanRef} visible={false}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial
          map={getEnergyRingTexture()}
          color={HEX.cyanHot}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* THEO — lock-on reticle: sharp diamond bracket */}
      <mesh ref={reticleRef} visible={false}>
        <ringGeometry args={[0.92, 0.98, 4]} />
        <meshBasicMaterial
          map={getEnergyRingTexture()}
          color={HEX.cyanHot}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Coin Magnet — pickup-radius shimmer ring */}
      <mesh ref={magnetRef} visible={false}>
        <ringGeometry args={[0.96, 1, 8]} />
        <meshBasicMaterial
          map={getEnergyRingTexture()}
          color={HEX.cyan}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Arc Node lightning */}
      <primitive object={ARC_CORE} />
      <primitive object={ARC_GLOW} />
    </group>
  );
}
