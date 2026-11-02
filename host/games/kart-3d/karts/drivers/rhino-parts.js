// The parts only Rhino has (M7d5): a rhino's head (the shared round head in grey hide, a broad pale snout with a big
// horn on it and a small one behind, small ears and wrinkles at the brow) and his open-face motocross helmet (white
// with an orange stripe over the top, a grey rubber rim round the face, a peak, goggles on an orange strap). Used by
// rhino.js. Every place is [x, y, z] in the kart's axes (kart-layout.js).

import * as THREE from 'three';
import { painted, ball } from '../part-shapes.js';
import { head, headDirection, onHead, squashed } from '../driver-parts.js';
import { eyes, eyebrows, cheeks, smile } from '../driver-face.js';

const NOSTRIL_HEX = 0x2a2e31;
const INNER_EAR_HEX = 0xd9a3a0;
const SNOUT_RADIUS = 0.17;
// The snout is a small round head (so the smile hugs it) widened and pushed forward, as a rhino's broad upper lip.
const SNOUT_STRETCH = [1.35, 0.95, 1.3];

// The helmet: how much bigger than the head, and where its edges are (radians up from the head's middle, as
// driver-parts.js's headDirection): its rim over the brow, its bottom edge round the sides and back, and how far
// either side of straight ahead the face's opening reaches.
const HELMET_SCALE = 1.14;
const TOP_EDGE = 0.7;
const BOTTOM_EDGE = -0.5;
const OPENING = 0.84;
// The goggles sit on the helmet's front between its rim and its peak.
const GOGGLE_UP = 0.86;
const GOGGLE_HALF_HEIGHT = 0.15;
const GOGGLE_ACROSS = 0.62;
const PEAK_UP = 1.3;

// Rhino's head `radius` round at `at`, its parts sorted into `parts`; returns the head ({ at, radius }) for the
// helmet. `colours` is { hide, snout, wrinkle, horn, iris }. His hide is in the skin kind, whose faint glow in its
// own grey keeps it light in the shade of the helmet and the kart.
export function addRhinoHead(parts, at, radius, colours) {
  const face = head(at, radius, colours.hide);
  parts.skin.push(withoutHidden(face.shape, (point) => underHelmet(point.clone().sub(new THREE.Vector3(...at)).normalize())));
  parts.glossy.push(...eyes(face, { size: 0.15, across: 0.3, up: 0.25, iris: colours.iris }));
  parts.matte.push(...eyebrows(face, { across: 0.3, up: 0.52, length: 0.085, thickness: 0.036, tilt: 0.16, hex: colours.wrinkle }));
  parts.skin.push(...cheeks(face, { across: 0.55, up: -0.1, radius: 0.05, blushHex: 0xe9a4a0 }).blush);
  addWrinkles(parts, face, colours.wrinkle);
  addSnout(parts, face, colours);
  [1, -1].forEach((side) => addEar(parts, face, side, colours.hide));
  return face;
}

// Two soft folds across the forehead between the brows, curving down at their ends.
function addWrinkles(parts, face, hex) {
  [[0.6, 0.065], [0.65, 0.045]].forEach(([up, half]) => {
    const points = [-1, -0.5, 0, 0.5, 1].map((share) => new THREE.Vector3(share * half, -half * 0.25 * share * share, 0.004));
    const fold = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, 0.012, 5, false);
    parts.matte.push(painted(onHead(fold, face, { across: 0, up }), hex, { crease: 0 }));
  });
}

// The snout low on the face's front, pale, with two nostrils and the smile under them; the big horn rises from its
// top near the front, curving back, and the small one from its top behind.
function addSnout(parts, face, colours) {
  const centre = new THREE.Vector3(...face.at).addScaledVector(headDirection(0, -0.5), face.radius * 0.9).toArray();
  const snout = head(centre, SNOUT_RADIUS, colours.snout);
  const nostrils = [1, -1].map((side) => onHead(ball(0.022, [1.3, 0.75, 0.45], [0, 0, 0], NOSTRIL_HEX, { detail: 10, crease: 0 }), snout, { across: side * 0.34, up: 0.12 }));
  parts.skin.push(squashed(snout.shape, centre, SNOUT_STRETCH));
  [...nostrils, ...smile(snout, { width: 0.15, up: -0.42 })].forEach((shape) => parts.matte.push(squashed(shape, centre, SNOUT_STRETCH)));
  withoutHidden(snout.shape, (point) => point.distanceTo(new THREE.Vector3(...face.at)) < face.radius * 0.88);
  // The snout's top, squashed as the snout is: where the horns stand.
  const onTop = (up) => {
    const out = headDirection(0, up).multiplyScalar(SNOUT_RADIUS * 0.92);
    return [centre[0], centre[1] + out.y * SNOUT_STRETCH[1], centre[2] + out.z * SNOUT_STRETCH[2]];
  };
  const front = onTop(0.5);
  const back = onTop(1.05);
  parts.matte.push(horn(front, [front[0], front[1] + 0.17, front[2] - 0.04], 0.056, colours.horn));
  parts.matte.push(horn(back, [back[0], back[1] + 0.085, back[2] - 0.03], 0.036, colours.horn));
}

