// The kit's start lights (M7d2): a black box of three round lamps under little hoods, hanging from the start
// gate over the grid where the reference game's starter holds his, lit by the race's countdown (kit/start-light-states.js):
// red one by one, then all green at GO. Lit lamps are unlit materials brighter than white, so they glow on the
// High quality setting; dark ones are dark glass. Since M7d4 built up as the starter's light box is
// (docs/kart-reference.md, "The kit's objects up close"): deeper hoods, a chrome ring round each lamp, a bolt in
// each corner of its face, and a yoke with brackets it hangs from. Used by the courses' dressings with
// kit/start-gate.js.

import * as THREE from 'three';
import { startLightStates, LAMP_STATES } from './start-light-states.js';
import { roundedBox, roundedCylinder, at, coloured, mergeShapes } from '../shape-utils.js';
import { withShadows } from './frames.js';

const LAMP_SPACING = 0.78;
const LAMP_RADIUS = 0.3;
const BOX_HEIGHT = 0.95;
// The yoke the box hangs by reaches this far down from the gate to the box's top.
const ROD_LENGTH = 0.8;
const BOX_WIDTH = 2.6;
const HOOD_DEPTH = 0.45;
const CHROME = 0xc8ccd2;
const IRON = 0x3a3c42;
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

// The box below its yoke, its face toward +z, with a hood and a chrome ring round each lamp and a bolt in each
// corner of its face.
function buildBox() {
  const middle = -ROD_LENGTH - BOX_HEIGHT / 2;
  const lamps = [-1, 0, 1].flatMap((place) => {
    const hood = new THREE.CylinderGeometry(LAMP_RADIUS + 0.06, LAMP_RADIUS + 0.06, HOOD_DEPTH, 14, 1, true, Math.PI / 2, Math.PI);
    return [
      coloured(at(hood.rotateX(Math.PI / 2), place * LAMP_SPACING, middle + 0.04, 0.25 + HOOD_DEPTH / 2), 0x141416),
      coloured(at(new THREE.TorusGeometry(LAMP_RADIUS + 0.03, 0.03, 6, 20), place * LAMP_SPACING, middle, 0.27), CHROME),
    ];
  });
  const bolts = [-1, 1].flatMap((x) => [-1, 1].map((y) => coloured(at(new THREE.SphereGeometry(0.04, 6, 4).scale(1, 1, 0.5), x * (BOX_WIDTH / 2 - 0.12), middle + y * (BOX_HEIGHT / 2 - 0.12), 0.25), CHROME)));
  return mergeShapes([coloured(at(roundedBox(BOX_WIDTH, BOX_HEIGHT, 0.5, 0.1), 0, middle, 0), 0x18191c), ...lamps, ...bolts, ...buildYoke(middle)]);
}

// The yoke: a bar along the box's top on a bracket at each end, and two rods up from it to plates under the
// gate's sign.
function buildYoke(middle) {
  const top = middle + BOX_HEIGHT / 2;
  return [
    coloured(at(roundedBox(BOX_WIDTH - 0.4, 0.1, 0.16, 0.03), 0, top + 0.12, 0), IRON),
    ...[-1, 1].flatMap((place) => [
      coloured(at(roundedBox(0.14, 0.22, 0.2, 0.03), place * 0.9, top + 0.06, 0), IRON),
      coloured(at(roundedCylinder(0.045, 0.045, ROD_LENGTH - 0.12, 0.01, 8), place * 0.9, -(ROD_LENGTH - 0.12) / 2, 0), IRON),
      coloured(at(roundedBox(0.3, 0.06, 0.3, 0.02), place * 0.9, -0.03, 0), IRON),
    ]),
  ];
}
