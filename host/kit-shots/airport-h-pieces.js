// The kit-shots pieces for the airport's hangars (M9 task H). The big hangar stands over the anti-gravity ring of
// Palm Bay Airport's own track (built here, so these do not need the course in the course list), with the road,
// its walls and spin posts as the stand-in scenery draws them, on a plain concrete ground: hangar-big (outside,
// coming in to its doors; and from the air), hangar-big-640, -700 and -760 (the chase camera's view at those
// distances; and a higher view across the ring), and hangar-big-inside (across the infield; and up into the
// roof). The small hangars stand on their own ground: hangar (one) and hangars (one per airline in a row).
// All stand far from the show track (OFFSET). Used by pieces.js.

import * as THREE from 'three';
import { buildTrack } from '../games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../games/kart-3d/palm-bay-airport.js';
import { stationIndexAt } from '../games/kart-3d/track.js';
import { createKit, kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS } from '../games/kart-3d/kit/layout-rules.js';
import { buildKitRoad } from '../games/kart-3d/kit/road.js';
import { buildBarriers } from '../games/kart-3d/kit/barriers.js';
import { buildSpinPosts } from '../games/kart-3d/kit/spin-post.js';
import { buildBigHangar } from '../games/kart-3d/kit/hangar-big.js';
import { buildHangar } from '../games/kart-3d/kit/hangar.js';
import { tuning } from '../games/kart-3d/tuning.js';

const OFFSET = new THREE.Vector3(0, 0, -1200);
// As the stand-in scenery's road (airport-scenery.js), with no photo asphalt.
const THEME = { asphalt: 0x6a6e76, edgeLine: 0xf4f4f0, curb: [0xf07a1e, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] };
const RING = { fromS: 654, toS: 771 };
const airportTrack = buildTrack(PALM_BAY_AIRPORT);
const keep = (thing) => thing;

function addGround(group, x, z, size) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: 0xbdb9b0, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(x, -0.04, z);
  ground.receiveShadow = true;
  group.add(ground);
}

// `landmark` placed at `spot` ({ x, y, z, heading }), as the dressing's placeLandmark will.
function place(group, landmark, { x, y, z, heading }) {
  landmark.object.position.set(x, y, z);
  landmark.object.rotation.y = heading;
  group.add(landmark.object);
}

let ringHangar = null;

function addRing(scene) {
  const group = new THREE.Group();
  group.position.copy(OFFSET);
  const kit = createKit({ world: group, track: airportTrack, keep });
  const road = buildKitRoad(airportTrack, THEME, {});
  road.update(0.5);
  group.add(...road.meshes);
  buildBarriers(kitPart(kit, KIT_PARTS.BARRIERS), []);
  const posts = buildSpinPosts(kit);
  posts.update(0, null);
  group.add(posts.object);
  ringHangar = buildBigHangar(kit, RING);
  place(group, ringHangar, ringHangar.spot);
  addGround(group, ringHangar.spot.x, ringHangar.spot.z, 500);
  scene.add(group);
}

const toVector = ({ x, y, z }) => new THREE.Vector3(x, y, z);

// The chase camera's spot at `s` on the airport track (behind and above the road along its normal), looking ahead.
function chase(s) {
  const station = airportTrack.stations[stationIndexAt(airportTrack, s)];
  const [point, tangent, normal] = [toVector(station.point), toVector(station.tangent), toVector(station.normal)];
  const position = point.clone().addScaledVector(tangent, -tuning.cameraBehind).addScaledVector(normal, tuning.cameraAbove).add(OFFSET);
  const target = point.clone().addScaledVector(tangent, 20).addScaledVector(normal, 1).add(OFFSET);
  return { position, target, fov: 60 };
}

// A spot given in the big hangar's own frame, in the world (the viewer asks for the camera after addRing).
function inHangar(x, y, z) {
  const { spot } = ringHangar;
  return new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), spot.heading).add(new THREE.Vector3(spot.x, spot.y, spot.z)).add(OFFSET);
}

// Higher over the road at `s`, looking at the hangar's middle across the ring.
function overRing(s) {
  const { position } = chase(s);
  const station = airportTrack.stations[stationIndexAt(airportTrack, s)];
  return { position: position.addScaledVector(toVector(station.normal), 6), target: inHangar(0, 8, 0), fov: 60 };
}

function ringPiece(cameras) {
  return { road: 'walled', addAfterBake: (scene) => addRing(scene), camera: (track, view) => cameras[view]() };
}

const SMALL_SPOT = new THREE.Vector3(400, 0, -500);
const SMALL_ROW = [
  { airline: 'Palm Air', width: 22, depth: 18 },
  { airline: 'Coral Wings', width: 26, depth: 22 },
  { airline: 'Skipjack Air', width: 20, depth: 16 },
];

// Hangars side by side along z, doors facing +x, 6 apart, round SMALL_SPOT.
function addSmallHangars(scene, row) {
  const group = new THREE.Group();
  group.position.copy(SMALL_SPOT);
  const kit = createKit({ world: group, track: airportTrack, keep });
  const span = row.reduce((sum, { width }) => sum + width, 0) + 6 * (row.length - 1);
  let z = -span / 2;
  for (const { airline, width, depth } of row) {
    place(group, buildHangar(kit, { width, depth, airline }), { x: 0, y: 0, z: z + width / 2, heading: 0 });
    z += width + 6;
  }
  addGround(group, 0, 0, 300);
  scene.add(group);
}

function smallPiece(row, reach) {
  const cameras = {
    near: () => ({ position: SMALL_SPOT.clone().add(new THREE.Vector3(reach * 1.3, 1.2, reach * 0.9)), target: SMALL_SPOT.clone().add(new THREE.Vector3(0, 4, 0)), fov: 45 }),
    above: () => ({ position: SMALL_SPOT.clone().add(new THREE.Vector3(reach * 1.6, reach * 1.1, -reach * 0.7)), target: SMALL_SPOT.clone(), fov: 45 }),
  };
  return { road: 'walled', addAfterBake: (scene) => addSmallHangars(scene, row), camera: (track, view) => cameras[view]() };
}

export const AIRPORT_H_PIECES = {
  'hangar-big': ringPiece({
    near: () => chase(626),
    above: () => ({ position: inHangar(110, 70, -100), target: inHangar(0, 10, 0), fov: 50 }),
  }),
  'hangar-big-640': ringPiece({ near: () => chase(640), above: () => overRing(640) }),
  'hangar-big-700': ringPiece({ near: () => chase(700), above: () => overRing(700) }),
  'hangar-big-760': ringPiece({ near: () => chase(760), above: () => overRing(760) }),
  'hangar-big-inside': ringPiece({
    near: () => ({ position: inHangar(12, 1.6, 0), target: inHangar(-20, 8, 0), fov: 60 }),
    above: () => ({ position: inHangar(10, 4, -6), target: inHangar(-4, 30, 4), fov: 70 }),
  }),
  hangar: smallPiece([{ airline: 'Coral Wings', width: 24, depth: 20 }], 30),
  hangars: smallPiece(SMALL_ROW, 55),
};
