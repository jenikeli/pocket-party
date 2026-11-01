// The kit's bunting (M7d2, rebuilt in M7d4c3 to the study), as near Mario Circuit's start gate: strings of pastel
// pennants hung across the road between two poles standing on its walls, sagging a little in the middle. Each
// pennant is a curled cloth with a woven relief and a hem folded over its rope (kit/bunting-pennant.js); each pole
// has a foot, collars and a cap. Every string is merged into one shape; a pennant is two one-sided layers, one for
// each way it is seen. Used by the courses'
// dressings.

import * as THREE from 'three';
import { stationIndexAt } from '../track.js';
import { edgeLateral, withShadows } from './frames.js';
import { between, coloured, mergeShapes, roundedCylinder } from '../shape-utils.js';
import { addScaled } from '../vector.js';
import { createPennant, createWeaveNormalMap } from './bunting-pennant.js';

const POLE_HEIGHT = 6.4;
const STRING_HEIGHT = 6.1;
const SAG = 1.1;
const PENNANT_SPACING = 0.75;
const PENNANT_SIZE = 0.36;
const COLORS = [0xb48cff, 0xffe066, 0xff9fd0, 0x7fc8ff, 0xffad5a, 0x9df08c];
const POLE = 0xf4f4f0;
const ROPE = 0xe8e2d0;
const FINIAL = 0xffd21e;

// Adds a string across the road at each of `distances` (s along the lap); `kit` is the course's { world,
// track, keep } (kit/kit.js).
export function buildBunting({ world, track, keep }, distances) {
  const shapes = distances.flatMap((s) => stringAcross(track.stations[stationIndexAt(track, s)]));
  const material = keep(new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    normalMap: keep(createWeaveNormalMap()),
  }));
  const bunting = withShadows(new THREE.Mesh(keep(mergeShapes(shapes)), material));
  bunting.castShadow = false;
  world.add(bunting);
}

// The two poles, the string and its pennants at `station`, in the world's coordinates.
function stringAcross(station) {
  const vectorOf = ({ x, y, z }) => new THREE.Vector3(x, y, z);
  const [right, up, along] = [station.right, station.normal, station.tangent].map(vectorOf);
  const pointAt = (lateral, lift) => vectorOf(addScaled(addScaled(station.point, station.right, lateral), station.normal, lift));
  const ends = [-1, 1].map((side) => edgeLateral(station, side) + side * 0.3);
  const poles = ends.flatMap((lateral) => pole(pointAt(lateral, 0), up));
  // The string sags in a curve, lowest in the middle.
  const spot = (share) => pointAt(ends[0] + (ends[1] - ends[0]) * share, STRING_HEIGHT - SAG * 4 * share * (1 - share));
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, index) => spot(index / 8)));
  const rope = coloured(new THREE.TubeGeometry(curve, 24, 0.04, 5), ROPE);
  const count = Math.floor((ends[1] - ends[0]) / PENNANT_SPACING);
  // The pennant is modelled in the xy plane (its face toward +z); this turns it to hang across the road.
  const facing = new THREE.Matrix4().makeBasis(right, up, along);
  const pennants = Array.from({ length: count }, (_, index) => {
    const hanging = createPennant(PENNANT_SIZE, COLORS[index % COLORS.length]).applyMatrix4(facing);
    const top = spot((index + 0.5) / count);
    return hanging.translate(top.x, top.y, top.z);
  });
  return [...poles, rope, ...pennants];
}

// One pole standing at `base` along `up`: a shaft with a foot, two collars and a golden ball on a cap.
function pole(base, up) {
  const shaft = coloured(between(new THREE.CylinderGeometry(0.07, 0.09, 1, 8), base.toArray(), base.clone().addScaledVector(up, POLE_HEIGHT).toArray()), POLE);
  const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  const piece = (geometry, lift, color) => {
    geometry.applyQuaternion(turn).translate(...base.clone().addScaledVector(up, lift).toArray());
    return coloured(geometry, color);
  };
  return [
    shaft,
    piece(roundedCylinder(0.22, 0.26, 0.24, 0.07, 10), 0.12, POLE),
    piece(roundedCylinder(0.12, 0.12, 0.12, 0.035, 8), 1.2, POLE),
    piece(roundedCylinder(0.11, 0.11, 0.12, 0.035, 8), STRING_HEIGHT + 0.1, POLE),
    piece(roundedCylinder(0.13, 0.1, 0.16, 0.05, 8), POLE_HEIGHT, POLE),
    piece(new THREE.SphereGeometry(0.11, 8, 6), POLE_HEIGHT + 0.16, FINIAL),
  ];
}
