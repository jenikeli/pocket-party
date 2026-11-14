// The kit's tyre stack (M7d4c5), after the reference stadium course's: four black tyres, each with a rounded sidewall, a
// pale ring round its hollow middle and a deep tread, every one turned a little differently so the stack sits
// slightly untidy. About 1 tall and 0.96 across. Used by kit/props.js.

import * as THREE from 'three';
import { at, mergeShapes } from '../shape-utils.js';
import { angleAround, lathe, paintBy, smoothed } from './circuit-shapes.js';

const COLUMNS = 24;
const HEIGHT = 0.25;
const OUTER = 0.48;
const TREAD_DEPTH = 0.075;
const TYRE_COUNT = 4;

export function buildTyreStack(kit) {
  return [{ geometry: kit.keep(tyreStackShape()), material: kit.materials.painted }];
}

// One tyre's cross-section round its middle at y = 0, from the bottom up: a pale lip round the hole, a flat
// sidewall, a rounded shoulder, then the flat tread (the top half mirrors the bottom).
function crossSection() {
  const half = HEIGHT / 2;
  const lower = [[0.25, -0.1], [0.28, -half], [0.33, -half], [0.4, -0.118], [0.46, -0.09], [OUTER, -0.04]];
  const upper = lower.map(([radius, height]) => [radius, -height]).reverse();
  return [...lower, ...upper];
}

// A tyre: the tread's alternate columns are pushed in, so the tread is a ring of blocks with grooves between.
function tyreShape() {
  const tyre = lathe(crossSection(), COLUMNS);
  const { position } = tyre.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, z] = [position.getX(index), position.getZ(index)];
    const column = Math.round((angleAround(x, z) / (2 * Math.PI)) * COLUMNS);
    const depth = Math.min(Math.max((Math.hypot(x, z) - 0.43) / 0.06, 0), 1);
    const scale = column % 2 !== 0 ? 1 - TREAD_DEPTH * depth : 1;
    position.setXYZ(index, x * scale, position.getY(index), z * scale);
  }
  return paintBy(smoothed(tyre), tyreColor);
}

// Dark rubber, darker in the tread, and a pale ring round the hole.
function tyreColor(x, y, z) {
  const radius = Math.hypot(x, z);
  if (radius < 0.3) {
    return 0x8c8c94;
  }
  return radius > 0.45 ? 0x121214 : 0x26262a;
}

function tyreStackShape() {
  const tyres = Array.from({ length: TYRE_COUNT }, (_, level) =>
    at(tyreShape().rotateY(level * 0.9), (level % 2 === 0 ? 1 : -1) * 0.012, HEIGHT / 2 + level * HEIGHT, (level % 3 === 0 ? 1 : -1) * 0.01),
  );
  // A dark disc low in the hole, so looking down the stack does not show the grass through it.
  const floor = paintBy(new THREE.CircleGeometry(0.27, 16).rotateX(-Math.PI / 2), () => 0x0a0a0c);
  return mergeShapes([...tyres, at(floor, 0, 0.04, 0)]);
}
