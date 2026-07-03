"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import Planet from "@/components/three/Planet";
import Character from "@/components/three/Character";
import Rig from "@/components/three/Rig";
import Overlay from "@/components/ui/Overlay";
import SidePanel from "@/components/ui/SidePanel";

/**
 * Console layout: LEFT screen is the world (its own canvas pane, globe fully
 * framed), RIGHT screen is the info console. No scrolling — you explore by
 * walking (WASD) and dragging the planet.
 */
export default function Experience() {
  return (
    <div className="absolute inset-0 flex select-none max-md:flex-col">
      {/* left screen — the world */}
      <div className="relative min-w-0 flex-1 max-md:h-[52vh] max-md:flex-none">
        <Canvas
          shadows
          camera={{ position: [0, 3.2, 9.2], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          {/* night lighting: cool moon key + hemisphere + blue fills (no dead-black limb) */}
          <ambientLight intensity={0.5} color="#8ea3c4" />
          <hemisphereLight intensity={0.4} color="#6e8fd8" groundColor="#0a0e1a" />
          <directionalLight
            position={[5, 8, 4]}
            intensity={2.1}
            color="#dbe6ff"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-6, -2, -4]} intensity={0.7} color="#3b82f6" />
          <directionalLight position={[0, -6, 6]} intensity={0.3} color="#5a7bd0" />

          {/* useTexture & co. suspend — everything lives under Suspense */}
          <Suspense fallback={null}>
            {/* two star layers at different radii → parallax depth */}
            <Stars radius={55} depth={30} count={2500} factor={4} saturation={0} fade speed={0.7} />
            <Stars radius={110} depth={60} count={3000} factor={6} saturation={0} fade speed={0.25} />
            <Planet />
            <Character />
            <Rig />
          </Suspense>
        </Canvas>
        <Overlay />
      </div>

      {/* right screen — the console */}
      <SidePanel />
    </div>
  );
}
