// Bruno's own parts (M7d5), the ones only a bear in a check shirt has: the red and black buffalo check painted on
// a part square by square, a checked sleeve, the light round muzzle with its black nose and smile, and the round
// ears. Used by drivers/bruno.js.

import * as THREE from 'three';
import { ball, painted, along } from '../part-shapes.js';
import { head, headDirection, onHead } from '../driver-parts.js';
import { smile } from '../driver-face.js';

export const CHECK_RED = 0xc8302a;
const CHECK_DARK_RED = 0x6e1a18;
const CHECK_BLACK = 0x1c1a1c;
const NOSE_HEX = 0x1b1416;

// Paints `geometry` (in place, with texture coordinates running round it in u and along it in v) in a buffalo
// check, `columns` squares round and `rows` along: red, black where a black stripe crosses a black band, and dark
// red where only one of them passes. Each triangle takes one colour, from its middle, so the squares' edges stay
// sharp instead of blending from corner to corner; for that the geometry is unshared first (every triangle gets
// its own corners) and given a plain index again, so it still merges with the other, indexed, parts. If `columns`
// and `rows` divide the shape's own segments, every edge of a square runs along a seam of triangles. Returns the
// new geometry; `geometry` is disposed.
export function buffaloCheck(geometry, { columns, rows }) {
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.setIndex(Array.from({ length: flat.attributes.position.count }, (unused, index) => index));
  painted(flat, 0xffffff, { crease: 0.2 });
  const { uv, color } = flat.attributes;
  const colours = [CHECK_RED, CHECK_DARK_RED, CHECK_BLACK].map((hex) => new THREE.Color(hex));
  for (let first = 0; first < uv.count; first += 3) {
    const u = (uv.getX(first) + uv.getX(first + 1) + uv.getX(first + 2)) / 3;
    const v = (uv.getY(first) + uv.getY(first + 1) + uv.getY(first + 2)) / 3;
    const stripes = (Math.floor(u * columns) % 2 === 0 ? 1 : 0) + (Math.floor(v * rows) % 2 === 0 ? 1 : 0);
    const colour = colours[stripes];
    for (let corner = first; corner < first + 3; corner += 1) {
      color.setXYZ(corner, color.getX(corner) * colour.r, color.getY(corner) * colour.g, color.getZ(corner) * colour.b);
    }
  }
  return flat;
}

// A checked sleeve (cloth): a capsule `radius` thick from `from` to `to`, finely cut so the check reads on it.
export function checkedLimb(from, to, radius) {
  const [start, end] = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  const shape = new THREE.CapsuleGeometry(radius, Math.max(start.distanceTo(end), 0.001), 3, 16, 4);
  return buffaloCheck(along(shape, start, end), { columns: 8, rows: 5 });
}

// The muzzle on the head `face` ({ at, radius }): a light round snout bulging from the face's lower front, itself
// a small head (driver-parts.js) so the shared smile can lie on its curve, a big glossy black nose on its top and
// the smile below. Returns { skin, glossy, matte } parts.
export function muzzle(face, { radius, hex }) {
  const centre = new THREE.Vector3(...face.at).addScaledVector(headDirection(0, -0.45), face.radius * 0.92);
  const snout = head(centre.toArray(), radius, hex);
  const nose = onHead(ball(1, [radius * 0.45, radius * 0.31, radius * 0.3], [0, 0, radius * 0.18], NOSE_HEX, { detail: 16, crease: 0 }), snout, { across: 0, up: 0.42 });
  return {
    skin: [snout.shape],
    glossy: [nose],
    matte: smile(snout, { width: radius * 0.95, up: -0.32 }),
  };
}

// Two round ears high on the head `face`, `size` round, in `hex` with a light inner `innerHex`, turned a little
// outward from facing forward, as a teddy bear's are. Returns { matte (the outer ears), skin (the inner ones) }.
export function ears(face, { size, hex, innerHex }) {
  const centre = new THREE.Vector3(...face.at);
  const sides = [1, -1].map((side) => {
    const at = centre.clone().addScaledVector(headDirection(side * 0.78, 0.72), face.radius * 0.96);
    const turn = (shape) => shape.rotateY(side * 0.35).rotateX(-0.2).translate(at.x, at.y, at.z);
    const outer = turn(ball(size, [1, 1, 0.6], [0, 0, 0], hex, { detail: 16, crease: 0.15 }));
    const inner = turn(ball(size * 0.62, [1, 1, 0.35], [0, -size * 0.06, size * 0.4], innerHex, { detail: 14, crease: 0 }));
    return { outer, inner };
  });
  return { matte: sides.map(({ outer }) => outer), skin: sides.map(({ inner }) => inner) };
}
