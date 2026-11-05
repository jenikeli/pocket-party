// The big hangar's fittings (M9): lamps hanging under the ribs (unlit by day), red tool chests and a yellow
// maintenance stair standing in the ring's infield by the plane stand, and the lattice towers that hold the
// raised ring up off the floor (the kit's own, kit/truss.js). Shapes in the hangar's frame (kit/hangar-plan.js),
// coloured per vertex. Used by kit/hangar-big.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { lathe } from './circuit-shapes.js';
import { member } from './hangar-parts.js';
import { RIB_DEPTH } from './hangar-plan.js';
import { buildTrussTowers } from './truss.js';
import { NAVY, SUN_YELLOW } from './hangar-maps.js';

const LAMP_ROD = 1.4;
const CHEST_RED = 0xd8342c;
const DARK = 0x2a2c32;
// A tower stands under every this many of the raised stations.
const TOWER_EVERY = 9;

// The lamps, tool chests and stair, one geometry.
export function buildFittingsGeometry(plan) {
  return mergeShapes([...lamps(plan), ...infieldKit(plan)]);
}

// The towers under the raised ring, one geometry (the kit's truss towers, built in the world and brought into
// the hangar's frame).
export function buildRingTowers(plan) {
  const stations = plan.raisedStations.filter((station, index) => index % TOWER_EVERY === Math.floor(TOWER_EVERY / 2));
  const towers = buildTrussTowers(stations, plan.spot.y);
  const { x, y, z, heading } = plan.spot;
  const placed = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading), new THREE.Vector3(1, 1, 1));
  return towers.applyMatrix4(placed.invert());
}

// The lamps' spots: under every rib but the end ones, at the middle and a quarter of the span either side.
export function lampSpots({ width, ribXs }) {
  return ribXs.slice(1, -1).flatMap((x) => [-width / 4, 0, width / 4].map((z) => ({ x, z })));
}

// How far below a rib's inner chord a lamp hangs, to the bottom of its shade.
export const LAMP_DROP = LAMP_ROD + 0.7;

function lamps(plan) {
  return lampSpots(plan).flatMap(({ x, z }) => {
    const top = plan.archY(z) - RIB_DEPTH;
    const shadeY = top - LAMP_ROD;
    return [
      member([x, top, z], [x, shadeY, z], 0.1, DARK, true),
      coloured(at(lathe([[0.82, 0], [0.75, 0.14], [0.36, 0.55], [0.12, 0.64], [0, 0.66]], 10), x, shadeY - 0.62, z), NAVY),
      // The lamp's lens across the shade's mouth, facing down.
      coloured(at(new THREE.CircleGeometry(0.76, 10).rotateX(Math.PI / 2), x, shadeY - 0.58, z), 0xfff4dc),
    ];
  });
}

// Where the infield's things stand: round the plane stand, as createFloorMarkings draws it (kit/hangar-maps.js).
export function infieldSpots({ infield }) {
  const xs = infield.map(([x]) => x);
  const zs = infield.map(([, z]) => z);
  const standX = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * 0.45;
  const middleZ = (Math.min(...zs) + Math.max(...zs)) / 2;
  return {
    chests: [{ x: standX - 1, z: middleZ - 11, turn: 0.3 }, { x: standX - 3, z: middleZ - 12.5, turn: -0.2 }, { x: standX + 2, z: middleZ + 11, turn: 1.4 }],
    stair: { x: standX - 3, z: middleZ + 9, turn: 0.5 },
  };
}

function infieldKit(plan) {
  const { chests, stair } = infieldSpots(plan);
  return [...chests.flatMap((spot) => placed(toolChest(), spot)), ...placed(maintenanceStair(), stair)];
}

// `shapes` turned by spot.turn and moved to (spot.x, 0, spot.z).
function placed(shapes, { x, z, turn }) {
  return shapes.map((shape) => shape.rotateY(turn).translate(x, 0, z));
}

// A red tool chest on castors: a rounded body with drawer lines and a handle, 1.3 wide and about 1.3 tall.
function toolChest() {
  const shapes = [coloured(at(roundedBox(1.3, 1.05, 0.7, 0.08), 0, 0.72, 0), CHEST_RED)];
  for (const y of [0.45, 0.68, 0.9, 1.08]) {
    shapes.push(coloured(at(new THREE.BoxGeometry(1.18, 0.03, 0.04), 0, y, 0.35), DARK));
  }
  shapes.push(member([-0.55, 1.35, 0.3], [0.55, 1.35, 0.3], 0.05, 0xd8dce1, true));
  for (const [x, z] of [[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]]) {
    const wheel = roundedCylinder(0.09, 0.09, 0.07, 0.02, 8).rotateX(Math.PI / 2);
    shapes.push(coloured(at(wheel, x, 0.1, z), DARK));
  }
  return shapes;
}

// A yellow maintenance stair on wheels: two sloping stringers, steps, a platform at the top and handrails.
function maintenanceStair() {
  const [run, rise, wide] = [3.2, 2.8, 1.1];
  const shapes = [coloured(at(roundedBox(1.4, 0.15, wide + 0.2, 0.05), run + 0.5, rise, 0), SUN_YELLOW)];
  for (const side of [-1, 1]) {
    const z = (side * wide) / 2;
    shapes.push(member([0, 0.25, z], [run, rise, z], 0.14, SUN_YELLOW));
    shapes.push(member([run + 1.1, 0.25, z], [run + 1.1, rise, z], 0.14, SUN_YELLOW));
    shapes.push(member([0.2, 1.25, z], [run, rise + 1, z], 0.06, SUN_YELLOW, true));
    shapes.push(member([run, rise + 1, z], [run + 1.2, rise + 1, z], 0.06, SUN_YELLOW, true));
    shapes.push(member([run + 1.2, rise, z], [run + 1.2, rise + 1, z], 0.06, SUN_YELLOW, true));
    for (const x of [0, run + 1.1]) {
      shapes.push(coloured(at(roundedCylinder(0.13, 0.13, 0.1, 0.03, 8).rotateX(Math.PI / 2), x, 0.13, z), DARK));
    }
  }
  const steps = 7;
  for (let step = 1; step <= steps; step += 1) {
    const share = step / (steps + 1);
    shapes.push(coloured(between(new THREE.BoxGeometry(0.3, 1, 0.04), [run * share, rise * share, -wide / 2], [run * share, rise * share, wide / 2]), 0xb8bcc4));
  }
  return shapes;
}
