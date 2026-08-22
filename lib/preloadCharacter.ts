import { useGLTF } from "@react-three/drei";
import type { CharacterId } from "@/lib/characters";

/** GLB paths keyed by selectable hero — warmed on roster pick. */
const MODEL_BY_CHAR: Partial<Record<CharacterId, string[]>> = {
  jack: ["/models/jack_anim.glb"],
  theo: ["/models/cryptobro.glb", "/models/tophat.glb"],
  capy: ["/models/capybara.glb"],
};

/** Preload rigged hero GLBs when the player picks them on the roster. */
export function preloadCharacterModel(id: CharacterId) {
  for (const url of MODEL_BY_CHAR[id] ?? []) {
    useGLTF.preload(url);
  }
}
