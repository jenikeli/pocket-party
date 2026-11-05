// Draws everything the items add to the 3D race (M8): one drawing per kind of thing, each made with the scene and
// the shared bursts (burst-look.js: shards, sparkles, smoke) and each of the same shape, { update(race, track,
// poses, dt), dispose() }, called in turn every frame. A new kind of item look is one import and one entry in
// DRAWINGS. Used by renderer.js, which makes it, updates it every frame after placing the karts, and disposes it.

import { createBursts } from './burst-look.js';
import { createBoxDrawing } from './item-box-look.js';
import { createRoadObjectDrawing } from './road-object-drawing.js';
import { createMagnetDrawing } from './magnet-look.js';
import { createJumpDrawing } from './jump-look.js';
import { createPushDrawing } from './push-look.js';
import { createTeleportDrawing } from './teleport-look.js';
import { createStickyWallsDrawing } from './sticky-walls-look.js';

const DRAWINGS = [createBoxDrawing, createRoadObjectDrawing, createJumpDrawing, createMagnetDrawing,
  createPushDrawing, createTeleportDrawing, createStickyWallsDrawing];

// Returns { update(race, track, poses, dt), dispose() }: `race` is null on the setup screen (nothing is drawn but
// bursts still flying), `poses` the karts' poses this frame in the order of race.karts (race-views.js kartPose),
// `dt` the real time since the last drawn frame in seconds.
export function createItemDrawing(scene) {
  const bursts = createBursts(scene);
  const drawings = DRAWINGS.map((createDrawing) => createDrawing(scene, bursts));

  function update(race, track, poses, dt) {
    drawings.forEach((drawing) => drawing.update(race, track, poses, dt));
    bursts.update(dt);
  }

  function dispose() {
    drawings.forEach((drawing) => drawing.dispose());
    bursts.dispose();
  }

  return { update, dispose };
}
