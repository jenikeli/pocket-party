// A boat's rail (M7d4d): thin posts standing on a path along the deck's edge, joined by one or two wires along
// their tops. Used by sailboat.js (lifelines) and motor-yacht.js (the foredeck's rail, the flybridge's). Few
// segments, as a rail is thin and seen small.

import * as THREE from 'three';
import { at, between, coloured } from '../shape-utils.js';

const POST_RADIUS = 0.035;
const WIRE_RADIUS = 0.022;

// A rail along `path`, a list of [x, y, z] points on the deck: a post at each, `height` tall, and wires at each
// fraction of the height in `wireLevels` joining neighbouring posts. Returns the geometries, all in `hex`.
export function railAlong(path, height, hex, wireLevels = [1, 0.5]) {
  const parts = [];
  path.forEach(([x, y, z], index) => {
    parts.push(coloured(at(new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, height, 5), x, y + height / 2, z), hex));
    if (index === 0) {
      return;
    }
    const [lastX, lastY, lastZ] = path[index - 1];
    for (const level of wireLevels) {
      const wire = new THREE.CylinderGeometry(WIRE_RADIUS, WIRE_RADIUS, 1, 4);
      parts.push(coloured(between(wire, [lastX, lastY + height * level, lastZ], [x, y + height * level, z]), hex));
    }
  });
  return parts;
}

// `count + 1` points evenly spaced between two points, to feed railAlong with a straight run.
export function evenPoints(from, to, count) {
  return Array.from({ length: count + 1 }, (_, index) => from.map((value, axis) => value + ((to[axis] - value) * index) / count));
}
