"use client";

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { MotionConfig } from "framer-motion";
import Planet from "@/components/three/Planet";
import Character from "@/components/three/Character";
import Rig from "@/components/three/Rig";
import Overlay from "@/components/ui/Overlay";
import SidePanel from "@/components/ui/SidePanel";
import { LOW_GPU } from "@/lib/quality";
import { useGame } from "@/lib/gameStore";

// Chromatic aberration: radial, so the center stays razor sharp and only the
// frame's rim picks up a whisper of lens fringing. The offset is TINY on
// purpose — at 2× this it reads as a broken monitor, not a lens.
const CA_OFFSET = new THREE.Vector2(0.0004, 0.0008);

/**
 * Console layout: LEFT screen is the world (its own canvas pane, globe fully
 * framed), RIGHT screen is the info console. No scrolling — you explore by
 * walking (WASD) and dragging the planet.
 */
export default function Experience() {
  const mode = useGame((s) => s.mode);
  const immersive = mode === "play" || mode === "paused" || mode === "levelup";

  useEffect(() => {
    if (!immersive) {
      document.body.classList.remove("x1-immersive");
      return;
    }
    document.body.classList.add("x1-immersive");
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("x1-immersive");
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [immersive]);

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={`absolute inset-0 flex select-none max-md:flex-col ${
        immersive
          ? "max-md:fixed max-md:inset-0 max-md:z-30 max-md:h-dvh max-md:w-full max-md:bg-space"
          : "max-md:static"
      }`}
    >
      {/* left screen — the world */}
      <div
        className={`relative min-w-0 flex-1 max-md:flex-none ${
          immersive
            ? "max-md:h-full max-md:min-h-0 max-md:flex-1 max-md:touch-none max-md:overflow-hidden"
            : "max-md:h-[62dvh]"
        }`}
      >
        <Canvas
          className="!h-full !w-full touch-none"
          style={{ touchAction: "none" }}
          // shadow pass renders every castShadow mesh a second time — on a
          // dark starry globe the additive contact glows carry the grounding,
          // so coarse GPUs skip shadows entirely
          shadows={!LOW_GPU}
          camera={{ position: [0, 3.2, 9.2], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
          onCreated={({ scene, gl }) => {
            // debug escape hatch: lets headless perf scripts read
            // renderer.info (draw calls) and walk the graph
            (window as unknown as Record<string, unknown>).__x1dbg = { scene, gl };
          }}
        >
          {/* single key light → a real lit/dark terminator on the globe; the
              fresnel atmosphere + cool fills keep the night limb alive instead
              of a dead-black edge */}
          <ambientLight intensity={0.15} color="#8ea3c4" />
          {/* hemisphere fill (DESIGN.md "cool fill from space"): starlit blue
              from above, near-black ocean bounce from below — gives the
              shadowed hemisphere a living gradient instead of a void */}
          <hemisphereLight args={["#2c4a8f", "#050810", 0.35]} />
          <directionalLight
            position={[5, 8, 4]}
            intensity={2.1}
            color="#dbe6ff"
            castShadow={!LOW_GPU}
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-6, -2, -4]} intensity={0.4} color="#3b82f6" />

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

          {/* post: bloom + vignette everywhere; film grain + lens fringing on
              desktop only (two extra full-screen passes phones don't need).
              Bloom threshold sits BELOW the mid-range emissives (landmark
              beacons 0.4–0.9, blade glints 0.8) — at the old 0.9 only eyes
              and coins glowed and the whole world read matte. Dialed back
              from an earlier harsher pass so the stack reads as a soft
              premium glow rather than a heavy filter (DESIGN.md). */}
          <EffectComposer multisampling={LOW_GPU ? 0 : 8}>
            <Bloom
              intensity={0.45}
              luminanceThreshold={0.82}
              luminanceSmoothing={0.75}
              radius={0.85}
              mipmapBlur
            />
            <Vignette offset={0.3} darkness={0.5} />
            {LOW_GPU ? (
              <></>
            ) : (
              <>
                {/* the "shot on a lens" pair from DESIGN.md: subtle film grain
                    (premultiplied screen = grain rides the LIT pixels; pure
                    black space stays pure black, no gray haze) + radial
                    chromatic fringing pinned to the frame's rim */}
                <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.2} />
                <ChromaticAberration
                  offset={CA_OFFSET}
                  radialModulation
                  modulationOffset={0.18}
                />
              </>
            )}
          </EffectComposer>
        </Canvas>
        <Overlay />
      </div>

      {/* right screen — the console */}
      <div className={immersive ? "contents max-md:hidden" : "contents"}>
        <SidePanel />
      </div>
    </div>
    </MotionConfig>
  );
}
