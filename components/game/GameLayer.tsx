"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { regions } from "@/lib/regions";
import { moveState } from "@/lib/gameState";
import {
  BLOCK_SECONDS,
  ENEMY_TYPES,
  currentSpeedMult,
  fireCooldown,
  magnetAngle,
  rollChoices,
  run,
  shurikenDamage,
  useGame,
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
const MAX_SHURIKENS = 24;
const MAX_GEMS = 90;
const MAX_KATANAS = 2;

const CONTACT_BASE = 0.055; // player's angular "radius"
const SHURIKEN_SPEED = 1.7; // rad/s
const SHURIKEN_TTL = 1.1;
const GEM_PICKUP = 0.055;
const CAPTURE_ANGLE = 0.26;
const ACTIVE_SITES = 3;
const SITE_RESPAWN = 8;

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
};
type Shuriken = { alive: boolean; pos: THREE.Vector3; axis: THREE.Vector3; ttl: number; dmg: number; spin: number };
type Gem = { alive: boolean; dir: THREE.Vector3; xp: number; t: number };

const _q = new THREE.Quaternion();
const _qInv = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _axis = new THREE.Vector3();

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
        speed: 0, radius: 0, dmg: 0, xp: 0, gemSplit: 1, t: 0,
      })),
      shurikens: Array.from({ length: MAX_SHURIKENS }, (): Shuriken => ({
        alive: false, pos: new THREE.Vector3(), axis: new THREE.Vector3(), ttl: 0, dmg: 0, spin: 0,
      })),
      gems: Array.from({ length: MAX_GEMS }, (): Gem => ({
        alive: false, dir: new THREE.Vector3(), xp: 0, t: 0,
      })),
      pLocal: new THREE.Vector3(0, 1, 0),
      facingLocal: new THREE.Vector3(0, 0, -1),
      facingWorld: new THREE.Vector3(0, 0, -1),
      fireAt: 0,
      spawnAt: 0,
      bossAtBlock: 0,
      siteIds: [] as string[],
      siteRespawnAt: 0,
      syncAt: 0,
      started: false,
};

