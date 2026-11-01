// The palm made in Blender (M7d4c2 spike): loads assets/models/palm.glb, built by `npm run blender -- palm`
// (tools/blender/palm.py), and stands it beside the road as the kit's props stand. Only the kit-shots page
// uses it, to compare it with our own palm (kit/palm.js); the race does not. Used by pieces.js and viewer.js.

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { spotFrame } from '../games/kart-3d/kit/props.js';
import { placeInstances } from '../games/kart-3d/kit/frames.js';

const MODEL_URL = '/assets/models/palm.glb';
// The two meshes the model must hold (tools/blender/palm.py names them).
const PART_NAMES = ['trunk', 'fronds'];

// Returns a promise of [{ geometry, material }, ...], one for each part, in the model's own coordinates (stands
// on y = 0, leans toward +x, as kit/palm.js's palm). Throws if the model lacks a part.
export async function loadBlenderPalm() {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  gltf.scene.updateMatrixWorld(true);
  return PART_NAMES.map((name) => {
    const mesh = gltf.scene.getObjectByName(name);
    if (!mesh?.isMesh) {
      throw new Error(`${MODEL_URL} has no mesh named "${name}"`);
    }
    // The exporter may leave a transform on the node; baking it in lets the parts be placed like ours.
    return { geometry: mesh.geometry.clone().applyMatrix4(mesh.matrixWorld), material: mesh.material };
  });
}

// Adds the Blender palm at each spot (props.js's spots: { s, side, out, turn }), one instanced mesh per part.
export function addBlenderPalms({ world, track }, parts, spots) {
  const frames = spots.map((spot) => spotFrame(track, spot));
  for (const { geometry, material } of parts) {
    world.add(placeInstances(geometry, material, frames));
  }
}
