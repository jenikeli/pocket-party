// The kit-shots pieces for the seaside course's decks, supports and what stands in its sea and sky (M7d4c3):
// the four decks, trusses and piers, the lighthouse, stilt hut, Koopa shell, beach island, floating island,
// backdrop cliff, sailboat, motor yacht (M7d4d), cloud, balloon and airship. Same shape as pieces.js's entries, plus `sea: true` for the
// pieces that need the race's sea under them (viewer.js adds it, SEA_DROP below the road) and build(kit,
// seaLevel). Sea and sky pieces stand beside the road, `out` past its edge (the road is 'walled', so no ground
// beside it), facing the road. Used by pieces.js.

import * as THREE from 'three';
import { spotFrame } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS } from '../games/kart-3d/kit/layout-rules.js';
import { buildPlatforms } from '../games/kart-3d/kit/platform.js';
import { buildSupports } from '../games/kart-3d/kit/supports.js';
import { buildPalmParts } from '../games/kart-3d/kit/palm.js';
import { buildLighthouse } from '../games/kart-3d/kit/lighthouse.js';
import { buildStiltHut } from '../games/kart-3d/kit/stilt-hut.js';
import { buildKoopaShell } from '../games/kart-3d/kit/koopa-shell.js';
import { buildSailboat } from '../games/kart-3d/kit/sailboat.js';
import { buildMotorYacht } from '../games/kart-3d/kit/motor-yacht.js';
import { buildBeachIslands } from '../games/kart-3d/kit/beach-island.js';
import { buildFloatingIslands, buildBackdropCliffs } from '../games/kart-3d/kit/floating-island.js';
import { buildRoundTree } from '../games/kart-3d/kit/round-tree.js';
import { buildCloud } from '../games/kart-3d/kit/clouds.js';
import { buildBalloon } from '../games/kart-3d/kit/balloon.js';
import { buildAirship } from '../games/kart-3d/kit/airship.js';
import { addIslands, addInstances } from '../games/kart-3d/seaside-surroundings.js';
import { islandHeightAt, BALLOONS, KOOPA_SHELL } from '../games/kart-3d/seaside-landmarks.js';

// Where the piece stands along the straight (its s); the start line is at 30 (viewer.js's track).
export const PIECE_S = 40;
// The sea lies this far below the road ("a little under": the decks' pillars and the huts' stilts show).
export const SEA_DROP = 8;

// Where a piece stands: `out` past the road's edge, at height `y` (world), facing the road and turned by `turn`
// degrees. Returns a Matrix4.
function standAt(kit, out, y, turn = 0) {
  const frame = spotFrame(kit.track, { s: PIECE_S, side: 'right', out, turn });
  const position = new THREE.Vector3().setFromMatrixPosition(frame);
  return frame.setPosition(position.x, y, position.z);
}

// The world x and z of a matrix's position.
const groundOf = (matrix) => new THREE.Vector3().setFromMatrixPosition(matrix);

// Adds a piece's parts as meshes at `matrix`.
function addParts(kit, parts, matrix) {
  for (const { geometry, material } of parts) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(matrix);
    kit.world.add(mesh);
  }
}

// A piece in the sea or sky: its own build, and where the camera looks (`height` above the road).
function landmark(build, out, height, size, { sea = true, eye } = {}) {
  return { road: 'walled', sea, build, focus: { s: PIECE_S, side: 1, out, height, size, eye } };
}

// The near view's eye a little above the water, for what stands low in the sea.
const NEAR_WATER = -SEA_DROP + 2.5;

// A deck along the right of the straight, as a layout places one (kit/platform.js), tapering at both ends.
function deckPiece(ground) {
  return {
    road: 'walled',
    sea: true,
    build: (kit, seaLevel) => buildPlatforms(kitPart(kit, KIT_PARTS.DECKS), [{ fromS: 4, toS: 58, side: 'right', depth: 9, ground }], seaLevel),
    focus: { s: PIECE_S, side: 1, out: 4, height: 0, size: 6, eye: 3 },
  };
}

// The supports under the straight: piers (no truss runs) or trusses along the whole show track.
function supportsPiece(trussRuns) {
  return {
    road: 'walled',
    sea: true,
    build: (kit, seaLevel) => buildSupports(kitPart(kit, KIT_PARTS.SUPPORTS), seaLevel, trussRuns),
    focus: { s: PIECE_S, side: 1, out: 0, height: -SEA_DROP / 2, size: 6, eye: NEAR_WATER },
  };
}

