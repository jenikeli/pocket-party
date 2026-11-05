// The kit-shots pieces for the airport's two new track features (M9 task E): glide-panel (a glide ramp's cyan
// panel), spin-post (two posts on the road) and spin-post-hit (one just hit, one not). The viewer's show track has
// no glide and no posts, so these draw on a track of their own, far from it (OFFSET): a start straight with two
// posts, a ramp, a glide gap over the sea, a landing, and a rectangular loop back. Used by pieces.js.

import * as THREE from 'three';
import { buildTrack } from '../games/kart-3d/track-builder.js';
import { pointAt } from '../games/kart-3d/track.js';
import { createKit } from '../games/kart-3d/kit/kit.js';
import { buildKitRoad } from '../games/kart-3d/kit/road.js';
import { buildSpinPosts } from '../games/kart-3d/kit/spin-post.js';

// The track stands this far from the show track, which lies on the other side of the origin.
const OFFSET = new THREE.Vector3(0, 0, -300);
// No photo asphalt here, so the road's own colour shows.
const THEME = { asphalt: 0x6a6e76, edgeLine: 0xf4f4f0, curb: [0xf07a1e, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] };
const FLASH_AGE = 0.05;

const ROAD_PIECES = [
  { straight: 30, walls: 'none' },
  { straight: 14, height: 2.5, linear: true, walls: 'none' },
  { straight: 60, height: -6, linear: true, gap: true, glide: true, halfWidth: 12, walls: 'none' },
  { straight: 30, height: -6, halfWidth: 9, walls: 'none' },
  { straight: 40, height: 0, walls: 'none' },
  { turn: 90, radius: 20, walls: 'none' }, { straight: 10, walls: 'none' }, { turn: 90, radius: 20, walls: 'none' },
  { straight: 174, walls: 'none' },
  { turn: 90, radius: 20, walls: 'none' }, { straight: 10, walls: 'none' }, { turn: 90, radius: 20, walls: 'none' },
];
const SPIN_POSTS = [{ s: 14, lateral: -3 }, { s: 20, lateral: 3 }];

const showTrack = buildTrack({ halfWidth: 9, startLine: 5, scenery: 'airport', dashPanels: [], spinPosts: SPIN_POSTS, pieces: ROAD_PIECES });

// Adds the road and the posts (flashing as `race` says; null: none hit) to the scene, shifted by OFFSET.
function addAirportBit(scene, race) {
  const keep = (thing) => thing;
  const group = new THREE.Group();
  group.position.copy(OFFSET);
  const kit = createKit({ world: group, track: showTrack, keep });
  const road = buildKitRoad(showTrack, THEME, {});
  road.update(0.5);
  group.add(...road.meshes);
  const posts = buildSpinPosts(kit);
  posts.update(0, race);
  group.add(posts.object);
  scene.add(group);
}

// A camera from the show track: [s, lateral, height above the road] for the eye and for the look-at point.
function roadCamera([eyeS, eyeLateral, eyeUp], [lookS, lookLateral, lookUp], fov) {
  const place = (s, lateral, up) => {
    const { position, normal } = pointAt(showTrack, s, lateral);
    return new THREE.Vector3(position.x, position.y, position.z).addScaledVector(new THREE.Vector3(normal.x, normal.y, normal.z), up).add(OFFSET);
  };
  return { position: place(eyeS, eyeLateral, eyeUp), target: place(lookS, lookLateral, lookUp), fov };
}

// `sea: true` puts the race's sea under the glide (viewer.js).
function airportPiece(race, cameras) {
  return {
    road: 'walled',
    sea: true,
    addAfterBake: (scene) => addAirportBit(scene, race),
    camera: (track, view) => roadCamera(...cameras[view]),
  };
}

const GLIDE_CAMERAS = {
  near: [[14, 2, 1.3], [44, 0, 1.5], 42],
  above: [[8, 6, 7], [50, 0, 0], 40],
};
const POST_CAMERAS = {
  near: [[6, 0.5, 1.3], [17, 0, 0.8], 36],
  above: [[2, 5, 6], [17, 0, 0.8], 36],
};
const HIT_RACE = { spinPosts: [{ sinceHit: FLASH_AGE }, { sinceHit: null }] };

export const AIRPORT_E_PIECES = {
  'glide-panel': airportPiece(null, GLIDE_CAMERAS),
  'spin-post': airportPiece(null, POST_CAMERAS),
  'spin-post-hit': airportPiece(HIT_RACE, POST_CAMERAS),
};
