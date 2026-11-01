// M7d4b2's stronger image-based light: the course lit by an environment map taken from the course
// itself, as games light a scene from a light probe. Once the course is built, the scene is drawn in all six
// directions from a point above the start line (sky, sea, road and scenery, the karts hidden by the caller) and
// blurred by Three.js's PMREM into the map every material reads its ambient light and reflections from. So a
// surface facing the sea is lit blue from below, one facing the sand or a white wall a little warmer, and every
// material shines with its own roughness, not only the karts' paint. The flat sky light is then turned down
// (scenery.js). Used by host/games/kart-3d/renderer.js, except in the plain course (plain-course.js).

import * as THREE from 'three';
import { startLineIndex } from './track.js';

// The probe stands this far above the start line, about where the chase camera rides.
const PROBE_LIFT = 3;
// Its six views reach from just past the probe to beyond the sky dome (scenery.js, 900 units).
const PROBE_NEAR = 0.5;
const PROBE_FAR = 1000;

// `sun` is scenery.js's sun (sun.js): its shadow map is drawn over the whole course first, so the probe sees the
// course's shadows. Returns { texture, dispose() }.
export function createCourseLight(renderer, scene, track, sun) {
  const station = track.stations[startLineIndex(track)];
  const position = new THREE.Vector3(station.point.x, station.point.y, station.point.z).addScaledVector(
    new THREE.Vector3(station.normal.x, station.normal.y, station.normal.z),
    PROBE_LIFT,
  );
  sun.usePerView(false);
  renderer.shadowMap.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0, PROBE_NEAR, PROBE_FAR, { position });
  pmrem.dispose();
  return { texture: target.texture, dispose: () => target.dispose() };
}
