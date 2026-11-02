// The parts only Inky the octopus has (M7d5): a way to stretch his round head up and back into an octopus's
// mantle (the face laid on it going along), tapering tentacles with paler undersides that curl at their tips, a
// white sailor cap with a navy band, and a navy sailor collar with its striped flap down his back.
// Used by inky.js. Every place is [x, y, z] in the kart's axes (kart-layout.js).

import * as THREE from 'three';
import { painted, ball, limb } from '../part-shapes.js';
import { joinNormals } from '../curved-shapes.js';

// The mantle: how much taller the head's top half grows, how much wider it swells halfway up (a bulb, not an egg),
// and how far back its top leans (in head radii).
const MANTLE_HEIGHT = 1.22;
const MANTLE_SWELL = 0.1;
const MANTLE_LEAN = 0.45;
// A tentacle's rings along it and corners round each ring.
const TENTACLE_SIDES = 10;

// `shape` (on the head at `at`, `radius` round) with the head's top half stretched up and leaned back into a
// bulbous mantle; the lower half, where the face is, stays as it was. The head and every part laid on it go through this,
// so the face and spots stay on its surface. Returns `shape`.
export function mantled(shape, at, radius) {
  const { position } = shape.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const rise = (position.getY(index) - at[1]) / radius;
    if (rise > 0) {
      const swell = 1 + MANTLE_SWELL * Math.sin(Math.PI * Math.min(rise, 1));
      position.setX(index, at[0] + (position.getX(index) - at[0]) * swell);
      position.setY(index, at[1] + rise * radius * MANTLE_HEIGHT);
      position.setZ(index, at[2] + (position.getZ(index) - at[2]) * swell - MANTLE_LEAN * radius * rise * rise);
    }
  }
  shape.computeVertexNormals();
  return joinNormals(shape);
}

// The highest point of `shape`, as [x, y, z]: where the cap sits on the mantle.
export function topOf(shape) {
  const { position } = shape.attributes;
  let top = 0;
  for (let index = 1; index < position.count; index += 1) {
    top = position.getY(index) > position.getY(top) ? index : top;
  }
  return [position.getX(top), position.getY(top), position.getZ(top)];
}

// A tentacle (a glossy part) through `points` ([x, y, z] each), `root` thick at its first point and tapering to
// `tip` before a rounded end, `steps` rings long, in `hex` with its underside in `undersideHex`. The underside is
// the side facing down, or, where the tentacle curls, the inside of the curl, as an octopus's suckers are.
export function tentacle(points, { root, tip, steps, hex, undersideHex }) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const { normals, binormals } = curve.computeFrenetFrames(steps, false);
  const [skin, underside] = [new THREE.Color(hex), new THREE.Color(undersideHex)];
  const [positions, colours, uvs] = [[], [], []];
  const out = new THREE.Vector3();
  for (let step = 0; step <= steps; step += 1) {
    const share = step / steps;
    const centre = curve.getPointAt(share);
    const under = undersideAt(curve, share, 1 / steps);
    // Tapering all along, then rounded off over the last twentieth.
    const end = THREE.MathUtils.clamp((share - 0.95) / 0.05, 0, 1);
    const radius = (tip + (root - tip) * (1 - share) ** 1.3) * Math.sqrt(1 - end * end);
    for (let side = 0; side < TENTACLE_SIDES; side += 1) {
      const angle = (side / TENTACLE_SIDES) * Math.PI * 2;
      out.copy(normals[step]).multiplyScalar(Math.cos(angle)).addScaledVector(binormals[step], Math.sin(angle));
      positions.push(...centre.clone().addScaledVector(out, radius).toArray());
      const colour = skin.clone().lerp(underside, THREE.MathUtils.smoothstep(out.dot(under), 0.05, 0.45));
      colours.push(colour.r, colour.g, colour.b);
      uvs.push(share, side / TENTACLE_SIDES);
    }
  }
  return tube(positions, colours, uvs, steps);
}

// The way the underside faces `share` along `curve`: down, turned toward the inside of the curve as far as it
// bends there (over a step `along` long), and kept square to the curve.
function undersideAt(curve, share, along) {
  const tangent = curve.getTangentAt(share);
  const bend = curve.getTangentAt(Math.min(1, share + along)).sub(curve.getTangentAt(Math.max(0, share - along)));
  const down = new THREE.Vector3(0, -1, 0).addScaledVector(tangent, tangent.y);
  const curling = THREE.MathUtils.smoothstep(bend.length(), 0.08, 0.3);
  const under = down.normalize().lerp(bend.normalize(), curling);
  return under.addScaledVector(tangent, -under.dot(tangent)).normalize();
}

