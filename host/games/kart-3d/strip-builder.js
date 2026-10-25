// Collects the 3D race's road triangles between stations, with their normals, colours and texture coordinates,
// into one geometry. Used by host/games/kart-3d/track-mesh.js (road, walls, glowing panels) and trackside.js.

import * as THREE from 'three';
import { addScaled } from './vector.js';

// Texture coordinates run one texture repeat per this many units, across and along the road.
const UNITS_PER_REPEAT = 8;

// `brightness` multiplies every colour: above 1, an unlit material glows on the High quality setting. strip()
// adds one quad between a segment's two stations: from (lateral, lift) `from` to `to` across the road at each
// station, where lift is along the road's normal and each lateral is a function of the station (the road's
// width changes along it). Its front face is the side from which `from` is on the left, seen looking along
// the road. Returns { strip, build() }.
export function createStripBuilder(brightness = 1) {
  const positions = [];
  const normals = [];
  const colors = [];
  const uvs = [];
  const color = new THREE.Color();

  function strip({ station, next }, fromLateral, fromLift, toLateral, toLift, normalAt, hex) {
    const corner = (at, lateral, lift) => addScaled(addScaled(at.point, at.right, lateral), at.normal, lift);
    // The last station's next is the first, at s 0: counted on from the last instead, so the texture runs on
    // across the start line.
    const nextS = station.s + station.segmentLength;
    const corners = [
      { at: station, s: station.s, lateral: fromLateral(station), lift: fromLift },
      { at: station, s: station.s, lateral: toLateral(station), lift: toLift },
      { at: next, s: nextS, lateral: fromLateral(next), lift: fromLift },
      { at: next, s: nextS, lateral: toLateral(next), lift: toLift },
    ];
    color.setHex(hex).multiplyScalar(brightness);
    for (const index of [0, 1, 2, 1, 3, 2]) {
      const { at, s, lateral, lift } = corners[index];
      const point = corner(at, lateral, lift);
      const normal = normalAt(at);
      positions.push(point.x, point.y, point.z);
      normals.push(normal.x, normal.y, normal.z);
      colors.push(color.r, color.g, color.b);
      // Across uses lateral plus lift, so a wall (one lateral, lifts apart) is not one smeared column.
      uvs.push((lateral + lift) / UNITS_PER_REPEAT, s / UNITS_PER_REPEAT);
    }
  }

  function build() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geometry;
  }

  return { strip, build };
}
