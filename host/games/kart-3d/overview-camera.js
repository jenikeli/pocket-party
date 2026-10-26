// The camera behind the 3D race's setup screen: it circles the course once a minute, outside it and looking
// down at its middle. Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { courseExtent } from './track.js';

const ORBIT_SECONDS = 60;
// How far out and how high it flies, as shares of how far the course reaches from its middle.
const ORBIT_REACH = 1.6;
const ORBIT_HEIGHT = 0.8;

// Returns { camera, showCourse(track), fly(dt) }: the camera; circling another course from now on; and moving on
// by `dt` seconds.
export function createOverviewCamera(track) {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 1, 1500);
  let extent = courseExtent(track);
  let time = 0;

  function fly(dt) {
    time += dt;
    const angle = (2 * Math.PI * time) / ORBIT_SECONDS;
    const { centre, reach } = extent;
    camera.position.set(centre.x + Math.cos(angle) * reach * ORBIT_REACH, reach * ORBIT_HEIGHT, centre.z + Math.sin(angle) * reach * ORBIT_REACH);
    camera.lookAt(centre.x, 0, centre.z);
  }

  fly(0);
  return { camera, showCourse: (newTrack) => (extent = courseExtent(newTrack)), fly };
}
