// The apron's three trucks (M9 task J), after MK8DX's Sunshine Airport: the stair truck (a white cab and a fat
// orange stair on a long chassis), the belt loader (a blue belt tilted up from a low chassis) and the fuel truck (a
// white tank with a coral band). Chunky and soft like the game's: bevelled bodies, big tyres, a dark underside
// where the body meets the chassis. Each builder takes the kit and returns one painted shape,
// [{ geometry, material }], facing +z, centred on its middle. Used by kit/props.js.

import * as THREE from 'three';
import { roundedCylinder, at, coloured, mergeShapes } from '../shape-utils.js';
import { PAINT, box, wheelSets, rod, slope, cab } from './airport-vehicle-parts.js';

function painted(kit, shapes) {
  return [{ geometry: kit.keep(mergeShapes(shapes)), material: kit.materials.painted }];
}

// The stair truck: the stair climbs from the chassis's back to a landing over the cab, with a rail down each side.
function stairTruckShape() {
  const stair = [-1, 1].flatMap((side) => [
    slope(PAINT.orange, 0.22, 0.5, [1.15, -2.8], [2.75, 0.8], side * 0.85),
    rod(PAINT.orange, [side * 0.85, 2.2, -2.8], [side * 0.85, 3.8, 0.8], 0.07),
    rod(PAINT.orange, [side * 0.85, 3.8, 0.8], [side * 0.85, 3.8, 2.9], 0.07),
    rod(PAINT.orange, [side * 0.85, 3.0, 2.9], [side * 0.85, 3.8, 2.9], 0.07),
  ]);
  const treads = Array.from({ length: 8 }, (unused, step) => box(PAINT.darkOrange, [1.5, 0.12, 0.5], [0, 1.4 + step * 0.22, -2.6 + step * 0.45]));
  return [
    box(PAINT.darkGrey, [2.1, 0.4, 5.8], [0, 0.75, 0], 0.1),
    box(PAINT.white, [2.2, 0.55, 5.9], [0, 1.15, 0], 0.15),
    box(PAINT.blue, [2.24, 0.14, 5.9], [0, 1.05, 0], 0.04),
    ...cab(2.1, PAINT.white),
    box(PAINT.orange, [2.1, 0.22, 2.2], [0, 3.0, 1.9], 0.1),
    ...treads,
    ...stair,
    ...wheelSets([-2.1, 1.6], 1.05, 0.6, 0.45, true),
  ];
}

export function buildStairTruck(kit) {
  return painted(kit, stairTruckShape());
}

// The belt loader: a fat blue belt with dark ribs tilted up toward the front, tall side guards, a small cab behind.
function beltLoaderShape() {
  const [foot, head] = [[1.3, -1.5], [2.6, 1.8]];
  const ribs = Array.from({ length: 8 }, (unused, rib) => {
    const along = (rib + 0.5) / 8;
    const [y, z] = [foot[0] + (head[0] - foot[0]) * along + 0.13, foot[1] + (head[1] - foot[1]) * along];
    return slope(PAINT.black, 1, 0.05, [y, z], [y + 0.05, z + 0.13]);
  });
  return [
    box(PAINT.darkBlue, [2.1, 0.4, 2.4], [0, 0.75, -1.6], 0.1),
    box(PAINT.blue, [2.2, 0.55, 2.4], [0, 1.15, -1.6], 0.15),
    box(PAINT.white, [1.7, 1.3, 1.2], [0.1, 2.0, -2.1], 0.2),
    box(PAINT.glass, [1.4, 0.55, 0.1], [0.1, 2.25, -1.48], 0.03),
    slope(PAINT.darkGrey, 1.1, 0.25, foot, head),
    ...ribs,
    ...[-1, 1].map((side) => slope(PAINT.blue, 0.2, 0.5, [foot[0] + 0.25, foot[1]], [head[0] + 0.25, head[1]], side * 0.65)),
    box(PAINT.darkBlue, [1.5, 0.25, 0.7], [0, head[0] + 0.15, head[1] + 0.3], 0.08),
    box(PAINT.darkBlue, [0.35, 1.9, 0.35], [0, 1.1, 1.5], 0.1),
    box(PAINT.darkGrey, [1.5, 0.3, 0.7], [0, 0.15, 1.5], 0.1),
    ...wheelSets([-2.2, -0.9], 1.0, 0.5, 0.4, true),
  ];
}

export function buildBeltLoader(kit) {
  return painted(kit, beltLoaderShape());
}

// The fuel truck: a fat white tank (a lathed cylinder lying along z) with a coral band, a walkway, a ladder and a
// hose reel, behind a coral cab.
function fuelTruckShape() {
  const tank = (colour, length, z) => coloured(at(roundedCylinder(1.05, 1.05, length, 0.35, 14).rotateX(Math.PI / 2), 0, 2.25, z), colour);
  return [
    box(PAINT.darkGrey, [1.8, 0.4, 6.2], [0, 0.95, 0], 0.1),
    ...cab(2.5, PAINT.coral),
    tank(PAINT.white, 4.4, -0.7),
    tank(PAINT.coral, 0.6, -0.7),
    box(PAINT.grey, [0.8, 0.2, 3.6], [0, 3.35, -0.7], 0.08),
    box(PAINT.darkGrey, [1.9, 0.9, 0.6], [0, 1.2, -2.9], 0.12),
    coloured(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8).translate(0, 3.5, 0.6), PAINT.yellow),
    ...[-1, 1].map((side) => box(PAINT.yellow, [0.1, 1.2, 0.5], [side * 1.08, 2.0, -3.2])),
    ...wheelSets([-2.4, -1.1, 2.4], 1.05, 0.6, 0.45, true),
  ];
}

export function buildFuelTruck(kit) {
  return painted(kit, fuelTruckShape());
}
