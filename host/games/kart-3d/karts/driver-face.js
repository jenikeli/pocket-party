// A driver's face (M7d5), in the style of the reference game's art, not any one character's:
// large tall eyes set close together, mostly iris, with a black pupil, two crisp highlights and a smooth upper lid
// line, sitting in the face; thick smooth arched brows; a big soft nose; soft blush and freckles; and a friendly
// open smile that curves up with the cheeks, dark inside, with one smooth band of teeth and a tongue. Each part is
// built flat round the origin and laid onto the head's curve (driver-parts.js's onHead), so it hugs the face.
// `head` is driver-parts.js's head ({ at, radius }); `across` and `up` are radians from the face's middle. Used by
// the designs' buildDriver (karts/drivers/).

import * as THREE from 'three';
import { painted, ball } from './part-shapes.js';
import { onHead } from './driver-parts.js';

const EYE_WHITE_HEX = 0xfbfbf8;
const PUPIL_HEX = 0x0e0f13;
const LID_HEX = 0x3a2016;
const MOUTH_HEX = 0x5a1216;
const TONGUE_HEX = 0xe8606e;
const TEETH_HEX = 0xfafaf6;

// Two eyes (glossy parts), `size` tall, `across` either side of the middle and `up` from it, with an `iris` colour.
export function eyes(head, { size, across, up, iris }) {
  const width = size * 0.66;
  return [1, -1].flatMap((side) => {
    // Seen from in front the head's left (+x) is on the right; the irises look a little inward and down.
    const inward = -side * width * 0.06;
    const layers = [
      oval(width / 2, size / 2, size * 0.12, [0, 0, -size * 0.03], EYE_WHITE_HEX, 12),
      oval(width * 0.41, size * 0.36, size * 0.05, [inward, -size * 0.07, size * 0.045], iris, 12),
      oval(width * 0.21, size * 0.2, size * 0.04, [inward, -size * 0.07, size * 0.075], PUPIL_HEX, 10),
      oval(size * 0.075, size * 0.09, size * 0.02, [inward + side * width * 0.13, size * 0.07, size * 0.1], EYE_WHITE_HEX, 8),
      oval(size * 0.035, size * 0.035, size * 0.015, [inward - side * width * 0.12, -size * 0.17, size * 0.1], EYE_WHITE_HEX, 6),
    ];
    return [...layers, upperLid(width, size)].map((layer) => onHead(layer, head, { across: side * across, up }));
  });
}

// The smooth dark line along an eye's top, thickest in the middle.
function upperLid(width, size) {
  const points = Array.from({ length: 9 }, (unused, step) => {
    const angle = Math.PI * (0.1 + 0.8 * (step / 8));
    return new THREE.Vector3((width / 2) * 1.03 * Math.cos(angle), (size / 2) * 1.03 * Math.sin(angle), size * 0.06);
  });
  return painted(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, size * 0.045, 6, false), LID_HEX, { crease: 0 });
}

// Thick, smooth, arched brows (matte), `length` long, tilted down toward the nose by `tilt` radians.
export function eyebrows(head, { across, up, length, thickness, tilt, hex }) {
  return [1, -1].map((side) => {
    const bend = length * 0.9;
    const points = Array.from({ length: 7 }, (unused, step) => {
      const angle = Math.PI * (0.32 + 0.36 * (step / 6));
      return new THREE.Vector3(bend * Math.cos(angle), bend * Math.sin(angle) - bend * 0.92, thickness * 0.4);
    });
    const brow = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, thickness / 2, 8, false).rotateZ(-side * tilt);
    const ends = [points[0], points[points.length - 1]].map((point) =>
      new THREE.SphereGeometry(thickness / 2, 8, 6).translate(point.x, point.y, point.z).rotateZ(-side * tilt),
    );
    return [brow, ...ends].map((part) => painted(onHead(part, head, { across: side * across, up }), hex, { crease: 0 }));
  }).flat();
}

// A big soft nose (skin), `radius` round.
export function nose(head, { radius, up, hex }) {
  return onHead(ball(radius, [1.1, 0.95, 0.9], [0, 0, radius * 0.45], hex, { detail: 18, crease: 0.1 }), head, { across: 0, up });
}

// Soft blush on the cheeks (skin parts) and, only if `freckleHex` is given, freckles over the nose and the tops of
// the cheeks (matte parts; an empty list otherwise).
export function cheeks(head, { across, up, radius, blushHex, freckleHex = null }) {
  const blush = [1, -1].map((side) => onHead(painted(new THREE.CircleGeometry(radius, 20).scale(1, 0.75, 1), blushHex, { crease: 0 }), head, { across: side * across, up, lift: 0.002 }));
  const freckleSpots = [[0.12, -0.04], [0.18, -0.09], [0.25, -0.05], [0.21, -0.01], [0.29, -0.1]];
  const freckles = freckleHex === null ? [] : [1, -1].flatMap((side) =>
    freckleSpots.map(([freckleAcross, freckleUp]) =>
      onHead(painted(new THREE.CircleGeometry(radius * 0.13, 8), freckleHex, { crease: 0 }), head, { across: side * freckleAcross, up: up + 0.12 + freckleUp, lift: 0.004 }),
    ),
  );
  return { blush, freckles };
}

// A friendly open smile (matte parts), `width` across: its top edge curves up to the corners, its bottom is a deep
// round curve; a band of teeth along the top and a tongue in the bottom.
export function smile(head, { width, up }) {
  const half = width / 2;
  const cornerLift = width * 0.16;
  const depth = width * 0.36;
  const topAt = (x) => cornerLift * (x / half) ** 2;
  const bottomAt = (x) => cornerLift - (cornerLift + depth) * Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
  const across = (from, to, count) => Array.from({ length: count }, (unused, step) => from + ((to - from) * step) / (count - 1));
  const mouth = new THREE.Shape([
    ...across(-half, half, 17).map((x) => new THREE.Vector2(x, topAt(x))),
    ...across(half, -half, 17).slice(1, -1).map((x) => new THREE.Vector2(x, bottomAt(x))),
  ]);
  // One even band of teeth, its ends rounded off rather than pointed (pointed ends read as fangs).
  const teethHalf = half * 0.62;
  const band = width * 0.09;
  const teeth = new THREE.Shape([
    ...across(-teethHalf, teethHalf, 13).map((x) => new THREE.Vector2(x, topAt(x) - 0.002)),
    ...across(teethHalf, -teethHalf, 13).map((x) => new THREE.Vector2(x, topAt(x) - band * Math.sqrt(Math.max(0, 1 - (x / teethHalf) ** 8)))),
  ]);
  const tongue = new THREE.CircleGeometry(1, 16).scale(half * 0.42, depth * 0.3, 1).translate(0, -depth * 0.62, 0);
  return [
    onHead(painted(new THREE.ShapeGeometry(mouth), MOUTH_HEX, { crease: 0 }), head, { across: 0, up, lift: 0.003 }),
    onHead(painted(tongue, TONGUE_HEX, { crease: 0 }), head, { across: 0, up, lift: 0.005 }),
    onHead(painted(new THREE.ShapeGeometry(teeth), TEETH_HEX, { crease: 0 }), head, { across: 0, up, lift: 0.006 }),
  ];
}

// An oval `width` by `height` by `depth` (radii) at `at` in the face's flat axes, coloured `hex`, `detail` round.
function oval(width, height, depth, at, hex, detail) {
  return ball(1, [width, height, depth], at, hex, { detail, crease: 0 });
}
