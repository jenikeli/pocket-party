// The parts only Rusty the fox has (M7d5): a fox's head (the shared round head in orange fur, white from below the
// eyes down, a long pointed muzzle with a black nose and the smile under it, tall pointed ears with dark tips and
// white ruffs at the cheeks) and a big bushy tail with a white tip curling up behind the seat. Used by rusty.js.
// Every place is [x, y, z] in the kart's axes (kart-layout.js).

import * as THREE from 'three';
import { painted, ball } from '../part-shapes.js';
import { head, headDirection, onHead } from '../driver-parts.js';
import { eyes, eyebrows, cheeks, smile } from '../driver-face.js';
import { twoTone } from './fern-parts.js';

const NOSE_HEX = 0x1b1416;
const INNER_EAR_HEX = 0xf6e2d2;
const MUZZLE_RADIUS = 0.15;
// The muzzle is a small round head pulled forward to a point: its front half this many times longer, and this
// much narrower at its tip than at its middle.
const MUZZLE_STRETCH = 1.9;
const MUZZLE_TAPER = 0.6;

// The fox's head `radius` round at `at`, its parts sorted into `parts`. `colours` is { fur, white, dark, brow,
// iris }. All his fur is drawn in the matte kind, not the skin kind: that one's warm glow (kept for peach faces in
// shade) turns white fur peach and dark fur orange. Only the blush and the insides of his ears are in the skin kind.
export function addFoxHead(parts, at, radius, colours) {
  const face = head(at, radius, colours.fur);
  // White from below the eyes down over the cheeks and chin, fading out round the sides; orange behind.
  twoTone(face.shape, at, colours.white, (direction) => (-direction.y - 0.12) * 8 + (direction.z - 0.3) * 2);
  parts.matte.push(face.shape);
  parts.glossy.push(...eyes(face, { size: 0.165, across: 0.21, up: 0.16, iris: colours.iris }));
  parts.matte.push(...eyebrows(face, { across: 0.23, up: 0.46, length: 0.085, thickness: 0.03, tilt: 0.12, hex: colours.brow }));
  parts.skin.push(...cheeks(face, { across: 0.5, up: -0.12, radius: 0.055, blushHex: 0xffb7a8, freckleHex: colours.white }).blush);
  addMuzzle(parts, face, colours);
  [1, -1].forEach((side) => addEar(parts, face, side, colours));
  addRuffs(parts, face, colours.white);
}

// The muzzle: a small round head (so the shared smile hugs it) set low on the face's front, white with an orange
// bridge on top running up into the forehead, then pulled forward to a point, the smile with it; a black nose on
// its tip.
function addMuzzle(parts, face, { fur, white }) {
  const centre = new THREE.Vector3(...face.at).addScaledVector(headDirection(0, -0.3), face.radius * 0.72).toArray();
  const muzzle = head(centre, MUZZLE_RADIUS, white);
  twoTone(muzzle.shape, centre, fur, (direction) => (direction.y - 0.25) * 4);
  const mouth = smile(muzzle, { width: 0.17, up: -0.48 });
  parts.matte.push(pointed(muzzle.shape, centre));
  mouth.forEach((shape) => parts.matte.push(pointed(shape, centre)));
  muzzle.shape.computeBoundingBox();
  const tip = muzzle.shape.boundingBox.max.z;
  parts.glossy.push(ball(0.045, [1.25, 0.9, 1], [centre[0], centre[1] + 0.015, tip - 0.012], NOSE_HEX, { detail: 14, crease: 0 }));
}

// `shape` round `centre` with the part in front of the centre pulled forward and narrowed toward its tip, as a
// fox's snout. Returns `shape`.
function pointed(shape, centre) {
  const { position } = shape.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index) - centre[0], position.getY(index) - centre[1], position.getZ(index) - centre[2]];
    const forward = Math.max(0, z);
    const narrowing = 1 - MUZZLE_TAPER * Math.min(1, forward / MUZZLE_RADIUS);
    position.setXYZ(index, centre[0] + x * narrowing, centre[1] + y * narrowing, centre[2] + z + forward * (MUZZLE_STRETCH - 1));
  }
  shape.computeVertexNormals();
  return shape;
}