// The lighthouse on a small rocky island, its door toward the road.
function buildLighthousePiece(kit, seaLevel) {
  const matrix = standAt(kit, 28, seaLevel);
  const { x, z } = groundOf(matrix);
  const island = { x, z, radius: 12, height: 4, palms: 0, huts: 0 };
  addIslands(kit, buildBeachIslands(kit, [island], seaLevel).parts);
  addParts(kit, buildLighthouse(kit, 24), matrix.setPosition(x, seaLevel + islandHeightAt(island, 0), z));
}

// A beach island with its palms, and a hut in its shallows.
function buildBeachIslandPiece(kit, seaLevel) {
  const { x, z } = groundOf(standAt(kit, 34, seaLevel));
  const islands = buildBeachIslands(kit, [{ x, z, radius: 16, height: 5, palms: 5, huts: 1 }], seaLevel);
  addIslands(kit, islands.parts);
  addInstances(kit, buildStiltHut(kit), islands.huts);
  addInstances(kit, buildPalmParts(kit), islands.palms);
}

// A floating island at the road's height with round trees on its top.
function buildFloatingIslandPiece(kit) {
  const { x, z } = groundOf(standAt(kit, 20, 0));
  const island = { x, z, y: -2, radius: 11 };
  addIslands(kit, buildFloatingIslands(kit, [island]));
  const trees = [[0, 0], [4, 1], [-3, 3], [1, -4]].map(([dx, dz], index) => ({ x: x + dx, y: island.y + 0.04 * island.radius, z: z + dz, turn: index * 1.7, size: 1 }));
  addInstances(kit, buildRoundTree(kit), trees);
}

// A cliff off the horizon's size, at half the distance.
function buildBackdropCliffPiece(kit, seaLevel) {
  const { x, z } = groundOf(standAt(kit, 60, seaLevel));
  addIslands(kit, buildBackdropCliffs(kit, [{ x, z, radius: 50, height: 36 }], seaLevel));
}

// The giant shell, half sunk and tipped over as the race has it.
function buildKoopaShellPiece(kit, seaLevel) {
  const [{ geometry, material }] = buildKoopaShell(kit);
  const shell = new THREE.Mesh(geometry, material);
  shell.scale.setScalar(KOOPA_SHELL.radius);
  shell.position.copy(groundOf(standAt(kit, 30, seaLevel))).setY(seaLevel - KOOPA_SHELL.radius * 0.25);
  shell.rotation.set(KOOPA_SHELL.tilt, KOOPA_SHELL.heading, 0, 'YXZ');
  kit.world.add(shell);
}

function buildAirshipPiece(kit) {
  const { x, z } = groundOf(standAt(kit, 24, 0));
  // A circle of no radius: the airship hangs in place, as at the start of its flight.
  kit.world.add(buildAirship(kit, { x, z, radius: 0, height: 8, seconds: 150 }).object);
}

export const LANDMARK_PIECES = {
  'deck-boards': deckPiece('boards'),
  'deck-paving': deckPiece('paving'),
  'deck-grass': deckPiece('grass'),
  'deck-sand': deckPiece('sand'),
  truss: supportsPiece([{ fromS: 0, toS: 1000 }]),
  pier: supportsPiece([]),
  lighthouse: landmark(buildLighthousePiece, 28, 11, 34),
  'stilt-hut': landmark((kit, seaLevel) => addParts(kit, buildStiltHut(kit), standAt(kit, 14, seaLevel)), 14, -SEA_DROP + 3, 6, { eye: NEAR_WATER }),
  'koopa-shell': landmark(buildKoopaShellPiece, 30, -SEA_DROP + 3, 12, { eye: NEAR_WATER }),
  'beach-island': landmark(buildBeachIslandPiece, 34, -SEA_DROP + 4, 24, { eye: NEAR_WATER }),
  'floating-island': landmark(buildFloatingIslandPiece, 20, -6, 28, { sea: false }),
  'backdrop-cliff': landmark(buildBackdropCliffPiece, 60, -SEA_DROP + 18, 100),
  sailboat: landmark((kit, seaLevel) => addParts(kit, buildSailboat(kit), standAt(kit, 12, seaLevel, 70)), 12, -SEA_DROP + 3, 5, { eye: NEAR_WATER }),
  'motor-yacht': landmark((kit, seaLevel) => addParts(kit, buildMotorYacht(kit), standAt(kit, 12, seaLevel, 70)), 12, -SEA_DROP + 3, 8, { eye: NEAR_WATER }),
  cloud: landmark((kit) => addParts(kit, buildCloud(kit), standAt(kit, 24, 3)), 24, 6, 30, { sea: false }),
  balloon: landmark((kit) => addParts(kit, buildBalloon(kit, BALLOONS[0].colors), standAt(kit, 14, 0.5)), 14, 6, 12, { sea: false }),
  airship: landmark(buildAirshipPiece, 24, 8, 30, { sea: false }),
};