// A horn from `root` to `tip`, bulging forward on its way up and so curving back at its tip, `rootRadius` thick at
// its root and tapering to a rounded point, in `hex`, darker toward its root.
function horn(root, tip, rootRadius, hex) {
  const [start, end] = [new THREE.Vector3(...root), new THREE.Vector3(...tip)];
  const bulge = start.clone().lerp(end, 0.45).add(new THREE.Vector3(0, 0, start.distanceTo(end) * 0.22));
  const curve = new THREE.CatmullRomCurve3([start, bulge, end]);
  const rings = 10;
  const corners = 10;
  const shape = new THREE.TubeGeometry(curve, rings, 1, corners, false);
  const { position } = shape.attributes;
  const centre = new THREE.Vector3();
  const point = new THREE.Vector3();
  for (let ring = 0; ring <= rings; ring += 1) {
    const share = ring / rings;
    curve.getPointAt(share, centre);
    // A power under 1 keeps the horn full most of the way and rounds its point.
    const radius = rootRadius * Math.max(0.04, (1 - share) ** 0.7);
    for (let corner = 0; corner <= corners; corner += 1) {
      const index = ring * (corners + 1) + corner;
      point.fromBufferAttribute(position, index).sub(centre).multiplyScalar(radius).add(centre);
      position.setXYZ(index, point.x, point.y, point.z);
    }
  }
  shape.computeVertexNormals();
  return painted(shape, hex, { crease: 0.35, reach: 0.5 });
}

// A small round ear on the head's `side` (1 its left), poking up out of the helmet's top and leaning out, in hide
// with a pink inside on its front.
function addEar(parts, { at, radius }, side, hide) {
  const base = new THREE.Vector3(...at).addScaledVector(headDirection(side * 1.2, 0.85), radius * HELMET_SCALE * 0.95);
  const place = (shape) => shape.rotateX(-0.2).rotateZ(-side * 0.85).translate(base.x, base.y, base.z);
  parts.skin.push(place(ball(0.09, [0.62, 1.15, 0.42], [0, 0.08, 0], hide, { detail: 12, crease: 0.15 })));
  parts.skin.push(place(ball(0.06, [0.6, 1.05, 0.25], [0, 0.09, 0.02], INNER_EAR_HEX, { detail: 10, crease: 0 })));
}

// The open-face motocross helmet on `head` ({ at, radius }). `colours` is { shell, stripe, rim, frame, lens,
// strap }.
export function addHelmet(parts, { at, radius }, colours) {
  const size = radius * HELMET_SCALE;
  const place = (shape) => shape.translate(...at);
  // The crown round the top down to the rim over the brow, and the sides and back, open at the face.
  const crown = slice(size, [0, Math.PI * 2], [TOP_EDGE - 0.02, Math.PI / 2], [28, 7]);
  const sides = slice(size, [OPENING, Math.PI * 2 - OPENING], [BOTTOM_EDGE, TOP_EDGE], [24, 7]);
  parts.glossy.push(painted(place(crown), colours.shell, { crease: 0 }), painted(place(sides), colours.shell, { crease: 0.12 }));
  // The stripe runs from the rim over the top to the bottom edge at the back: a band round a ball whose poles are
  // either side of the head, so the band's middle runs front to back over the top.
  const width = 0.15;
  const stripe = new THREE.SphereGeometry(size * 1.008, 36, 2, Math.PI / 2 + TOP_EDGE, Math.PI - TOP_EDGE - BOTTOM_EDGE, Math.PI / 2 - width, width * 2).rotateZ(Math.PI / 2);
  parts.glossy.push(painted(place(stripe), colours.stripe, { crease: 0 }));
  // Round the back along the bottom edge, up the opening's right side, over the brow and down its left side.
  const rimCorners = [[OPENING, BOTTOM_EDGE], [Math.PI * 2 - OPENING, BOTTOM_EDGE], [Math.PI * 2 - OPENING, TOP_EDGE], [Math.PI * 2 + OPENING, TOP_EDGE], [Math.PI * 2 + OPENING, BOTTOM_EDGE]];
  parts.matte.push(painted(place(loopOnBall(size, rimCorners, 0.02)), colours.rim, { crease: 0 }));
  const peakAt = headDirection(0, PEAK_UP).multiplyScalar(size);
  const peak = ball(1, [0.21, 0.022, 0.21], [0, 0, 0], colours.shell, { detail: 14, crease: 0 }).rotateX(-0.3).translate(peakAt.x, peakAt.y, peakAt.z + 0.04);
  parts.glossy.push(place(peak));
  addGoggles(parts, at, size, colours);
}

