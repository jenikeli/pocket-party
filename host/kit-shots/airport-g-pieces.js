// The kit-shots pieces for the airport's terminal and control tower (M9, docs/queue.md's task G): terminal (the
// whole building from the apron at kart height, and from above as a glider sees it), terminal-close (a jet
// bridge and the hall's glass), control-tower and control-tower-cab. Each stands on a pale apron slab left of the
// straight, facing the road, with cameras placed in the landmark's own frame (x toward the road, z along it), on
// the apron between it and the road's wall. Used by pieces.js.

import * as THREE from 'three';
import { spotFrame } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS } from '../games/kart-3d/kit/layout-rules.js';
import { buildTerminal } from '../games/kart-3d/kit/terminal.js';
import { buildControlTower } from '../games/kart-3d/kit/control-tower.js';
import { projectUv } from '../games/kart-3d/kit/terminal-uv.js';
import { PIECE_S } from './landmark-pieces.js';

const TERMINAL_LENGTH = 160;
// How far out from the road's edge each landmark's origin stands (the terminal's glass, the tower's middle).
const TERMINAL_OUT = 34;
const TOWER_OUT = 24;
// The apron slab round a landmark, in its frame: from x = -APRON[0] to the road, and APRON[1] either way along z.
const APRON = [60, 120];

// The landmark's frame, `out` past the left edge at PIECE_S, its +x toward the road (a spot faces the road along
// its +z, so it turns a quarter).
const frameOf = (track, out) => spotFrame(track, { s: PIECE_S, side: 'left', out, turn: -90 });

// Adds `landmark` ({ object }) at `out`, on its apron slab.
function standLandmark(kit, landmark, out) {
  const surroundings = kitPart(kit, KIT_PARTS.SURROUNDINGS);
  const frame = frameOf(kit.track, out);
  const slab = new THREE.PlaneGeometry(APRON[0] + out, 2 * APRON[1]).rotateX(-Math.PI / 2).translate((out - APRON[0]) / 2, -0.03, 0);
  const apron = new THREE.Mesh(projectUv(slab, 8), new THREE.MeshStandardMaterial({ color: 0xd8d6d0, map: kit.textures.concrete, normalMap: kit.textures.concreteRelief, roughness: 0.85 }));
  apron.receiveShadow = true;
  for (const object of [apron, landmark.object]) {
    object.matrixAutoUpdate = false;
    object.matrix.copy(frame);
    surroundings.world.add(object);
  }
}

// A camera given in the landmark's frame: `views` is { near, above }, each { from, to, fov } ([x, y, z] in the
// frame); returns pieces.js's camera(track, view).
function cameraFrom(out, views) {
  return (track, view) => {
    const frame = frameOf(track, out);
    const { from, to, fov } = views[view];
    return { position: new THREE.Vector3(...from).applyMatrix4(frame), target: new THREE.Vector3(...to).applyMatrix4(frame), fov };
  };
}

function landmarkPiece(build, out, views) {
  return { road: 'walled', build: (kit) => standLandmark(kit, build(kit), out), camera: cameraFrom(out, views) };
}

const buildTerminalPiece = (kit) => buildTerminal(kit, { length: TERMINAL_LENGTH });

export const AIRPORT_G_PIECES = {
  terminal: landmarkPiece(buildTerminalPiece, TERMINAL_OUT, {
    near: { from: [31, 1.5, -104], to: [0, 9, -40], fov: 55 },
    above: { from: [105, 62, -95], to: [-6, 4, 0], fov: 45 },
  }),
  'terminal-close': landmarkPiece(buildTerminalPiece, TERMINAL_OUT, {
    near: { from: [30, 1.5, -14], to: [6, 6, 6], fov: 60 },
    above: { from: [34, 26, -28], to: [0, 14, 0], fov: 50 },
  }),
  'control-tower': landmarkPiece(buildControlTower, TOWER_OUT, {
    near: { from: [22, 1.5, -26], to: [0, 20, 0], fov: 60 },
    above: { from: [55, 48, -48], to: [0, 24, 0], fov: 45 },
  }),
  'control-tower-cab': landmarkPiece(buildControlTower, TOWER_OUT, {
    near: { from: [13, 33.5, -9], to: [0, 34, 0], fov: 55 },
    above: { from: [15, 46, -12], to: [0, 35, 0], fov: 50 },
  }),
};
