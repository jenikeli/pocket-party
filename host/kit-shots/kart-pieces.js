// The kit-shots pieces for the karts (M7d5), made for every design in KART_DESIGNS, so each design added later gets
// them too: kart-<id> (from in front at kart height, and from behind and above as the chase camera sees it),
// kart-<id>-side (side on, and from behind), kart-<id>-close (the driver's head and shoulders), kart-<id>-antigravity
// (the wheels turned flat, their rims glowing), and karts-lineup (every design side by side). The karts stand on
// the road's middle, drawn by the race's own kart-models.js. Used by pieces.js.

import * as THREE from 'three';
import { createKartModels } from '../games/kart-3d/kart-models.js';
import { KART_DESIGNS } from '../games/kart-3d/karts/kart-designs.js';
import { stationIndexAt } from '../games/kart-3d/track.js';
import { PIECE_S } from './landmark-pieces.js';

// The karts in a lineup stand this far apart across the road.
const LINEUP_GAP = 2.6;

// Where the camera stands (`eye`) and looks (`look`) in the kart's own axes (x its left, y up, z forward), and
// its field of view (degrees, vertical), for each kind of piece and view.
const CAMERAS = {
  kart: {
    near: { eye: [2.7, 1.1, 3.9], look: [0, 0.8, 0], fov: 34 },
    above: { eye: [0, 2.6, -6.2], look: [0, 0.75, 0], fov: 28 },
  },
  side: {
    near: { eye: [5.6, 0.9, 0], look: [0, 0.85, -0.05], fov: 28 },
    above: { eye: [-3.2, 1.9, -3.9], look: [0, 0.8, -0.2], fov: 32 },
  },
  close: {
    near: { eye: [1.1, 1.55, 2.3], look: [0, 1.32, -0.25], fov: 30 },
    above: { eye: [0, 1.45, 2.7], look: [0, 1.35, -0.25], fov: 28 },
  },
  antigravity: {
    near: { eye: [2.9, 0.75, 3.6], look: [0, 0.6, 0], fov: 34 },
    above: { eye: [0, 2.6, -6.2], look: [0, 0.75, 0], fov: 28 },
  },
};

// The kart's axes at PIECE_S, `lateral` units right of the road's middle, facing along the road.
function kartAxes(track, lateral = 0) {
  const station = track.stations[stationIndexAt(track, PIECE_S)];
  const toVector = ({ x, y, z }) => new THREE.Vector3(x, y, z);
  const forward = toVector(station.tangent);
  const up = toVector(station.normal);
  const position = toVector(station.point).addScaledVector(toVector(station.right), lateral);
  return { position, forward, up, left: new THREE.Vector3().crossVectors(up, forward) };
}

// A point given in the kart's axes, in the world.
function kartPoint(axes, [x, y, z]) {
  return axes.position.clone().addScaledVector(axes.left, x).addScaledVector(axes.up, y).addScaledVector(axes.forward, z);
}

// Adds one kart model for each of `designIndexes`, side by side across the road round its middle, standing still
// with its wheels straight; flat and glowing if `antiGravity`.
function addKarts(scene, track, designIndexes, antiGravity) {
  const models = createKartModels(designIndexes.length);
  designIndexes.forEach((designIndex, index) => {
    const axes = kartAxes(track, (index - (designIndexes.length - 1) / 2) * LINEUP_GAP);
    const kart = { grounded: false, wheelTurn: 0, antiGravity };
    // A whole second since the last frame: the wheels have turned all the way flat already.
    models.show(index, kart, { position: axes.position, bodyForward: axes.forward, bodyUp: axes.up }, designIndex, 1);
  });
  scene.add(...models.karts);
}

function cameraFrom(axes, { eye, look, fov }) {
  return { position: kartPoint(axes, eye), target: kartPoint(axes, look), fov };
}

function kartPiece(designIndex, cameras, antiGravity = false) {
  return {
    road: 'walled',
    addAfterBake: (scene, track) => addKarts(scene, track, [designIndex], antiGravity),
    camera: (track, view) => cameraFrom(kartAxes(track), cameras[view]),
  };
}

// Every design in a row, seen from in front and from behind, far enough back for the whole row.
const LINEUP = {
  road: 'walled',
  addAfterBake: (scene, track) => addKarts(scene, track, KART_DESIGNS.map((design, index) => index), false),
  camera(track, view) {
    const width = KART_DESIGNS.length * LINEUP_GAP;
    const back = 3 + width * 0.9;
    const eye = view === 'near' ? [0, 1.4, back] : [0, 2.2 + width * 0.25, -back];
    return cameraFrom(kartAxes(track), { eye, look: [0, 0.8, 0], fov: 30 });
  },
};

export const KART_PIECES = {
  ...Object.fromEntries(
    KART_DESIGNS.flatMap((design, index) => [
      [`kart-${design.id}`, kartPiece(index, CAMERAS.kart)],
      [`kart-${design.id}-side`, kartPiece(index, CAMERAS.side)],
      [`kart-${design.id}-close`, kartPiece(index, CAMERAS.close)],
      [`kart-${design.id}-antigravity`, kartPiece(index, CAMERAS.antigravity, true)],
    ]),
  ),
  'karts-lineup': LINEUP,
};
