// Pip's own parts (M7d5), the ones only a penguin has: a way to paint a part in two colours by where each point is
// (a white belly on the dark body), the white face mask, a soft open beak that smiles, the knitted beanie with its
// band and pom-pom, orange webbed feet, and red and white stripes on the shared scarf. Used by drivers/pip.js.

import * as THREE from 'three';
import { ball, painted } from '../part-shapes.js';
import { onHead } from '../driver-parts.js';
import { smile } from '../driver-face.js';

const BEAK_HEX = 0xf59a2a;
// The beanie's crown: how far down it reaches from its top (radians, just short of a half ball, where the band
// sits) and how much taller than round it is, so it sits up off the head like a knitted hat.
const CROWN_REACH = 1.5;
const CROWN_HEIGHT = 1.12;
// How far down the crown's front the emblem's badge sits (radians from the top), just above the band.
const BADGE_DOWN = 1.05;

// Multiplies each vertex colour of `geometry` (painted white, so it holds only the crease's shade) by
// `colourAt(index, point)`, a THREE.Color, so one smooth part can carry two colours without a seam.
function recolour(geometry, colourAt) {
  const { position, color } = geometry.attributes;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    const colour = colourAt(index, point.fromBufferAttribute(position, index));
    color.setXYZ(index, color.getX(index) * colour.r, color.getY(index) * colour.g, color.getZ(index) * colour.b);
  }
  return geometry;
}

// 1 well inside an oval `across` by `up` radians round the front of a ball (its middle `lower` radians below
// straight ahead), 0 outside it, with a soft edge between.
export function frontOval(across, up, lower) {
  return (direction) => {
    const turn = Math.atan2(direction.x, direction.z);
    const rise = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    const reach = Math.hypot(turn / across, (rise + lower) / up);
    return THREE.MathUtils.smoothstep(1.08 - reach, 0, 0.16);
  };
}

// The white face mask (a matte part): an oval `width` by `height` laid on the dark head ({ at, radius }) `up`
// radians below the face's middle. A ring of rings rather than a flat disc, so it has points all over to bend round
// the head's curve.
export function faceMask(face, { width, height, up, hex }) {
  const oval = new THREE.RingGeometry(0.001, 1, 32, 7);
  // The mask's top dips toward the middle in a soft point between the brows, as a penguin's does.
  const { position } = oval.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y] = [position.getX(index), position.getY(index)];
    const dip = 1 - 0.22 * Math.exp(-(((Math.atan2(y, x) - Math.PI / 2) / 0.4) ** 2));
    position.setXY(index, (x * dip * width) / 2, (y * dip * height) / 2);
  }
  return onHead(painted(oval, hex, { crease: 0 }), face, { across: 0, up, lift: 0.003 });
}

// The open beak: the shared smile (driver-face.js) `width` across at `up` radians below the face's middle, a soft
// rounded upper beak over its top edge (hiding the teeth, which a bird has not got), bent up at the corners along
// the smile's top, and a thin rim along its bottom for the lower beak. The beak is in skin parts, so it stays bright
// orange in the kart's shade. Returns { skin, matte } parts.
export function beak(face, { up, width }) {
  const half = width / 2;
  // The smile's own curves (driver-face.js): its top rises to the corners, its bottom is a deep round curve.
  const cornerLift = width * 0.16;
  const depth = width * 0.36;
  const upper = ball(1, [half * 1.15, half * 0.42, half * 0.6], [0, half * 0.24, half * 0.35], BEAK_HEX, { detail: 16, crease: 0.1 });
  const rimRadius = width * 0.06;
  const rimPoints = Array.from({ length: 11 }, (unused, step) => {
    const x = half * 1.02 * (step / 5 - 1);
    const bottom = cornerLift - (cornerLift + depth) * Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
    return new THREE.Vector3(x, bottom - rimRadius * 0.4, rimRadius * 0.5);
  });
  const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints), 16, rimRadius, 8, false);
  return {
    skin: [bendUp(upper, cornerLift / half ** 2), painted(rim, BEAK_HEX, { crease: 0 })].map((part) => onHead(part, face, { across: 0, up })),
    matte: smile(face, { width, up }),
  };
}

// Lifts each point of `shape` by `bend` times the square of how far across it is, so its corners curve up.
function bendUp(shape, bend) {
  const { position } = shape.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    position.setY(index, position.getY(index) + bend * x * x);
  }
  return shape;
}