// A tall pointed ear on the head's `side` (1 its left), flat front to back, leaning out and a little back, in fur
// with a dark tip, a pale inside on its front.
function addEar(parts, { at, radius }, side, { fur, dark }) {
  const height = 0.3;
  const base = new THREE.Vector3(...at).addScaledVector(headDirection(side * 1.38, 0.92), radius * 0.86);
  const place = (shape) => shape.rotateX(-0.18).rotateZ(-side * 0.38).translate(base.x, base.y, base.z);
  const outer = painted(leafShape(height, 0.12).scale(1, 1, 0.42), fur, { crease: 0 });
  const tipStart = height * 0.58;
  blendColour(outer, dark, (index) => THREE.MathUtils.smoothstep(outer.attributes.position.getY(index), tipStart, tipStart + height * 0.12));
  const inner = painted(leafShape(height * 0.66, 0.075).scale(1, 1, 0.3).translate(0, 0.02, 0.032), INNER_EAR_HEX, { crease: 0 });
  parts.matte.push(place(outer));
  parts.skin.push(place(inner));
}

// White tufts of fur sticking out from the lower cheeks, pointing out and down, as a fox's cheek ruffs.
function addRuffs(parts, face, white) {
  [1, -1].forEach((side) => {
    [[1.12, -0.18, 0.15], [1.32, -0.36, 0.18], [1.02, -0.45, 0.13]].forEach(([across, up, length]) => {
      const tuft = painted(leafShape(length, 0.055, { round: 8, steps: 6 }).rotateX(Math.PI / 2).rotateX(0.55).rotateY(side * 0.35), white, { crease: 0 });
      parts.matte.push(onHead(tuft, face, { across: side * across, up, lift: -0.03 }));
    });
  });
}

// A big bushy tail along `points` ([x, y, z] each, from its root to its tip), thickest a little before its middle
// and rounding off to its tip, `maxRadius` at its thickest, in `fur` with a tip in `tipHex`.
export function bushyTail(points, maxRadius, fur, tipHex) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const rings = 24;
  const corners = 12;
  // A tube 1 round, each ring of corners then scaled round its point on the curve to the tail's thickness there.
  const shape = new THREE.TubeGeometry(curve, rings, 1, corners, false);
  const { position } = shape.attributes;
  const centre = new THREE.Vector3();
  const point = new THREE.Vector3();
  for (let ring = 0; ring <= rings; ring += 1) {
    const share = ring / rings;
    curve.getPointAt(share, centre);
    // Starts at about half its full thickness at the root, and sin's power under 1 rounds the tip off.
    const radius = maxRadius * Math.sin(Math.PI * (0.12 + 0.88 * share)) ** 0.6;
    for (let corner = 0; corner <= corners; corner += 1) {
      const index = ring * (corners + 1) + corner;
      point.fromBufferAttribute(position, index).sub(centre).multiplyScalar(radius).add(centre);
      position.setXYZ(index, point.x, point.y, point.z);
    }
  }
  shape.computeVertexNormals();
  painted(shape, fur, { crease: 0 });
  return blendColour(shape, tipHex, (index) => THREE.MathUtils.smoothstep(Math.floor(index / (corners + 1)) / rings, 0.7, 0.8));
}

// A soft pointed leaf `height` tall along +y from its round base `width` across, `round` corners round and `steps`
// up: an ear, a tuft of fur.
function leafShape(height, width, { round = 12, steps = 8 } = {}) {
  const outline = Array.from({ length: steps + 1 }, (unused, step) => {
    const share = step / steps;
    return new THREE.Vector2(width * Math.sin(Math.PI * (0.5 + 0.5 * share)) ** 0.8, share * height);
  });
  return new THREE.LatheGeometry(outline, round);
}

// Recolours `shape` (already painted) toward `hex` by `shareAt(index)` (0 to 1) for each vertex. Returns `shape`.
function blendColour(shape, hex, shareAt) {
  const { color } = shape.attributes;
  const other = new THREE.Color(hex);
  const blended = new THREE.Color();
  for (let index = 0; index < color.count; index += 1) {
    blended.setRGB(color.getX(index), color.getY(index), color.getZ(index)).lerp(other, shareAt(index));
    color.setXYZ(index, blended.r, blended.g, blended.b);
  }
  return shape;
}
