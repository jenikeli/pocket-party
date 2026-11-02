// The parts every driver is built from (M7d5): a round head, and a way to lay a shape onto its surface so a face's
// features follow its curve; a chunky body; arms bent to the steering wheel ending in big gloves; legs bent into the
// nose ending in big shoes; a scarf round the neck. The face itself is in driver-face.js. Each returns geometries in
// place, coloured per vertex, so a design's buildDriver (karts/drivers/) picks the parts, their sizes and colours
// and sorts them into a part list by material kind (part-shapes.js). Every place is [x, y, z] in the kart's axes
// (kart-layout.js); sizes are in units (a kart is about 2 long).

import * as THREE from 'three';
import { joinNormals } from './curved-shapes.js';
import { painted, ball, limb, along } from './part-shapes.js';

// A head is a ball a little shorter and shallower than wide, its lower front (the cheeks and chin) bulging forward,
// so the face has volume, as the references' faces do.
const HEAD_STRETCH = [1, 0.95, 0.94];
const FACE_BULGE = { toward: new THREE.Vector3(0, -0.45, 0.89).normalize(), amount: 0.12, tightness: 3 };

// A head `radius` round at `at`: { at, radius, shape } where shape is its ball in `skin` (the skin kind). The other
// face parts take the head ({ at, radius }) to sit on it.
export function head(at, radius, skin) {
  const shape = new THREE.SphereGeometry(1, 26, 18);
  const { position } = shape.attributes;
  const direction = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    direction.fromBufferAttribute(position, index).normalize();
    const point = direction.clone().multiplyScalar(surfaceReach(direction, radius)).add(new THREE.Vector3(...at));
    position.setXYZ(index, point.x, point.y, point.z);
  }
  shape.computeVertexNormals();
  return { at, radius, shape: painted(joinNormals(shape), skin, { crease: 0.08 }) };
}

// The way out from the head's middle `across` radians to its left and `up` radians up from straight ahead (+z).
export function headDirection(across, up) {
  return new THREE.Vector3(Math.sin(across) * Math.cos(up), Math.sin(up), Math.cos(across) * Math.cos(up));
}

// `shape`, built round the origin facing +z (x across, y up, z out of the face), laid onto the head's surface at
// `across` and `up` (as headDirection): each point is carried round the head's curve, keeping its height off the
// surface, `lift` more. So an eye, a freckle or a mouth hugs the face instead of standing flat off it.
export function onHead(shape, { at, radius }, { across, up, lift = 0 }) {
  const centre = new THREE.Vector3(...at);
  const out = headDirection(across, up);
  // The shape's x and y on the face: toward the head's left (+x seen straight on) and up.
  const sideways = new THREE.Vector3(0, 1, 0).cross(out).normalize();
  const upward = new THREE.Vector3().crossVectors(out, sideways);
  const { position } = shape.attributes;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const direction = out.clone().multiplyScalar(radius).addScaledVector(sideways, x).addScaledVector(upward, y).normalize();
    point.copy(centre).addScaledVector(direction, surfaceReach(direction, radius) + z + lift);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  shape.computeVertexNormals();
  return shape;
}

// How far from the head's middle its surface is along `direction`, a unit vector: on the stretched ball, and
// further where the face bulges.
function surfaceReach(direction, radius) {
  const [stretchX, stretchY, stretchZ] = HEAD_STRETCH;
  const onBall = radius / Math.hypot(direction.x / stretchX, direction.y / stretchY, direction.z / stretchZ);
  const toward = Math.max(0, direction.dot(FACE_BULGE.toward));
  return onBall * (1 + FACE_BULGE.amount * toward ** FACE_BULGE.tightness);
}

// A chunky body from `hip` up `height`: a round belly and seat in `lower` and a chest in `upper`, as wide as
// `width` and `depth` deep.
export function body(hip, { width, height, depth, lower, upper }) {
  const [x, y, z] = hip;
  return [
    ball(width / 2, [1, (height * 0.55) / width, depth / width], [x, y + height * 0.3, z], lower, { detail: 16, crease: 0.3 }),
    ball(width * 0.5, [1, (height * 0.5) / width, depth / width], [x, y + height * 0.68, z], upper, { detail: 16, crease: 0.15 }),
  ];
}