// The knitted beanie on the head ({ at, radius }), tipped back by `tilt` radians: a ribbed crown in `hex`, a fat
// turned-up band in `bandHex` across the forehead and a big fluffy pom-pom in `bandHex` on top. Returns { cloth
// (parts), emblemAt (where the emblem's badge sits on its front), emblemNormal }.
export function beanie({ at, radius }, { scale, tilt, hex, bandHex }) {
  const crownRadius = radius * scale;
  const onCap = (shape) => shape.rotateX(-tilt).translate(...at);
  // Sixteen ribs round the crown: each point moves out and in a little with the angle round it.
  const crown = new THREE.SphereGeometry(crownRadius, 48, 12, 0, Math.PI * 2, 0, CROWN_REACH);
  const { position } = crown.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const rib = 1 + 0.025 * Math.cos(16 * Math.atan2(position.getX(index), position.getZ(index)));
    position.setXYZ(index, position.getX(index) * rib, position.getY(index) * CROWN_HEIGHT, position.getZ(index) * rib);
  }
  crown.computeVertexNormals();
  const band = new THREE.TorusGeometry(crownRadius * Math.sin(CROWN_REACH) + 0.01, 0.04, 8, 40).rotateX(Math.PI / 2).scale(1, 1.6, 1)
    .translate(0, crownRadius * Math.cos(CROWN_REACH) * CROWN_HEIGHT, 0);
  const pompom = fluffyBall(radius * 0.4).translate(0, crownRadius * CROWN_HEIGHT + radius * 0.3, 0);
  const badgeOut = new THREE.Vector3(0, Math.cos(BADGE_DOWN) * CROWN_HEIGHT, Math.sin(BADGE_DOWN)).applyAxisAngle(new THREE.Vector3(1, 0, 0), -tilt);
  const emblemAt = badgeOut.clone().multiplyScalar(crownRadius * 1.04).add(new THREE.Vector3(...at));
  return {
    cloth: [painted(onCap(crown), hex, { crease: 0.1 }), painted(onCap(band), bandHex, { crease: 0 }), painted(onCap(pompom), bandHex, { crease: 0.2 })],
    emblemAt: emblemAt.toArray(),
    emblemNormal: badgeOut.normalize().toArray(),
  };
}

// A ball `radius` round with soft lumps all over it, like a wool pom-pom.
function fluffyBall(radius) {
  const shape = new THREE.SphereGeometry(radius, 24, 16);
  const { position } = shape.attributes;
  const point = new THREE.Vector3();
  const frequency = 7 / radius;
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const lumps = 1 + 0.07 * Math.sin(point.x * frequency) * Math.sin(point.y * frequency * 0.9) * Math.sin(point.z * frequency * 0.8 + 1);
    point.multiplyScalar(lumps);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  shape.computeVertexNormals();
  return shape;
}

// An orange webbed foot (skin parts) resting at `foot` ([x, y, z]), `length` long: a broad flat sole and three
// round toes fanned across its front.
export function webbedFoot(foot, length) {
  const [x, y, z] = foot;
  const toes = [-1, 0, 1].map((step) =>
    ball(length * 0.17, [1, 0.55, 1.5], [x + step * length * 0.24, y - length * 0.04, z + length * 0.36 - Math.abs(step) * length * 0.06], BEAK_HEX, { detail: 10, crease: 0.15 }),
  );
  return [ball(length / 2, [0.8, 0.32, 0.9], [x, y, z], BEAK_HEX, { detail: 14, crease: 0.25 }), ...toes];
}

// Paints the shared scarf's parts (driver-parts.js's scarf, painted white: the roll, then the two tails) in stripes
// of `hex` and `otherHex` by their texture coordinates' u: `rollCount` round the roll, `tailCount` along each tail.
export function striped(scarfParts, { hex, otherHex, rollCount, tailCount }) {
  const [colour, otherColour] = [new THREE.Color(hex), new THREE.Color(otherHex)];
  return scarfParts.map((part, partIndex) => {
    const count = partIndex === 0 ? rollCount : tailCount;
    const { uv } = part.attributes;
    return recolour(part, (index) => (Math.floor(uv.getX(index) * count) % 2 === 0 ? colour : otherColour));
  });
}
