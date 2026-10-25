// Draws a dressed course's trackside dressing (M7c) at the spots trackside-spots.js picks: red arrow boards on the
// walls round corners, flag poles with lamps along the straights, and the start gate over the line, a blue arch
// with a checkered banner and a row of lamps. The lamps are switched off (glass lit by the sun): lit lamps in
// daylight looked odd on the M7c device run. Used by host/games/kart-3d/seaside-scenery.js.

import * as THREE from 'three';
import { boardSpots, poleSpots, startGateIndex } from './trackside-spots.js';
import { at, mergeShapes } from './shape-utils.js';
import { frameAt } from './kit/frames.js';
import { createArrowTexture, createCheckerTexture } from './textures.js';

// Matches track-mesh.js's walls: boards and poles stand on top of them.
const WALL_HEIGHT = 1.2;
const POLE_HEIGHT = 5;
const GATE_HEIGHT = 8;
const FLAG_HEXES = [0xe8402f, 0xffd23f, 0x2f7fe8, 0x3fbf4f, 0xff8c1a, 0xf4f4f4];
const LAMP_GLASS = { color: 0xfff4dc, roughness: 0.15 };

// Adds everything to `world`; `keep(thing)` registers what must be disposed with it.
export function buildTrackside(world, track, keep) {
  const lampSpots = [];
  world.add(...createBoards(track, keep), ...createPoles(track, keep, lampSpots), ...createGate(track, keep, lampSpots));
  const lamps = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.25, 10, 8)), keep(new THREE.MeshStandardMaterial(LAMP_GLASS)), lampSpots.length);
  lampSpots.forEach((matrix, index) => lamps.setMatrixAt(index, matrix));
  world.add(lamps);
}

// Facing back down the road toward the karts coming, turned a little toward the road's middle.
function facingKarts(station, side) {
  const back = new THREE.Vector3(-station.tangent.x, -station.tangent.y, -station.tangent.z);
  return back.addScaledVector(new THREE.Vector3(station.right.x, station.right.y, station.right.z), -side * 0.8);
}

// Two instanced meshes: boards for right turns (arrows pointing right) and for left turns.
function createBoards(track, keep) {
  const shape = keep(new THREE.PlaneGeometry(2.2, 1.1));
  const spots = boardSpots(track);
  return [true, false].map((turnsRight) => {
    const mine = spots.filter((spot) => spot.turnsRight === turnsRight);
    const material = keep(new THREE.MeshStandardMaterial({ map: keep(createArrowTexture(!turnsRight)), roughness: 0.6 }));
    const boards = new THREE.InstancedMesh(shape, material, mine.length);
    mine.forEach((spot, index) => {
      const station = track.stations[spot.index];
      boards.setMatrixAt(index, frameAt(station, spot.lateral, WALL_HEIGHT + 0.65, facingKarts(station, spot.side)));
    });
    boards.castShadow = true;
    return boards;
  });
}

// Poles on the wall with a flag hanging beside each, flags in turn through FLAG_HEXES; a lamp tops each pole.
function createPoles(track, keep, lampSpots) {
  const spots = poleSpots(track);
  const poleShape = keep(at(new THREE.CylinderGeometry(0.08, 0.11, POLE_HEIGHT, 6), 0, POLE_HEIGHT / 2, 0));
  const poles = new THREE.InstancedMesh(poleShape, keep(new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.3, metalness: 0.8 })), spots.length);
  // The flag hangs from near the top, beside the pole in the karts' direction of travel. Its plane holds the
  // road's direction and its normal, so the karts see it go by side on.
  const flagShape = keep(at(new THREE.PlaneGeometry(1.1, 2.3), 0.6, POLE_HEIGHT - 1.5, 0));
  const flags = new THREE.InstancedMesh(flagShape, keep(new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide })), spots.length);
  spots.forEach((spot, index) => {
    const station = track.stations[spot.index];
    // Facing across the road, so the frame's x runs along it.
    const frame = frameAt(station, spot.lateral, WALL_HEIGHT, new THREE.Vector3(station.right.x, station.right.y, station.right.z));
    poles.setMatrixAt(index, frame);
    flags.setMatrixAt(index, frame);
    flags.setColorAt(index, new THREE.Color(FLAG_HEXES[index % FLAG_HEXES.length]));
    lampSpots.push(frame.clone().multiply(new THREE.Matrix4().makeTranslation(0, POLE_HEIGHT, 0)));
  });
  poles.castShadow = true;
  flags.castShadow = true;
  return [poles, flags];
}

// The start gate: a post on each wall and a checkered beam across, with five lamps along the beam's top.
function createGate(track, keep, lampSpots) {
  const station = track.stations[startGateIndex(track)];
  const span = 2 * station.halfWidth;
  const back = new THREE.Vector3(-station.tangent.x, -station.tangent.y, -station.tangent.z);
  const frame = frameAt(station, 0, 0, back);
  const posts = new THREE.Mesh(
    keep(mergeShapes([-1, 1].map((side) => at(new THREE.BoxGeometry(0.9, GATE_HEIGHT, 0.9), side * station.halfWidth, GATE_HEIGHT / 2, 0)))),
    keep(new THREE.MeshStandardMaterial({ color: 0x2f6fd8, roughness: 0.35, metalness: 0.2 })),
  );
  const beam = new THREE.Mesh(
    keep(at(new THREE.BoxGeometry(span + 0.9, 1.6, 0.5), 0, GATE_HEIGHT - 0.8, 0)),
    keep(new THREE.MeshStandardMaterial({ map: keep(createCheckerTexture()), roughness: 0.5 })),
  );
  for (const gatePart of [posts, beam]) {
    gatePart.matrixAutoUpdate = false;
    gatePart.matrix.copy(frame);
    gatePart.castShadow = true;
  }
  for (let lamp = 0; lamp < 5; lamp += 1) {
    const across = ((lamp - 2) / 2) * (station.halfWidth - 2);
    lampSpots.push(frame.clone().multiply(new THREE.Matrix4().makeTranslation(across, GATE_HEIGHT + 0.3, 0)));
  }
  return [posts, beam];
}
