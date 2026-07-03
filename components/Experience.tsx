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
    <div className="absolute inset-0 flex select-none max-sm:flex-col">
      {/* left screen — the world */}
      <div className="relative min-w-0 flex-1 max-sm:h-[54vh] max-sm:flex-none">
        <Canvas
          shadows
          camera={{ position: [0, 3.2, 9.2], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          {/* night lighting: cool moon key + faint blue fill */}
          <ambientLight intensity={0.38} color="#8ea3c4" />
          <directionalLight
            position={[5, 8, 4]}
            intensity={2.1}
            color="#dbe6ff"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-6, -2, -4]} intensity={0.35} color="#3b82f6" />

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
