// The kit's start lights (M7d2): a black box of three round lamps under little hoods, hanging from the start
// gate over the grid where MK8DX's Lakitu holds his, lit by the race's countdown (kit/start-light-states.js):
// red one by one, then all green at GO. Lit lamps are unlit materials brighter than white, so they glow on the
// High quality setting; dark ones are dark glass. Used by the courses' dressings with kit/start-gate.js.

import * as THREE from 'three';
import { startLightStates, LAMP_STATES } from './start-light-states.js';
import { roundedBox, at, coloured, mergeShapes } from '../shape-utils.js';
import { withShadows } from './frames.js';

const LAMP_SPACING = 0.78;
const LAMP_RADIUS = 0.3;
const BOX_HEIGHT = 0.95;
// The rods the box hangs by, from the gate down to the box's top.
const ROD_LENGTH = 0.8;
// Lit lamps are a little brighter than white, so they glow on High; much brighter, and the tone mapping
// washes their colour out toward white on the other settings.
const GLOW = 1.25;
const LAMP_COLORS = {
  [LAMP_STATES.OFF]: new THREE.Color(0x1c1e22),
  [LAMP_STATES.RED]: new THREE.Color(1, 0.04, 0.02).multiplyScalar(GLOW),
  [LAMP_STATES.GREEN]: new THREE.Color(0.08, 1, 0.22).multiplyScalar(GLOW),
};

// `hangFrom` is the frame (a Matrix4) of the point the box hangs from: y up, z toward the karts on the grid.
// `kit` is the course's { world, keep } (kit/kit.js). Returns { update(race) }.
export function buildStartLights({ world, keep }, hangFrom) {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.matrix.copy(hangFrom);
  // Both sides, so the hoods (open half tubes) show from below too.
  const boxMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, side: THREE.DoubleSide }));
  group.add(withShadows(new THREE.Mesh(keep(buildBox()), boxMaterial)));
  const lampShape = keep(new THREE.SphereGeometry(LAMP_RADIUS, 16, 10).scale(1, 1, 0.45));
  const lamps = [-1, 0, 1].map((place) => {
    const material = keep(new THREE.MeshBasicMaterial({ color: LAMP_COLORS[LAMP_STATES.OFF] }));
    const lamp = new THREE.Mesh(lampShape, material);
    lamp.position.set(place * LAMP_SPACING, -ROD_LENGTH - BOX_HEIGHT / 2, 0.27);
    group.add(lamp);
    return lamp;
  });

  function update(race) {
    startLightStates(race).forEach((state, index) => lamps[index].material.color.copy(LAMP_COLORS[state]));
  }

  update(null);
  world.add(group);
  return { update };
}

// The box below its two rods, its face toward +z, with a hood over each lamp.
function buildBox() {
  const middle = -ROD_LENGTH - BOX_HEIGHT / 2;
  const hoods = [-1, 0, 1].map((place) => {
    const hood = new THREE.CylinderGeometry(LAMP_RADIUS + 0.06, LAMP_RADIUS + 0.06, 0.3, 14, 1, true, Math.PI / 2, Math.PI);
    return coloured(at(hood.rotateX(Math.PI / 2), place * LAMP_SPACING, middle + 0.04, 0.38), 0x141416);
  });
  const rods = [-1, 1].map((place) => coloured(at(new THREE.CylinderGeometry(0.04, 0.04, ROD_LENGTH, 6), place * 0.9, -ROD_LENGTH / 2, 0), 0x3a3c42));
  return mergeShapes([coloured(at(roundedBox(2.6, BOX_HEIGHT, 0.5, 0.1), 0, middle, 0), 0x18191c), ...hoods, ...rods]);
}
