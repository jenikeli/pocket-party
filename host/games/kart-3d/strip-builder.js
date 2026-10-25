// Collects the 3D race's road triangles between stations, with their normals, colours and texture coordinates,
// into one geometry. Used by host/games/kart-3d/track-mesh.js (road, walls, glowing panels) and the kit's road,
// panels and barriers (kit/).

import * as THREE from 'three';
import { addScaled } from './vector.js';

// Texture coordinates run one texture repeat per this many units, across and along the road.
const UNITS_PER_REPEAT = 8;

// The texture coordinates a corner gets unless a strip says otherwise: the texture laid over the world in
// repeats of UNITS_PER_REPEAT. Across uses lateral plus lift, so a wall (one lateral, lifts apart) is not one
// smeared column.
export function worldUv(s, lateral, lift) {
  return [(lateral + lift) / UNITS_PER_REPEAT, s / UNITS_PER_REPEAT];
}

// `brightness` multiplies every colour: above 1, an unlit material glows on the High quality setting. Returns
// { strip, quad, build() }.
export function createStripBuilder(brightness = 1) {
  const positions = [];
  const normals = [];
  const colors = [];
  const uvs = [];
  const color = new THREE.Color();

  // One quad from four corners, each { point, normal, uv: [u, v], shade (optional, multiplies the colour) }, in
  // the order: from and to at the first end, then from and to at the second. Its front face is the side from
  // which `from` is on the left, seen looking from the first end to the second.
  function quad(corners, hex) {
    for (const index of [0, 1, 2, 1, 3, 2]) {
      const { point, normal, uv, shade = 1 } = corners[index];
      color.setHex(hex).multiplyScalar(brightness * shade);
      positions.push(point.x, point.y, point.z);
      normals.push(normal.x, normal.y, normal.z);
      colors.push(color.r, color.g, color.b);
      uvs.push(uv[0], uv[1]);
    }
  }

  // One quad between a segment's two stations: from (lateral, lift) `from` to `to` across the road at each
  // station, where lift is along the road's normal and each lateral is a function of the station (the road's
  // width changes along it). `options` may give uvOf(s, lateral, lift) for the texture coordinates (worldUv if
  // not) and shadeOf(s, lateral), a multiplier for the colour at each corner.
  function strip({ station, next }, fromLateral, fromLift, toLateral, toLift, normalAt, hex, options = {}) {
    const { uvOf = worldUv, shadeOf } = options;
    // The last station's next is the first, at s 0: counted on from the last instead, so the texture runs on
    // across the start line.
    const nextS = station.s + station.segmentLength;
    const ends = [
      { at: station, s: station.s, lateral: fromLateral(station), lift: fromLift },
      { at: station, s: station.s, lateral: toLateral(station), lift: toLift },
      { at: next, s: nextS, lateral: fromLateral(next), lift: fromLift },
      { at: next, s: nextS, lateral: toLateral(next), lift: toLift },
    ];
    const corners = ends.map(({ at, s, lateral, lift }) => ({
      point: addScaled(addScaled(at.point, at.right, lateral), at.normal, lift),
      normal: normalAt(at),
      uv: uvOf(s, lateral, lift),
      shade: shadeOf ? shadeOf(s, lateral) : 1,
    }));
    quad(corners, hex);
  }

  function build() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geometry;
  }

  return { strip, quad, build };
}
