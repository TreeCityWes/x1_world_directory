"use client";

import type { LandmarkKind } from "@/lib/regions";

/**
 * Low-poly landmark models — one silhouette per project category, so a
 * validator tower reads differently from a DEX gate or an oracle shrine at a
 * glance. All sit on a small base, aligned to the sphere normal by the parent,
 * with the category accent as emissive detail.
 */

const HULL = "#2a3a63";
const HULL_DARK = "#141c33";

function Base({ r = 0.1 }: { r?: number }) {
  return (
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <cylinderGeometry args={[r, r * 1.25, 0.045, 6]} />
      <meshStandardMaterial color={HULL_DARK} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.45} metalness={0.6} />
    </mesh>
  );
}

function Accent({ color, intensity = 1.4 }: { color: string; intensity?: number }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.3} />;
}

function ValidatorTower({ accent }: { accent: string }) {
  return (
    <>
      <Base />
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.018, 0.032, 0.32, 6]} />
        <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.35} metalness={0.7} />
      </mesh>
      {[0.14, 0.22, 0.3].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
          <boxGeometry args={[0.12 - i * 0.025, 0.012, 0.012]} />
          <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.39, 0]}>
        <sphereGeometry args={[0.024, 10, 10]} />
        <Accent color={accent} intensity={2} />
      </mesh>
    </>
  );
}

function DexGate({ accent }: { accent: string }) {
  return (
    <>
      <Base r={0.12} />
      {[-0.085, 0.085].map((x) => (
        <mesh key={x} position={[x, 0.16, 0]}>
          <boxGeometry args={[0.045, 0.26, 0.045]} />
          <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.24, 0.05, 0.055]} />
        <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* the shimmering market plane inside the gate */}
      <mesh position={[0, 0.165, 0]}>
        <planeGeometry args={[0.125, 0.22]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.9}
          transparent
          opacity={0.55}
          side={2}
        />
      </mesh>
    </>
  );
}

function ChartBeacon({ accent }: { accent: string }) {
  const bars = [0.09, 0.15, 0.22, 0.3];
  return (
    <>
      <Base r={0.11} />
      {bars.map((h, i) => (
        <mesh key={i} position={[-0.075 + i * 0.05, 0.04 + h / 2, 0]}>
          <boxGeometry args={[0.038, h, 0.038]} />
          {i === bars.length - 1 ? (
            <Accent color={accent} intensity={1.3} />
          ) : (
            <meshStandardMaterial
              color={HULL}
              emissive={accent}
              emissiveIntensity={0.15 + i * 0.12}
              roughness={0.4}
            />
          )}
        </mesh>
      ))}
    </>
  );
}

function SocialBeacon({ accent }: { accent: string }) {
  return (
    <>
      <Base />
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.016, 0.026, 0.28, 6]} />
        <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
      </mesh>
      {[
        { y: 0.18, r: 0.055, tilt: 0.5 },
        { y: 0.26, r: 0.04, tilt: -0.45 },
      ].map((ring, i) => (
        <mesh key={i} position={[0, ring.y, 0]} rotation={[Math.PI / 2 + ring.tilt, 0, 0]}>
          <torusGeometry args={[ring.r, 0.007, 8, 24]} />
          <Accent color={accent} intensity={1.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.33, 0]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <Accent color={accent} intensity={2} />
      </mesh>
    </>
  );
}

function GameArcade({ accent }: { accent: string }) {
  return (
    <>
      <Base r={0.12} />
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.16, 0.2, 0.12]} />
        <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* tilted glowing screen */}
      <mesh position={[0, 0.19, 0.055]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.12, 0.09]} />
        <Accent color={accent} intensity={1.6} />
      </mesh>
      <mesh position={[0.04, 0.245, 0.02]}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <Accent color={accent} intensity={1.2} />
      </mesh>
    </>
  );
}

function BridgePortal({ accent }: { accent: string }) {
  return (
    <>
      <Base r={0.12} />
      <mesh position={[0, 0.2, 0]}>
        <torusGeometry args={[0.12, 0.018, 10, 28]} />
        <Accent color={accent} intensity={1.3} />
      </mesh>
      {/* portal film */}
      <mesh position={[0, 0.2, 0]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>
    </>
  );
}

function ExplorerFort({ accent }: { accent: string }) {
  return (
    <>
      <Base r={0.13} />
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.17, 0.15, 0.17]} />
        <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.45} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color={HULL_DARK} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.45} metalness={0.5} />
      </mesh>
      {[-0.07, 0.07].map((x) =>
        [-0.07, 0.07].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
            <boxGeometry args={[0.035, 0.07, 0.035]} />
            <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.45} metalness={0.5} />
          </mesh>
        )),
      )}
      {/* glowing gate */}
      <mesh position={[0, 0.09, 0.086]}>
        <planeGeometry args={[0.05, 0.07]} />
        <Accent color={accent} intensity={1.5} />
      </mesh>
    </>
  );
}

function OracleShrine({ accent }: { accent: string }) {
  return (
    <>
      <Base />
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.035, 0.055, 0.1, 6]} />
        <meshStandardMaterial color={HULL} emissive="#2a4080" emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <octahedronGeometry args={[0.06]} />
        <Accent color={accent} intensity={1.8} />
      </mesh>
      <mesh position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.006, 8, 24]} />
        <Accent color={accent} intensity={1} />
      </mesh>
    </>
  );
}

const MODELS: Record<LandmarkKind, (p: { accent: string }) => React.ReactNode> = {
  validatorTower: ValidatorTower,
  dexGate: DexGate,
  chartBeacon: ChartBeacon,
  socialBeacon: SocialBeacon,
  gameArcade: GameArcade,
  bridgePortal: BridgePortal,
  explorerFort: ExplorerFort,
  oracleShrine: OracleShrine,
};

export default function Landmark({ kind, accent }: { kind: LandmarkKind; accent: string }) {
  const Model = MODELS[kind];
  return <Model accent={accent} />;
}
