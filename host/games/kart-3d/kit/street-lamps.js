// The kit's street lamps (M7d2), in MK8DX's two styles: an iron post with a curved arm and a lantern of four
// glass panes under a little roof (Toad Harbor, Mario Circuit), and a post with three lanterns on a crossbar
// (Daisy Circuit). By day they are off, glass lit by the sun, as on MK8DX's day courses. Each is two shapes,
// standing on y = 0 and reaching toward +z: the iron (coloured per vertex) and the glass. Each builder takes the
// kit and returns the lamp's parts, [{ geometry, material }]. Used by kit/props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes } from '../shape-utils.js';

const IRON = 0x2b2f36;
const HEIGHT = 4.6;

export function buildLanternLamp(kit) {
  const arm = new THREE.TorusGeometry(0.55, 0.05, 6, 12, Math.PI / 2).rotateY(-Math.PI / 2).translate(0, HEIGHT - 0.55, 0);
  const lanternAt = [0, HEIGHT - 0.55, 0.55];
  const lantern = lanternParts(lanternAt);
  return lampParts(kit, mergeShapes([...post(), coloured(arm, IRON), ...lantern.iron]), lantern.glass);
}

export function buildTripleLamp(kit) {
  const lanterns = [-0.8, 0, 0.8].map((x) => lanternParts([x, HEIGHT + 0.05, 0]));
  const iron = mergeShapes([...post(), coloured(between(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), [-0.85, HEIGHT, 0], [0.85, HEIGHT, 0]), IRON), ...lanterns.flatMap((lantern) => lantern.iron)]);
  return lampParts(kit, iron, mergeShapes(lanterns.map((lantern) => lantern.glass)));
}

function lampParts(kit, iron, glass) {
  return [
    { geometry: kit.keep(iron), material: kit.materials.iron },
    { geometry: kit.keep(glass), material: kit.materials.glass },
  ];
}

// A post with a stepped foot and a ball on top.
function post() {
  return [
    coloured(at(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 10), 0, 0.2, 0), IRON),
    coloured(at(new THREE.CylinderGeometry(0.07, 0.1, HEIGHT, 8), 0, HEIGHT / 2, 0), IRON),
    coloured(at(new THREE.SphereGeometry(0.1, 8, 6), 0, HEIGHT + 0.02, 0), IRON),
  ];
}

// A lantern hanging under (x, y, z): an iron cap and roof over a box of glass with an iron foot. Returns
// { iron: [shapes], glass: shape }.
function lanternParts([x, y, z]) {
  const top = y - 0.12;
  return {
    iron: [
      coloured(at(new THREE.ConeGeometry(0.3, 0.26, 4).rotateY(Math.PI / 4), x, top - 0.02, z), IRON),
      coloured(at(new THREE.BoxGeometry(0.34, 0.05, 0.34), x, top - 0.6, z), IRON),
      coloured(at(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6), x, y - 0.05, z), IRON),
    ],
    glass: at(new THREE.BoxGeometry(0.3, 0.46, 0.3), x, top - 0.36, z),
  };
}