// An arm from `shoulder` to `hand`, bent at the elbow outward and down by `bend`, in `sleeve`, with a cuff in
// `cuff` at the wrist; a big round glove `glove` round in `gloveHex` on the wheel, its thumb on top. Returns
// { sleeves (cloth), gloves (cloth) }.
export function arm(shoulder, hand, { radius, bend, sleeve, cuff, glove, gloveHex }) {
  const side = Math.sign(hand[0] || shoulder[0]);
  const elbow = [(shoulder[0] + hand[0]) / 2 + side * bend, (shoulder[1] + hand[1]) / 2 - bend, (shoulder[2] + hand[2]) / 2];
  const handAt = new THREE.Vector3(...hand);
  const wrist = handAt.clone().lerp(new THREE.Vector3(...elbow), (glove * 1.3) / handAt.distanceTo(new THREE.Vector3(...elbow)));
  const cuffShape = along(new THREE.CylinderGeometry(radius * 1.25, radius * 1.15, radius * 0.9, 14), wrist.clone().addScaledVector(handAt.clone().sub(wrist).normalize(), -radius * 0.3), wrist);
  const thumb = ball(glove * 0.42, [1, 0.8, 1.3], [hand[0] - side * glove * 0.25, hand[1] + glove * 0.7, hand[2] + glove * 0.1], gloveHex, { detail: 10, crease: 0 });
  return {
    sleeves: [limb(shoulder, elbow, radius, sleeve), limb(elbow, wrist.toArray(), radius * 0.95, sleeve), painted(cuffShape, cuff, { crease: 0.1 })],
    gloves: [ball(glove, [1.05, 0.85, 1.15], hand, gloveHex, { detail: 12, crease: 0.15 }), thumb],
  };
}

// A leg from `hip` to `foot`, the knee raised by `lift`, in `cloth`, with a big rounded shoe `shoe` long in
// `shoeHex` on a sole in `soleHex`. Returns { leg (cloth parts), shoe (glossy parts) }.
export function leg(hip, foot, { radius, lift, cloth, shoe, shoeHex, soleHex }) {
  const knee = [(hip[0] + foot[0]) / 2 + Math.sign(hip[0]) * 0.02, Math.max(hip[1], foot[1]) + lift, (hip[2] + foot[2]) / 2];
  const ankle = [foot[0], foot[1] + shoe * 0.35, foot[2] - shoe * 0.3];
  const [x, y, z] = foot;
  return {
    leg: [limb(hip, knee, radius, cloth), limb(knee, ankle, radius * 0.9, cloth)],
    shoe: [
      ball(shoe / 2, [0.68, 0.55, 1], [x, y + shoe * 0.06, z], shoeHex, { detail: 12, crease: 0.25 }),
      ball(shoe / 2, [0.72, 0.22, 1.04], [x, y - shoe * 0.12, z], soleHex, { detail: 12, crease: 0 }),
    ],
  };
}

// A scarf (cloth): a fat roll round the neck at `neck` ([x, y, z]), `radius` round, and two tails `length` long
// streaming back and up from its back, rippling, `width` wide, in `hex`.
export function scarf(neck, { radius, thickness, length, width, hex }) {
  const [x, y, z] = neck;
  const roll = new THREE.TorusGeometry(radius, thickness, 8, 24).rotateX(Math.PI / 2).translate(x, y, z);
  // Each tail leaves the back of the roll, drops a little and streams back, waving side to side and up and down
  // more toward its end, the second a little behind the first.
  const tails = [[0.05, 0, 1], [-0.05, 1.4, 0.85]].map(([across, phase, reach]) => {
    const points = Array.from({ length: 8 }, (unused, step) => {
      const share = step / 7;
      return new THREE.Vector3(
        x + across + Math.sin(share * Math.PI * 2.2 + phase) * 0.09 * share,
        y - 0.06 * Math.sin(share * Math.PI) + Math.sin(share * Math.PI * 2.6 + phase) * 0.06 * share + share * 0.08,
        z - radius * 0.95 - share * length * reach,
      );
    });
    return ribbon(new THREE.CatmullRomCurve3(points), width * (1 - 0.15 * phase), thickness * 0.4, phase);
  });
  return [roll, ...tails].map((part) => painted(part, hex, { crease: 0.15 }));
}

// A thin strip `width` wide and `thickness` thick along `curve`, standing on edge where it leaves the neck and
// twisting flatter toward its end, as cloth does streaming in the wind (`phase` shifts the twist). Each step along
// the curve is a ring of four corners; its sides join ring to ring, and its far end is closed.
function ribbon(curve, width, thickness, phase) {
  const steps = 18;
  const positions = [];
  const uvs = [];
  for (let step = 0; step <= steps; step += 1) {
    const share = step / steps;
    const point = curve.getPointAt(share);
    const tangent = curve.getTangentAt(share);
    const upright = new THREE.Vector3(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize();
    const across = upright.applyAxisAngle(tangent, 0.25 + 1.1 * share + 0.4 * Math.sin(share * Math.PI * 2 + phase));
    const through = new THREE.Vector3().crossVectors(tangent, across);
    [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(([acrossSign, throughSign], corner) => {
      positions.push(...point.clone().addScaledVector(across, (acrossSign * width) / 2).addScaledVector(through, (throughSign * thickness) / 2).toArray());
      uvs.push(share, corner / 3);
    });
  }
  const indices = [];
  for (let step = 0; step < steps; step += 1) {
    for (let corner = 0; corner < 4; corner += 1) {
      const [a, b] = [step * 4 + corner, step * 4 + ((corner + 1) % 4)];
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  const end = steps * 4;
  indices.push(end, end + 2, end + 1, end, end + 3, end + 2);
  const strip = new THREE.BufferGeometry();
  strip.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  strip.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  strip.setIndex(indices);
  strip.computeVertexNormals();
  return strip;
}
