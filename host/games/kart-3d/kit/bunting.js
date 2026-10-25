// The kit's bunting (M7d2), as near Mario Circuit's start gate: strings of triangular pennants in pastel colours
// hung across the road between two poles standing on its walls, sagging a little in the middle. Every string is
// merged into one shape, drawn from both sides. Used by the courses' dressings.

import * as THREE from 'three';
import { stationIndexAt } from '../track.js';
import { edgeLateral, withShadows } from './frames.js';
import { at, between, coloured, mergeShapes } from '../shape-utils.js';
import { addScaled } from '../vector.js';

const POLE_HEIGHT = 6.4;
const STRING_HEIGHT = 6.1;
const SAG = 1.1;
const PENNANT_SPACING = 0.75;
const PENNANT_SIZE = 0.36;
const COLORS = [0xb48cff, 0xffe066, 0xff9fd0, 0x7fc8ff, 0xffad5a, 0x9df08c];
const POLE = 0xf4f4f0;

// Adds a string across the road at each of `distances` (s along the lap); `kit` is the course's { world,
// track, keep } (kit/kit.js).
export function buildBunting({ world, track, keep }, distances) {
  const shapes = distances.flatMap((s) => stringAcross(track.stations[stationIndexAt(track, s)]));
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  world.add(withShadows(new THREE.Mesh(keep(mergeShapes(shapes)), material)));
}

// The two poles, the string and its pennants at `station`, in the world's coordinates.
function stringAcross(station) {
  const pointAt = (lateral, lift) => {
    const point = addScaled(addScaled(station.point, station.right, lateral), station.normal, lift);
    return new THREE.Vector3(point.x, point.y, point.z);
  };
  const ends = [-1, 1].map((side) => edgeLateral(station, side) + side * 0.3);
  const poles = ends.map((lateral) => coloured(between(new THREE.CylinderGeometry(0.07, 0.09, 1, 8), pointAt(lateral, 0).toArray(), pointAt(lateral, POLE_HEIGHT).toArray()), POLE));
  // The string sags in a curve, lowest in the middle.
  const along = (share) => pointAt(ends[0] + (ends[1] - ends[0]) * share, STRING_HEIGHT - SAG * 4 * share * (1 - share));
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, index) => along(index / 8)));
  const string = coloured(new THREE.TubeGeometry(curve, 24, 0.025, 4), 0xf4f4f0);
  const count = Math.floor((ends[1] - ends[0]) / PENNANT_SPACING);
  const facing = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(station.right.x, station.right.y, station.right.z),
    new THREE.Vector3(station.normal.x, station.normal.y, station.normal.z),
    new THREE.Vector3(station.tangent.x, station.tangent.y, station.tangent.z),
  );
  const pennants = Array.from({ length: count }, (_, index) => {
    // A triangle pointing down, its top edge on the string.
    const pennant = new THREE.CircleGeometry(PENNANT_SIZE, 3, -Math.PI / 2).translate(0, -PENNANT_SIZE / 2, 0);
    const spot = along((index + 0.5) / count);
    return coloured(at(pennant.applyMatrix4(facing), spot.x, spot.y, spot.z), COLORS[index % COLORS.length]);
  });
  return [...poles, string, ...pennants];
}
