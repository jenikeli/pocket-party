// The kit's giant mushroom (M7d4c5), after Toad Circuit's: a glossy red cap with a soft, thick rounded rim and
// white spots, ribbed gills under it, and a cream stem that widens into a foot. About 4.9 tall; the cap is 6
// across. Used by kit/props.js.

import * as THREE from 'three';
import { at, mergeShapes } from '../shape-utils.js';
import { angleAround, blend, lathe, paintBy } from './circuit-shapes.js';

const CAP_BOTTOM = 2.7;
const RIM_RADIUS = 0.28;
const DOME_RADIUS = 3 - RIM_RADIUS;
const DOME_HEIGHT = 1.9;
const DOME_BASE = CAP_BOTTOM + RIM_RADIUS * 0.5;
const GILL_COLUMNS = 48;

export function buildGiantMushroom(kit) {
  return [{ geometry: kit.keep(giantMushroomShape()), material: kit.materials.plastic }];
}

// The cap's top: half an ellipsoid sitting on the rim, redder toward the edge and a little lighter on top.
function domeShape() {
  const dome = new THREE.SphereGeometry(DOME_RADIUS, 32, 12, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, DOME_HEIGHT / DOME_RADIUS, 1);
  return paintBy(at(dome, 0, DOME_BASE, 0), (x, y) => blend(0xb81c14, 0xf03a2a, (y - DOME_BASE) / DOME_HEIGHT));
}

// The rim: a fat rounded ring of the cap's red round its edge, darker where it turns under.
function rimShape() {
  const ring = new THREE.TorusGeometry(DOME_RADIUS, RIM_RADIUS, 12, 32).rotateX(Math.PI / 2);
  return paintBy(at(ring, 0, DOME_BASE, 0), (x, y) => blend(0x8e1510, 0xd02218, (y - DOME_BASE + RIM_RADIUS) / (RIM_RADIUS * 1.6)));
}

// The underside: a shallow dish up to the stem, its ribs alternate in two creams (the gills). Its points run
// from the outside in, so its faces look down.
function gillsShape() {
  const points = [[DOME_RADIUS, DOME_BASE - 0.05], [2.4, CAP_BOTTOM + 0.12], [1.6, CAP_BOTTOM + 0.3], [0.9, CAP_BOTTOM + 0.5]];
  const dish = lathe(points, GILL_COLUMNS);
  return paintBy(dish, (x, y, z) => (Math.round((angleAround(x, z) / (2 * Math.PI)) * GILL_COLUMNS) % 2 === 0 ? 0xe4cf9f : 0xb89a66));
}

// The stem: wide at the foot with a rounded edge, thin in the middle, a little wider where it meets the cap.
function stemShape() {
  const points = [[0, 0], [1.1, 0], [1.3, 0.1], [1.25, 0.3], [1.0, 0.8], [0.85, 1.4], [0.88, 2.0], [0.95, 2.75]];
  return paintBy(lathe(points, 24), (x, y) => blend(0xc4b08a, 0xf4e8d0, y / 1.2));
}

// A white spot lying on the dome at (turn round, tilt from straight up), flattened and tipped to follow the cap.
function spotShape([turn, tilt, size]) {
  const side = Math.sin(tilt);
  const surfaceNormal = new THREE.Vector3((side * Math.cos(turn)) / DOME_RADIUS, Math.cos(tilt) / DOME_HEIGHT, (side * Math.sin(turn)) / DOME_RADIUS).normalize();
  const spot = new THREE.SphereGeometry(size, 12, 6).scale(1, 0.3, 1);
  spot.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal));
  const surface = [side * Math.cos(turn) * DOME_RADIUS, DOME_BASE + Math.cos(tilt) * DOME_HEIGHT, side * Math.sin(turn) * DOME_RADIUS];
  return paintBy(at(spot, ...surface), () => 0xffffff);
}

function giantMushroomShape() {
  const spots = [[0, 0, 0.7], [0.85, 0.6, 0.7], [2.4, 0.75, 0.75], [3.9, 0.65, 0.65], [5.2, 0.8, 0.8], [1.6, 1.15, 0.7], [4.6, 1.15, 0.7]];
  return mergeShapes([stemShape(), gillsShape(), rimShape(), domeShape(), ...spots.map(spotShape)]);
}
