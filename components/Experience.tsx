"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { MotionConfig } from "framer-motion";
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
// coarse-pointer ≈ phone/tablet GPU: fewer stars, no MSAA on the composer
const LOW_GPU =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 768);

export default function Experience() {
  return (
    <MotionConfig reducedMotion="user">
    <div className="absolute inset-0 flex select-none max-md:static max-md:flex-col">
      {/* left screen — the world */}
      <div className="relative min-w-0 flex-1 max-md:h-[62vh] max-md:flex-none">
        <Canvas
          shadows
          camera={{ position: [0, 3.2, 9.2], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          {/* single key light → a real lit/dark terminator on the globe; the
              fresnel atmosphere + a faint cool back-fill keep the night limb
              alive instead of a dead-black edge */}
          <ambientLight intensity={0.15} color="#8ea3c4" />
          <directionalLight
            position={[5, 8, 4]}
            intensity={2.1}
            color="#dbe6ff"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-6, -2, -4]} intensity={0.28} color="#3b82f6" />

          {/* useTexture & co. suspend — everything lives under Suspense */}
          <Suspense fallback={null}>
            {/* two star layers at different radii → parallax depth */}
            <Stars
              radius={55}
              depth={30}
              count={LOW_GPU ? 1100 : 2500}
              factor={4}
              saturation={0}
              fade
              speed={0.2}
            />
            <Stars
              radius={110}
              depth={60}
              count={LOW_GPU ? 1300 : 3000}
              factor={6}
              saturation={0}
              fade
              speed={0.1}
            />
            <Planet />
            <Character />
            <Rig />
          </Suspense>

          {/* post: bloom on the emissive beacons/eyes/blades + soft vignette */}
          <EffectComposer multisampling={LOW_GPU ? 0 : 8}>
            <Bloom
              intensity={0.5}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.7}
              radius={0.6}
              mipmapBlur
            />
            <Vignette offset={0.3} darkness={0.6} />
          </EffectComposer>
        </Canvas>
        <Overlay />
      </div>

      {/* right screen — the console */}
      <SidePanel />
    </div>
    </MotionConfig>
  );
}