// The rings of a tentacle (TENTACLE_SIDES corners each, `steps` + 1 of them) joined into one closed tube.
function tube(positions, colours, uvs, steps) {
  const indices = [];
  for (let step = 0; step < steps; step += 1) {
    for (let side = 0; side < TENTACLE_SIDES; side += 1) {
      const a = step * TENTACLE_SIDES + side;
      const b = step * TENTACLE_SIDES + ((side + 1) % TENTACLE_SIDES);
      indices.push(a, a + TENTACLE_SIDES, b, b, a + TENTACLE_SIDES, b + TENTACLE_SIDES);
    }
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shape.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  shape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return shape;
}

// A white sailor cap `size` times its usual size sitting at `at` on the mantle's top, tipped `tilt` radians forward
// and `lean` to the side: a round flat-topped crown and a navy band round its foot. Returns { cloth (parts),
// emblemAt (the badge's place on the crown's front), emblemNormal }.
export function sailorCap(at, { size, tilt, lean, hex, bandHex }) {
  const place = (shape) => shape.scale(size, size, size).rotateX(tilt).rotateZ(lean).translate(...at);
  const profile = [[0.19, 0], [0.2, 0.02], [0.205, 0.07], [0.2, 0.115], [0.178, 0.143], [0.12, 0.155], [0.001, 0.157]];
  const crown = new THREE.LatheGeometry(profile.map(([radius, height]) => new THREE.Vector2(radius, height)), 28);
  const band = new THREE.CylinderGeometry(0.209, 0.2, 0.05, 28, 1, true).translate(0, 0.03, 0);
  // The badge sits on the crown's front just above the band, turned with the cap.
  const turned = (vector) => vector.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt).applyAxisAngle(new THREE.Vector3(0, 0, 1), lean);
  const badgeAt = turned(new THREE.Vector3(0, 0.1, 0.212).multiplyScalar(size)).add(new THREE.Vector3(...at));
  return {
    cloth: [
      painted(place(crown), hex, { crease: 0.1 }),
      painted(place(band), bandHex, { crease: 0 }),
    ],
    emblemAt: badgeAt.toArray(),
    emblemNormal: turned(new THREE.Vector3(0, 0.15, 1).normalize()).toArray(),
  };
}

// A navy sailor collar (cloth parts) round the neck at `neck` ([x, y, z]), `radius` round: a roll round the neck
// and a square flap down the back, which flares out over the shoulders; a white stripe runs inside its sides and
// bottom edge. `flap` is { top, bottom, topRadius, bottomRadius, halfAngle } round the neck's middle.
export function sailorCollar(neck, radius, { flap, hex, stripeHex }) {
  const [x, y, z] = neck;
  const roll = new THREE.TorusGeometry(radius, 0.04, 8, 28).rotateX(Math.PI / 2).translate(x, y, z);
  // Each layer a strip of a cone round the back (Three.js's cylinders run round from +z through +x, so the back
  // is half a turn round), a little further out than the one before so it lies on top.
  const layer = (inset, lift) => {
    const height = flap.top - flap.bottom - inset;
    const share = inset / (flap.top - flap.bottom);
    const bottomRadius = flap.bottomRadius + (flap.topRadius - flap.bottomRadius) * share + lift;
    const halfAngle = flap.halfAngle - inset / flap.topRadius;
    return new THREE.CylinderGeometry(flap.topRadius + lift, bottomRadius, height, 14, 1, true, Math.PI - halfAngle, halfAngle * 2)
      .translate(x, flap.top - height / 2, z);
  };
  return [
    painted(roll, hex, { crease: 0 }),
    painted(layer(0, 0), hex, { crease: 0 }),
    painted(layer(0.03, 0.006), stripeHex, { crease: 0 }),
    painted(layer(0.055, 0.012), hex, { crease: 0 }),
  ];
}

// A small knot (cloth parts) at the collar's front, where a sailor's neckerchief is tied, and its two short tails.
export function neckerchief(at, hex) {
  const [x, y, z] = at;
  return [
    ball(0.05, [1.2, 0.9, 0.8], at, hex, { detail: 10, crease: 0.1 }),
    ...[1, -1].map((side) => limb(at, [x + side * 0.045, y - 0.1, z + 0.01], 0.026, hex, { detail: 6, crease: 0.1 })),
  ];
}
