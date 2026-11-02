// The parts only Fern the frog has (M7d5): a way to squash her head and its face together, skin in two tones (a
// pale throat and belly), the twin racing stripes on her vest, and long frog's legs folded up with webbed feet.
// Used by fern.js. Every place is [x, y, z] in the kart's axes (kart-layout.js).

import * as THREE from 'three';
import { painted, ball, limb } from '../part-shapes.js';

// `shape` stretched by `stretch` ([x, y, z]) round `at`, so a head and the face laid on it (driver-parts.js's
// onHead) squash together and the face stays on its surface. Returns `shape`.
export function squashed(shape, at, stretch) {
  return shape.translate(-at[0], -at[1], -at[2]).scale(...stretch).translate(...at);
}

// Recolours `shape` (already painted) toward `hex` where `shareAt(direction)` is above 0, fully where it is 1 or
// more, `direction` being the unit vector from `centre` to the vertex; the blend is smoothed, so the edge is soft.
// Returns `shape`.
export function twoTone(shape, centre, hex, shareAt) {
  const { position, color } = shape.attributes;
  const other = new THREE.Color(hex);
  const middle = new THREE.Vector3(...centre);
  const direction = new THREE.Vector3();
  const blended = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    direction.fromBufferAttribute(position, index).sub(middle).normalize();
    const share = THREE.MathUtils.smoothstep(shareAt(direction), 0, 1);
    blended.setRGB(color.getX(index), color.getY(index), color.getZ(index)).lerp(other, share);
    color.setXYZ(index, blended.r, blended.g, blended.b);
  }
  return shape;
}

// Two stripes running over the vest from its hem up and over the shoulders, either side of the middle, front and
// back: thin slices of a ball just bigger than the body's chest (driver-parts.js's body, `shape` its sizes), its
// middle at `chest`.
export function vestStripes(chest, { width, height, depth }, hex) {
  const radius = (width / 2) * 1.015;
  const stretch = [1, (height * 0.5) / width, depth / width];
  // Three.js's ball runs round from -x through +z (its front, a quarter turn in) and -z.
  const middles = [Math.PI / 2 - 0.34, Math.PI / 2 + 0.34, Math.PI * 1.5 - 0.42, Math.PI * 1.5 + 0.42];
  return middles.map((middle) => {
    const slice = new THREE.SphereGeometry(radius, 3, 14, middle - 0.08, 0.16).scale(...stretch).translate(...chest);
    return painted(slice, hex, { crease: 0.1 });
  });
}

// A long frog's leg from `hip` folded up, its knee high and out beside the steering wheel, and down to a webbed
// foot at `foot`: three toes fanned forward with round pads, joined by a thin web. In `skin`, the toes and web in
// `toes`. Returns the parts (glossy).
export function frogLeg(hip, foot, { skin, toes }) {
  const side = Math.sign(hip[0]);
  const knee = [hip[0] + side * 0.2, 0.74, (hip[2] + foot[2]) / 2 - 0.02];
  const ankle = [foot[0] + side * 0.02, foot[1] + 0.1, foot[2] - 0.13];
  const parts = [
    limb(hip, knee, 0.09, skin),
    limb(knee, ankle, 0.065, skin),
    ball(0.075, [1.05, 0.45, 1.25], [foot[0], foot[1] + 0.02, foot[2] - 0.03], skin, { detail: 12, crease: 0.15 }),
    ball(0.12, [1, 0.16, 0.85], [foot[0], foot[1], foot[2] + 0.07], toes, { detail: 14, crease: 0 }),
  ];
  [-0.6, 0, 0.6].forEach((turn) => {
    const tip = [foot[0] + Math.sin(turn) * 0.15, foot[1] + 0.005, foot[2] + Math.cos(turn) * 0.15];
    parts.push(limb([foot[0], foot[1] + 0.01, foot[2]], tip, 0.022, toes, { detail: 6, crease: 0 }));
    parts.push(ball(0.034, [1, 0.7, 1], tip, toes, { detail: 10, crease: 0 }));
  });
  return parts;
}