export default function GameLayer({ planet }: { planet: React.RefObject<THREE.Group | null> }) {
  const mode = useGame((s) => s.mode);

  const enemyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shurikenRefs = useRef<(THREE.Mesh | null)[]>([]);
  const gemRefs = useRef<(THREE.Mesh | null)[]>([]);
  const katanaRefs = useRef<(THREE.Mesh | null)[]>([]);

  const spawnEnemy = (type: EnemyTypeId) => {
    const e = world.enemies.find((x) => !x.alive);
    if (!e) return;
    const T = ENEMY_TYPES[type];
    const scale = 1 + run.block * 0.1;
    e.alive = true;
    e.type = type;
    e.dir.copy(randomDirNear(world.pLocal, 0.9, 1.8));
    e.maxHp = e.hp = T.hp * scale;
    e.speed = T.speed * Math.min(1.6, 1 + run.block * 0.02);
    e.radius = T.radius;
    e.dmg = T.dmg;
    e.xp = T.xp;
    e.gemSplit = T.gemSplit;
    e.t = Math.random() * 10;
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

  const pickSites = (count: number, exclude: string[]) => {
    const pool = regions.filter((r) => !exclude.includes(r.id));
    const out: string[] = [];
    while (out.length < count && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool[i].id);
      pool.splice(i, 1);
    }
    return out;
  };

  const applySitePower = (id: string) => {
    const region = regions.find((r) => r.id === id);
    if (!region) return;
    switch (region.kind) {
      case "validatorTower": run.fx.speed = run.t + 10; break;
      case "chartBeacon": run.fx.rate = run.t + 10; break;
      case "dexGate": run.fx.dmg = run.t + 10; break;
      case "explorerFort": run.fx.shield = run.t + 8; break;
      case "socialBeacon": run.hp = Math.min(run.maxHp, run.hp + 35); break;
      case "gameArcade": run.fx.xp = run.t + 15; break;
      case "oracleShrine":
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
  };

  function syncMeshes() {
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const mesh = enemyRefs.current[i];
      const e = world.enemies[i];
      if (!mesh) continue;
      mesh.visible = e.alive;
      if (e.alive) {
        mesh.position.copy(e.dir).multiplyScalar(R + e.radius * 0.9);
        mesh.scale.setScalar(e.radius);
        mesh.quaternion.setFromUnitVectors(UP, e.dir);
        mesh.rotateY(e.t * 1.5);
        const m = mesh.material as THREE.MeshStandardMaterial;
        const T = ENEMY_TYPES[e.type];
        m.color.set(T.color);
        m.emissive.set(T.color);
        m.emissiveIntensity = e.hp < e.maxHp * 0.35 ? 1.2 : 0.55;
      }
    }
    for (let i = 0; i < MAX_SHURIKENS; i++) {
      const mesh = shurikenRefs.current[i];
      const s = world.shurikens[i];
      if (!mesh) continue;
      mesh.visible = s.alive;
      if (s.alive) {
        mesh.position.copy(s.pos).multiplyScalar(R + 0.07);
        mesh.quaternion.setFromUnitVectors(UP, s.pos);
        mesh.rotateY(s.spin);
      }
    }
    for (let i = 0; i < MAX_GEMS; i++) {
      const mesh = gemRefs.current[i];
      const gm = world.gems[i];
      if (!mesh) continue;
      mesh.visible = gm.alive;
      if (gm.alive) {
        mesh.position.copy(gm.dir).multiplyScalar(R + 0.05);
        mesh.rotation.y += 0.05;
      }
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
      world.bossAtBlock = 0;
      world.siteIds = pickSites(ACTIVE_SITES, []);
      store.setActiveSites(world.siteIds);
    }
    if (store.mode === "explore" || store.mode === "dead") {
      if (world.started) {
        world.started = false;
        for (const e of world.enemies) e.alive = false;
        for (const s of world.shurikens) s.alive = false;
        for (const gm of world.gems) gm.alive = false;
        syncMeshes();
      }
      return;
    }
    if (store.mode !== "play") {
      syncMeshes(); // levelup: frozen but visible
      return;
    }

    const dt = Math.min(rawDt, 0.05);
    run.t += dt;
    run.speedMult = currentSpeedMult();
    const newBlock = Math.floor(run.t / BLOCK_SECONDS);
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
    const interval = Math.max(0.35, 1.6 * Math.pow(0.92, run.block));
    if (run.t >= world.spawnAt) {
      world.spawnAt = run.t + interval;
      const n = 1 + Math.floor(run.block / 3);
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
        spawnEnemy(type);
      }
    }
    // Bear Market boss every 5 blocks
    if (run.block > 0 && run.block % 5 === 0 && world.bossAtBlock !== run.block) {
      world.bossAtBlock = run.block;
      spawnEnemy("boss");
    }

    // ---- enemies: chase + separation + contact damage ----
    const shielded = run.t < run.fx.shield;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      const lunge = e.type === "gremlin" ? 1 + 0.6 * Math.sin(e.t * 5) : 1;
      rotateToward(e.dir, world.pLocal, e.speed * lunge * dt);
      const contact = (CONTACT_BASE * R + e.radius) / R;
      if (e.dir.angleTo(world.pLocal) < contact) {
        if (!shielded) {
          run.hp -= e.dmg * dt;
          run.lastHitAt = run.t;
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
        if (facingDot < 0.35) continue;
        const score = facingDot * 2 - ang;
        if (score > bestScore) {
          bestScore = score;
          aim.copy(t);
        }
      }
      const count = 1 + (run.upgrades.multishot ?? 0);
      for (let i = 0; i < count; i++) {
        const s = world.shurikens.find((x) => !x.alive);
        if (!s) break;
        const spread = (i - (count - 1) / 2) * 0.28;
        _v2.copy(aim).applyQuaternion(_q.setFromAxisAngle(world.pLocal, spread));
        s.alive = true;
        s.pos.copy(world.pLocal);
        s.axis.crossVectors(world.pLocal, _v2).normalize();
        s.ttl = SHURIKEN_TTL;
        s.dmg = shurikenDamage();
        s.spin = 0;
      }
    }
    for (const s of world.shurikens) {
      if (!s.alive) continue;
      s.ttl -= dt;
      s.spin += dt * 20;
      if (s.ttl <= 0) {
        s.alive = false;
        continue;
      }
      s.pos.applyQuaternion(_q.setFromAxisAngle(s.axis, SHURIKEN_SPEED * dt)).normalize();
      for (const e of world.enemies) {
        if (!e.alive) continue;
        if (s.pos.angleTo(e.dir) < (e.radius + 0.05) / R + 0.02) {
          e.hp -= s.dmg;
          s.alive = false;
          break;
        }
      }
    }

    // ---- orbiting katanas ----
    const kCount = run.upgrades.katana ?? 0;
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
      const kpos = _v.copy(world.pLocal).applyQuaternion(_q.setFromAxisAngle(_axis, 0.16));
      mesh.visible = true;
      mesh.position.copy(kpos).multiplyScalar(R + 0.1);
      mesh.quaternion.setFromUnitVectors(UP, kpos);
      mesh.rotateY(phi * 2);
      for (const e of world.enemies) {
        if (!e.alive) continue;
        if (kpos.angleTo(e.dir) < (e.radius + 0.06) / R + 0.02) e.hp -= 70 * dt;
      }
    }

    // ---- deaths ----
    for (const e of world.enemies) {
      if (!e.alive || e.hp > 0) continue;
      e.alive = false;
      run.kills++;
      dropGems(e.dir, e.xp, e.gemSplit);
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
        run.xp += gm.xp * (run.t < run.fx.xp ? 2 : 1);
      }
    }
    if (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = 8 + (run.level - 1) * 7;
      const choices = rollChoices();
      if (choices.length > 0) {
        store.offerLevelUp(choices);
      }
    }

    // ---- powerup sites ----
    for (const id of [...world.siteIds]) {
      const region = regions.find((r) => r.id === id);
      if (!region) continue;
      _v.set(...region.dir);
      if (_v.angleTo(world.pLocal) < CAPTURE_ANGLE) {
        applySitePower(id);
        run.captured++;
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

    // ---- death & HUD sync ----
    if (run.hp <= 0) {
      run.hp = 0;
      store.die();
    } else if (run.t >= world.syncAt) {
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
      {Array.from({ length: MAX_ENEMIES }).map((_, i) => (
        <mesh key={`e${i}`} ref={(el) => { enemyRefs.current[i] = el; }} visible={false}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial roughness={0.45} metalness={0.1} />
        </mesh>
      ))}
      {Array.from({ length: MAX_SHURIKENS }).map((_, i) => (
        <mesh key={`s${i}`} ref={(el) => { shurikenRefs.current[i] = el; }} visible={false}>
          <boxGeometry args={[0.05, 0.008, 0.05]} />
          <meshStandardMaterial color="#c7d0e2" emissive="#7dd3fc" emissiveIntensity={0.9} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {Array.from({ length: MAX_GEMS }).map((_, i) => (
        <mesh key={`g${i}`} ref={(el) => { gemRefs.current[i] = el; }} visible={false}>
          <octahedronGeometry args={[0.03]} />
          <meshStandardMaterial color="#ffd23d" emissive="#ffd23d" emissiveIntensity={1.4} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: MAX_KATANAS }).map((_, i) => (
        <mesh key={`k${i}`} ref={(el) => { katanaRefs.current[i] = el; }} visible={false}>
          <boxGeometry args={[0.02, 0.02, 0.22]} />
          <meshStandardMaterial color="#c7d0e2" emissive="#f0c75e" emissiveIntensity={0.8} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
