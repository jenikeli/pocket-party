// The kit's street lamps (M7d2, rebuilt in M7d4c4 to the study), in MK8DX's two styles. Toad Harbor's: a dark iron
// post flaring at its foot with gold collar rings, a spike finial, and a curved arm on a scroll bracket holding a
// round globe. Daisy Circuit's: three four-sided lanterns with pyramid roofs on a crossbar, the post rising from a
// square stone pedestal with a gold plaque. By day they are off, glass lit by the sun, as on MK8DX's day courses.
// Each is two shapes, standing on y = 0 and reaching toward +z (the globe lamp) or along x (the triple): the iron
// (coloured per vertex) and the glass. Each builder takes the kit and returns the lamp's parts,
// [{ geometry, material }]. Used by kit/props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox, roundedCylinder, shaded } from '../shape-utils.js';
import { GOLD, IRON, collar, finial, flaredPost, lantern, scrollBrace } from './street-lamp-parts.js';

const HEIGHT = 4.6;
const STONE = 0x9b968a;

export function buildLanternLamp(kit) {
  const arm = new THREE.TorusGeometry(0.55, 0.08, 6, 12, Math.PI / 2).rotateY(-Math.PI / 2).translate(0, HEIGHT - 0.55, 0);
  const globeY = HEIGHT - 0.55 - 0.42;
  const iron = [
    coloured(at(roundedCylinder(0.27, 0.27, 0.16, 0.05, 10), 0, 0.08, 0), IRON),
    ...flaredPost(0.16, HEIGHT, 0.29, 0.13),
    coloured(arm, IRON),
    ...scrollBrace([0, HEIGHT - 1.1, 0.05], [0, HEIGHT - 0.4, 0.42], Math.PI / 2),
    ...finial(0, HEIGHT - 0.02, 0),
    coloured(at(roundedCylinder(0.15, 0.2, 0.14, 0.04, 8), 0, HEIGHT - 0.55 - 0.1, 0.55), IRON),
    collar(HEIGHT - 0.55 - 0.2, 0.15),
    coloured(at(roundedCylinder(0.09, 0.12, 0.12, 0.035, 8), 0, globeY - 0.22, 0.55), IRON),
  ];
  const glass = at(new THREE.SphereGeometry(0.22, 12, 8), 0, globeY, 0.55);
  return lampParts(kit, iron, [glass]);
}

export function buildTripleLamp(kit) {
  const barY = HEIGHT - 0.6;
  const lanterns = [-0.8, 0, 0.8].map((x) => lantern(x, barY + 0.03, 0));
  const iron = [
    plaque(),
    ...flaredPost(0.88, barY + 0.1, 0.25, 0.12),
    coloured(between(new THREE.CylinderGeometry(0.09, 0.09, 1, 8), [-0.8, barY, 0], [0.8, barY, 0]), IRON),
    ...scrollBrace([0.05, barY - 0.55, 0], [0.5, barY - 0.05, 0], 0),
    ...scrollBrace([-0.05, barY - 0.55, 0], [-0.5, barY - 0.05, 0], Math.PI),
    ...lanterns.flatMap((each) => each.iron),
  ];
  return lampParts(kit, iron, lanterns.map((each) => each.glass), pedestal());
}

// The square stone pedestal of the triple lamp: a base, a block and a cap.
function pedestal() {
  const stone = (width, height, y) => coloured(at(roundedBox(width, height, width, 0.03, { chamfered: true }), 0, y, 0), STONE);
  return [stone(0.42, 0.2, 0.1), stone(0.34, 0.58, 0.49), stone(0.42, 0.1, 0.83)];
}

// The gold plaque on the pedestal's front.
function plaque() {
  return coloured(at(roundedBox(0.2, 0.28, 0.04, 0.012, { chamfered: true }), 0, 0.5, 0.18), GOLD);
}

// Merges the shapes into the lamp's parts: iron and glass on the kit's materials, and stone (matte, its own) when
// there is any. Iron and stone darken toward the ground, where they meet the deck.
function lampParts(kit, ironShapes, glassShapes, stoneShapes = []) {
  const darkenLow = (geometry) => shaded(geometry, (x, y) => 0.7 + 0.3 * Math.min(1, y / 0.4));
  const parts = [
    { geometry: kit.keep(darkenLow(mergeShapes(ironShapes))), material: kit.materials.iron },
    { geometry: kit.keep(mergeShapes(glassShapes)), material: kit.materials.glass },
  ];
  if (stoneShapes.length > 0) {
    const material = kit.keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    parts.push({ geometry: kit.keep(darkenLow(mergeShapes(stoneShapes))), material });
  }
  return parts;
}
