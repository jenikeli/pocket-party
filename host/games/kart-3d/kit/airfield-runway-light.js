// The runway's edge light (M9 task K), a fat toy of one: a wide round foot with four bolts, a short stem and a
// round glass lens in a rim, as the low lights along real runways stand. By day the lens is unlit glass, as the
// floodlight's. Takes the kit and returns the parts, [{ geometry, material }]: the steel (coloured per vertex) and
// the glass; standing on y = 0, round about its middle. Used by kit/props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedCylinder } from '../shape-utils.js';
import { PAINT } from './airport-vehicle-parts.js';

const FOOT_RADIUS = 0.42;
const STEM_TOP = 0.55;

// The light's shapes, { steel, glass }, one geometry each. Plain shapes, unit tested.
export function runwayLightShapes() {
  const bolts = [0, 1, 2, 3].map((index) => {
    const angle = (index / 4) * 2 * Math.PI + Math.PI / 4;
    return coloured(at(new THREE.SphereGeometry(0.05, 6, 3).scale(1, 0.6, 1), Math.cos(angle) * 0.32, 0.17, Math.sin(angle) * 0.32), PAINT.darkGrey);
  });
  const steel = [
    coloured(at(roundedCylinder(FOOT_RADIUS, FOOT_RADIUS, 0.16, 0.06, 12), 0, 0.08, 0), PAINT.yellow),
    coloured(at(roundedCylinder(0.2, 0.26, STEM_TOP - 0.1, 0.04, 10), 0, (STEM_TOP + 0.1) / 2, 0), PAINT.white),
    coloured(at(roundedCylinder(0.3, 0.3, 0.14, 0.05, 12), 0, STEM_TOP + 0.05, 0), PAINT.coral),
    ...bolts,
  ];
  const lens = at(new THREE.SphereGeometry(0.22, 10, 6, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.85, 1), 0, STEM_TOP + 0.1, 0);
  return { steel: mergeShapes(steel), glass: lens };
}

export function buildRunwayLight(kit) {
  const { steel, glass } = runwayLightShapes();
  return [
    { geometry: kit.keep(steel), material: kit.materials.painted },
    { geometry: kit.keep(glass), material: kit.materials.glass },
  ];
}
