// The kit-shots pieces for the airport's planes (M9): an airliner in each livery
// (airliner, airliner-coral, airliner-skipjack) side on to the road as the karts see it, airliner-nose (its nose,
// emblem, front door and gear), airliner-gate (parked at the terminal's middle jet bridge, its front door at the
// bridge's cab), prop-plane, and take-off-plane (lifting off over the road, seen from a kart's eye looking back
// down the runway). Each stands on a pale apron slab left of the straight, with cameras placed in a frame whose
// x points at the road and z runs along it. Used by pieces.js.

import * as THREE from 'three';
import { spotFrame } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS } from '../games/kart-3d/kit/layout-rules.js';
import { buildAirliner, AIRLINER_DOOR } from '../games/kart-3d/kit/airliner.js';
import { buildPropPlane } from '../games/kart-3d/kit/prop-plane.js';
import { buildTakeOffPlane, createTakeOffPath, takeOffTimeAt } from '../games/kart-3d/kit/take-off-plane.js';
import { buildTerminal, terminalGates } from '../games/kart-3d/kit/terminal.js';
import { projectUv } from '../games/kart-3d/kit/terminal-uv.js';
import { PIECE_S } from './landmark-pieces.js';

// A plane turned this way (about y) shows its right side to the road and its left, with the door, away.
const SIDE_ON = Math.PI / 2;
const TERMINAL_LENGTH = 160;
// The take-off plane's runway in the frame: along z over the road's middle, from `from` to its lift-off at `to`,
// both ahead of the camera, which sees it `seen` units past its lift-off, flying toward it.
const TAKE_OFF = { roadX: 12, from: 360, to: 160, seen: 135, height: 12 };

// The frame `out` past the road's left edge at PIECE_S, its +x toward the road.
const frameOf = (track, out) => spotFrame(track, { s: PIECE_S, side: 'left', out, turn: -90 });

// Adds `objects` (each placed in the frame) on an apron slab reaching from the road `out` away to `back` behind
// the frame's origin and `half` either way along it.
function standOnApron(kit, out, objects, { back = 40, half = 60 } = {}) {
  const surroundings = kitPart(kit, KIT_PARTS.SURROUNDINGS);
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  holder.matrix.copy(frameOf(kit.track, out));
  const slab = new THREE.PlaneGeometry(back + out, 2 * half).rotateX(-Math.PI / 2).translate((out - back) / 2, -0.03, 0);
  const apron = new THREE.Mesh(projectUv(slab, 8), new THREE.MeshStandardMaterial({ color: 0xd8d6d0, map: kit.textures.concrete, normalMap: kit.textures.concreteRelief, roughness: 0.85 }));
  apron.receiveShadow = true;
  holder.add(apron, ...objects);
  surroundings.world.add(holder);
}

function placed(object, x, z, turn) {
  object.position.set(x, 0, z);
  object.rotation.y = turn;
  return object;
}

// A camera given in the frame: `views` is { near, above }, each { from, to, fov }.
function cameraFrom(out, views) {
  return (track, view) => {
    const frame = frameOf(track, out);
    const { from, to, fov } = views[view];
    return { position: new THREE.Vector3(...from).applyMatrix4(frame), target: new THREE.Vector3(...to).applyMatrix4(frame), fov };
  };
}

const AIRLINER_OUT = 30;
function airlinerPiece(livery, views) {
  return {
    road: 'walled',
    build: (kit) => standOnApron(kit, AIRLINER_OUT, [placed(buildAirliner(kit, { livery }).object, 0, 0, SIDE_ON)]),
    camera: cameraFrom(AIRLINER_OUT, views),
  };
}

const SIDE_VIEWS = {
  near: { from: [AIRLINER_OUT - 3, 1.2, 30], to: [0, 6, -2], fov: 55 },
  above: { from: [58, 34, 44], to: [0, 4, 0], fov: 45 },
};

// The airliner at the terminal's middle gate: turned side on, its door (AIRLINER_DOOR, facing -z in its own
// frame, so -x once turned) moved onto the bridge's door.
const GATE_OUT = 52;
function buildGate(kit) {
  const gate = terminalGates(TERMINAL_LENGTH)[1];
  const door = new THREE.Vector3(AIRLINER_DOOR.x, AIRLINER_DOOR.y, AIRLINER_DOOR.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), SIDE_ON);
  const plane = placed(buildAirliner(kit, { livery: 'coral-wings' }).object, gate.x - door.x, gate.z - door.z, SIDE_ON);
  standOnApron(kit, GATE_OUT, [buildTerminal(kit, { length: TERMINAL_LENGTH }).object, plane], { back: 60, half: 120 });
}

// The take-off plane flying low over the road toward the camera, posed at that moment.
function buildTakeOff(kit) {
  const frame = frameOf(kit.track, 0);
  const point = (z) => new THREE.Vector3(TAKE_OFF.roadX, 0, z).applyMatrix4(frame);
  const runway = { from: point(TAKE_OFF.from), to: point(TAKE_OFF.to), height: TAKE_OFF.height };
  const plane = buildTakeOffPlane(kit, runway);
  plane.update(takeOffTimeAt(createTakeOffPath(runway), TAKE_OFF.seen));
  kitPart(kit, KIT_PARTS.SURROUNDINGS).world.add(plane.object);
}

export const AIRPORT_I_PIECES = {
  airliner: airlinerPiece('palm-air', SIDE_VIEWS),
  'airliner-coral': airlinerPiece('coral-wings', SIDE_VIEWS),
  'airliner-skipjack': airlinerPiece('skipjack-air', SIDE_VIEWS),
  'airliner-nose': airlinerPiece('palm-air', {
    near: { from: [-12, 2.2, -27], to: [-1, 3.5, -15], fov: 55 },
    above: { from: [16, 9, -34], to: [0, 3.5, -16], fov: 50 },
  }),
  'airliner-gate': {
    road: 'walled',
    build: buildGate,
    camera: cameraFrom(GATE_OUT, {
      near: { from: [GATE_OUT - 3, 1.2, 36], to: [18, 6, 0], fov: 60 },
      above: { from: [70, 45, -40], to: [15, 3, 8], fov: 50 },
    }),
  },
  'prop-plane': {
    road: 'walled',
    build: (kit) => standOnApron(kit, 12, [placed(buildPropPlane(kit).object, 0, 0, SIDE_ON)], { back: 20, half: 30 }),
    camera: cameraFrom(12, {
      near: { from: [9, 1.2, 13], to: [0, 2.4, 0], fov: 50 },
      above: { from: [22, 13, 15], to: [0, 2, 0], fov: 45 },
    }),
  },
  'take-off-plane': {
    road: 'walled',
    build: buildTakeOff,
    camera: cameraFrom(0, {
      near: { from: [TAKE_OFF.roadX - 3, 1.2, 0], to: [TAKE_OFF.roadX, 9, 30], fov: 60 },
      above: { from: [TAKE_OFF.roadX + 45, 14, -10], to: [TAKE_OFF.roadX, 10, 30], fov: 50 },
    }),
  },
};
