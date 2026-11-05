// The kit-shots pieces for the karts (M7d5), made for every design in KART_DESIGNS, so each design added later gets
// them too: kart-<id> (from in front at kart height, and from behind and above as the chase camera sees it),
// kart-<id>-side (side on, and from behind), kart-<id>-close (the driver's head and shoulders), kart-<id>-antigravity
// (the wheels turned flat, their rims glowing), and karts-lineup (every design side by side). The karts stand on
// the road's middle, drawn by the race's own kart-models.js. Since M9 kart-<id>-glide (the kart in the air, its
// glider open, from in front and as the glide's chase camera sees it) and gliders-lineup (every design gliding,
// banked from one side to the other across the row). Used by pieces.js.

import * as THREE from 'three';
import { createKartModels } from '../games/kart-3d/kart-models.js';
import { KART_DESIGNS } from '../games/kart-3d/karts/kart-designs.js';
import { stationIndexAt } from '../games/kart-3d/track.js';
import { PIECE_S } from './landmark-pieces.js';

// The karts in a lineup stand this far apart across the road.
const LINEUP_GAP = 2.6;
// Gliding, a kart flies this high over the road. In the gliders' lineup the karts stand GLIDER_GAP apart, every
// other one higher, so their wide wings pass over and under each other, and bank up to GLIDER_BANK (radians) one
// way at the left end of the row and the other way at the right (tuning.js's glideBankDegrees at full steer).
const GLIDE_LIFT = 1.6;
const GLIDER_GAP = 3.3;
const GLIDER_STAGGER = 0.9;
const GLIDER_BANK = (25 * Math.PI) / 180;

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
  // Above: the chase camera's spot, lifted and pulled back as while gliding (tuning.js's glideCameraLift and
  // glideCameraPullBack).
  glide: {
    near: { eye: [3.4, 0.9, 5.2], look: [0, 1.3, -0.1], fov: 40 },
    above: { eye: [0, 4.1, -8.2], look: [0, 1.5, 0], fov: 34 },
  },
};

// The kart's axes at PIECE_S, `lateral` units right of the road's middle and `lift` above it, facing along the
// road.
function kartAxes(track, lateral = 0, lift = 0) {
  const station = track.stations[stationIndexAt(track, PIECE_S)];
  const toVector = ({ x, y, z }) => new THREE.Vector3(x, y, z);
  const forward = toVector(station.tangent);
  const up = toVector(station.normal);
  const position = toVector(station.point).addScaledVector(toVector(station.right), lateral).addScaledVector(up, lift);
  return { position, forward, up, left: new THREE.Vector3().crossVectors(up, forward) };
}

// A point given in the kart's axes, in the world.
function kartPoint(axes, [x, y, z]) {
  return axes.position.clone().addScaledVector(axes.left, x).addScaledVector(axes.up, y).addScaledVector(axes.forward, z);
}

// Adds one kart model for each of `designIndexes`, side by side across the road round its middle, standing still
// with its wheels straight; flat and glowing if `antiGravity`. If `gliding`, they fly with their gliders open,
// a row of them staggered in height and banked across it.
function addKarts(scene, track, designIndexes, { antiGravity = false, gliding = false } = {}) {
  const models = createKartModels(designIndexes.length);
  const middle = (designIndexes.length - 1) / 2;
  designIndexes.forEach((designIndex, index) => {
    const lateral = (index - middle) * (gliding ? GLIDER_GAP : LINEUP_GAP);
    const lift = gliding ? GLIDE_LIFT + (index % 2) * GLIDER_STAGGER : 0;
    const axes = kartAxes(track, lateral, lift);
    const bank = middle > 0 && gliding ? ((index - middle) / middle) * GLIDER_BANK : 0;
    const kart = { grounded: false, wheelTurn: 0, antiGravity, gliding };
    const bodyUp = axes.up.clone().applyAxisAngle(axes.forward, bank);
    // A whole second since the last frame: the wheels have turned all the way flat and the glider opened already.
    models.show(index, kart, { position: axes.position, bodyForward: axes.forward, bodyUp }, designIndex, 1);
  });
  scene.add(...models.karts);
}

function cameraFrom(axes, { eye, look, fov }) {
  return { position: kartPoint(axes, eye), target: kartPoint(axes, look), fov };
}

// `state` is { antiGravity, gliding } (addKarts's).
function kartPiece(designIndex, cameras, state = {}) {
  const lift = state.gliding ? GLIDE_LIFT : 0;
  return {
    road: 'walled',
    addAfterBake: (scene, track) => addKarts(scene, track, [designIndex], state),
    camera: (track, view) => cameraFrom(kartAxes(track, 0, lift), cameras[view]),
  };
}

// Every design in a row, seen from in front and from behind, far enough back for the whole row.
const LINEUP = {
  road: 'walled',
  addAfterBake: (scene, track) => addKarts(scene, track, KART_DESIGNS.map((design, index) => index)),
  camera(track, view) {
    const width = KART_DESIGNS.length * LINEUP_GAP;
    const back = 3 + width * 0.9;
    const eye = view === 'near' ? [0, 1.4, back] : [0, 2.2 + width * 0.25, -back];
    return cameraFrom(kartAxes(track), { eye, look: [0, 0.8, 0], fov: 30 });
  },
};

// Every design gliding in a row, seen from in front and below, and from behind and above.
const GLIDERS_LINEUP = {
  road: 'walled',
  addAfterBake: (scene, track) => addKarts(scene, track, KART_DESIGNS.map((design, index) => index), { gliding: true }),
  camera(track, view) {
    const width = KART_DESIGNS.length * GLIDER_GAP;
    const back = 3 + width * 1.15;
    const eye = view === 'near' ? [0, 1.2, back] : [0, 3 + width * 0.3, -back];
    return cameraFrom(kartAxes(track, 0, GLIDE_LIFT), { eye, look: [0, 1.4, 0], fov: 30 });
  },
};

export const KART_PIECES = {
  ...Object.fromEntries(
    KART_DESIGNS.flatMap((design, index) => [
      [`kart-${design.id}`, kartPiece(index, CAMERAS.kart)],
      [`kart-${design.id}-side`, kartPiece(index, CAMERAS.side)],
      [`kart-${design.id}-close`, kartPiece(index, CAMERAS.close)],
      [`kart-${design.id}-antigravity`, kartPiece(index, CAMERAS.antigravity, { antiGravity: true })],
      [`kart-${design.id}-glide`, kartPiece(index, CAMERAS.glide, { gliding: true })],
    ]),
  ),
  'karts-lineup': LINEUP,
  'gliders-lineup': GLIDERS_LINEUP,
};