// Motocross goggles on the helmet's front: one wide mirrored lens in a thick dark frame, on a strap round the helmet.
function addGoggles(parts, at, size, { frame, lens, strap }) {
  const place = (shape) => shape.translate(...at);
  const [low, high] = [GOGGLE_UP - GOGGLE_HALF_HEIGHT, GOGGLE_UP + GOGGLE_HALF_HEIGHT];
  const glass = slice(size + 0.032, [-GOGGLE_ACROSS, GOGGLE_ACROSS], [low, high], [16, 4]);
  parts.glossy.push(painted(place(glass), lens, { crease: 0 }));
  const frameCorners = [[-GOGGLE_ACROSS, low], [GOGGLE_ACROSS, low], [GOGGLE_ACROSS, high], [-GOGGLE_ACROSS, high], [-GOGGLE_ACROSS, low]];
  parts.matte.push(painted(place(loopOnBall(size + 0.026, frameCorners, 0.021)), frame, { crease: 0 }));
  const ring = new THREE.TorusGeometry(Math.cos(GOGGLE_UP) * size + 0.012, 0.02, 4, 24).rotateX(Math.PI / 2).scale(1, 2, 1);
  parts.cloth.push(painted(place(ring.translate(0, Math.sin(GOGGLE_UP) * size, 0)), strap, { crease: 0 }));
}

// A piece of a ball `radius` round about the origin, between `across` and `up` (each [from, to], radians as
// headDirection's), with `segments` ([across, up]).
function slice(radius, [acrossFrom, acrossTo], [upFrom, upTo], [acrossSegments, upSegments]) {
  // Three.js's ball runs its angle round from -x, so straight ahead (+z) is a quarter turn in.
  return new THREE.SphereGeometry(radius, acrossSegments, upSegments, acrossFrom + Math.PI / 2, acrossTo - acrossFrom, Math.PI / 2 - upTo, upTo - upFrom);
}

// A closed tube `thickness` round on a ball `radius` round about the origin, through `corners` ([across, up] each,
// radians as headDirection's) in turn, straight between them in those angles: a rim. The last corner is where the
// first is (perhaps a whole turn round), closing the loop.
function loopOnBall(radius, corners, thickness) {
  const points = corners.slice(0, -1).flatMap((corner, index) => {
    const next = corners[index + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(next[0] - corner[0], next[1] - corner[1]) / 0.2));
    return Array.from({ length: steps }, (unused, step) => {
      const share = step / steps;
      return headDirection(corner[0] + (next[0] - corner[0]) * share, corner[1] + (next[1] - corner[1]) * share).multiplyScalar(radius);
    });
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), points.length, thickness, 5, true);
}

// Whether the way `direction` (a unit vector from the head's middle) points is under the helmet's shell, with a
// margin so no triangle that reaches the face's opening is dropped.
function underHelmet(direction) {
  const up = Math.asin(direction.y);
  const across = Math.atan2(direction.x, direction.z);
  return up > TOP_EDGE + 0.18 || (up > BOTTOM_EDGE + 0.18 && Math.abs(across) > OPENING + 0.22);
}

// `shape` without the triangles whose three corners are all `hidden(point)`: the head under the helmet and the
// snout's back inside the head, which nobody sees, so they cost none of the driver's triangles. Returns `shape`.
function withoutHidden(shape, hidden) {
  const { position } = shape.attributes;
  const point = new THREE.Vector3();
  const isHidden = Array.from({ length: position.count }, (unused, vertex) => hidden(point.fromBufferAttribute(position, vertex)));
  const corners = shape.index.array;
  const kept = [];
  for (let first = 0; first < corners.length; first += 3) {
    const triangle = [corners[first], corners[first + 1], corners[first + 2]];
    if (!triangle.every((vertex) => isHidden[vertex])) {
      kept.push(...triangle);
    }
  }
  shape.setIndex(kept);
  return shape;
}
