// The kit-shots pieces for the bay's rocky islands (M9, docs/queue.md's task L): rock-island-stack,
// rock-island-mesa and rock-island-karst (seeds 1, 2 and 3, one of each kind) in the sea off the straight, seen
// from the road's edge at kart height and from above as a glider sees them; rock-island-close, the stack's cliff
// from near the water and its grass lip from above, to judge them up close; and rock-islands, three more seeds
// farther off, as the bay's background. Each island's beach faces the road; cameras are placed in the island's own
// frame (x toward the road, z along it, y up from the sea). Used by pieces.js.

import * as THREE from 'three';
import { spotFrame } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS } from '../games/kart-3d/kit/layout-rules.js';
import { buildRockIsland } from '../games/kart-3d/kit/rock-island.js';
import { PIECE_S, SEA_DROP } from './landmark-pieces.js';

const SIZE = 22;
// How far out from the road's edge an island's middle stands.
const OUT = 50;
// The far islands of rock-islands: [seed, size, out, along the road].
const BAY = [[4, 26, 150, -70], [5, 30, 120, 40], [6, 24, 210, -10]];

// The frame of an island `out` past the right edge, `along` the road from PIECE_S, at the sea's level, its +x
// toward the road (a spot faces the road along its +z, so it turns a quarter).
function frameOf(track, seaLevel, out, along = 0) {
  const frame = spotFrame(track, { s: PIECE_S + along, side: 'right', out, turn: -90 });
  const position = new THREE.Vector3().setFromMatrixPosition(frame);
  return frame.setPosition(position.x, seaLevel, position.z);
}

function addIsland(kit, seaLevel, { seed, size, out, along }) {
  const island = buildRockIsland(kit, { seed, size });
  island.object.matrixAutoUpdate = false;
  island.object.matrix.copy(frameOf(kit.track, seaLevel, out, along));
  kitPart(kit, KIT_PARTS.SURROUNDINGS).world.add(island.object);
}

// The road's straight lies SEA_DROP above the sea. `views` is { near, above }, each { from, to, fov } in the first
// island's frame ([x, y, z]); returns pieces.js's camera(track, view).
function cameraFrom(out, views) {
  return (track, view) => {
    const frame = frameOf(track, track.stations[0].point.y - SEA_DROP, out);
    const { from, to, fov } = views[view];
    return { position: new THREE.Vector3(...from).applyMatrix4(frame), target: new THREE.Vector3(...to).applyMatrix4(frame), fov };
  };
}

function islandPiece(islands, views) {
  return {
    road: 'walled',
    sea: true,
    build: (kit, seaLevel) => islands.forEach((island) => addIsland(kit, seaLevel, island)),
    camera: cameraFrom(islands[0].out, views),
  };
}

// From the road's edge at a kart's eye, and from a glider's height farther back.
const ISLAND_VIEWS = {
  near: { from: [OUT - 1, SEA_DROP + 1.2, -38], to: [0, SIZE * 0.45, 0], fov: 50 },
  above: { from: [OUT + 25, SEA_DROP + 26, -55], to: [0, SIZE * 0.3, 0], fov: 45 },
};

const single = (seed) => islandPiece([{ seed, size: SIZE, out: OUT, along: 0 }], ISLAND_VIEWS);

export const AIRPORT_L_PIECES = {
  'rock-island-stack': single(1),
  'rock-island-mesa': single(2),
  'rock-island-karst': single(3),
  'rock-island-close': islandPiece([{ seed: 1, size: SIZE, out: OUT, along: 0 }], {
    near: { from: [SIZE * 0.95, 2, -SIZE * 0.55], to: [0, SIZE * 0.5, 0], fov: 60 },
    above: { from: [SIZE * 0.75, SIZE * 1.6, -SIZE * 0.65], to: [SIZE * 0.15, SIZE * 1.2, 0], fov: 55 },
  }),
  'rock-islands': islandPiece(BAY.map(([seed, size, out, along]) => ({ seed, size, out, along })), {
    near: { from: [BAY[0][2] - 1, SEA_DROP + 1.2, -150], to: [0, 10, 60], fov: 50 },
    above: { from: [BAY[0][2] + 20, SEA_DROP + 30, -170], to: [-20, 5, 60], fov: 50 },
  }),
};
