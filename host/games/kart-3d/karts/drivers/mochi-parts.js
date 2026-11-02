// Mochi's own parts (M7d5), the ones only a bunny has: long floppy ears that arch up off the top of the head and
// hang down its sides to the shoulders, pink inside; a big bow between them; and a soft muzzle of two round whisker
// pads under a small pink nose, with a little smile and a hint of buck teeth. Used by drivers/mochi.js. Every place
// is [x, y, z] in the kart's axes (kart-layout.js); a head is driver-parts.js's head ({ at, radius }).

import * as THREE from 'three';
import { ball, painted } from '../part-shapes.js';
import { onHead } from '../driver-parts.js';
import { smile } from '../driver-face.js';

// The middle of the head's left ear (x is mirrored for the right), in head radii from the head's middle: from its
// root inside the head, up over an arch and down the head's side to its tip by the shoulder.
const EAR_PATH = [[0.3, 0.72, -0.14], [0.5, 1.12, -0.18], [0.85, 1.24, -0.18], [1.12, 0.95, -0.15], [1.2, 0.3, -0.1], [1.17, -0.4, -0.05], [1.08, -0.95, -0.02]];
const EAR_STEPS = 28;
const EAR_RING = 14;
// How far the ear's long edges curl in toward the head (a share of its half width), so it hugs the head like a
// spoon, hollow on its pink side.
const EAR_CUP = 0.35;

// A long floppy ear (a skin part: her fur) on the head's left (`side` 1) or right (-1), `width` wide at its widest
// and `thickness` thick, in `hex` with `innerHex` on its inner face. Its hanging half turns a little forward, so the
// pink inside shows from in front; from behind it is all fur.
export function floppyEar({ at, radius }, side, { width, thickness, hex, innerHex }) {
  const centre = new THREE.Vector3(...at);
  const curve = new THREE.CatmullRomCurve3(EAR_PATH.map(([x, y, z]) => new THREE.Vector3(side * x, y, z).multiplyScalar(radius).add(centre)));
  const [fur, inner] = [new THREE.Color(hex), new THREE.Color(innerHex)];
  const [positions, colours, uvs] = [[], [], []];
  for (let step = 0; step <= EAR_STEPS; step += 1) {
    const share = step / EAR_STEPS;
    const point = curve.getPointAt(share);
    const tangent = curve.getTangentAt(share);
    const outward = earOutward(point, tangent, centre, share);
    const across = new THREE.Vector3().crossVectors(tangent, outward);
    // Narrow at the root, widest two thirds down, and closing in a round tip.
    const tip = Math.sqrt(Math.max(0, 1 - Math.max(0, (share - 0.7) / 0.3) ** 2));
    const halfWidth = (width / 2) * (0.65 + 0.35 * Math.sin((Math.min(share / 0.6, 1) * Math.PI) / 2)) * tip;
    const halfThickness = (thickness / 2) * Math.sqrt(tip);
    // Pink on the inner face, short of the root and the tip.
    const lengthShare = THREE.MathUtils.smoothstep(share, 0.1, 0.25) * (1 - THREE.MathUtils.smoothstep(share, 0.86, 0.96));
    for (let corner = 0; corner < EAR_RING; corner += 1) {
      const angle = (corner / EAR_RING) * Math.PI * 2;
      const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
      const offOut = sin * halfThickness - EAR_CUP * halfWidth * cos * cos;
      positions.push(...point.clone().addScaledVector(across, cos * halfWidth).addScaledVector(outward, offOut).toArray());
      const colour = fur.clone().lerp(inner, THREE.MathUtils.smoothstep(-sin, 0.3, 0.6) * lengthShare);
      colours.push(colour.r, colour.g, colour.b);
      uvs.push(share, corner / EAR_RING);
    }
  }
  const indices = [];
  for (let step = 0; step < EAR_STEPS; step += 1) {
    for (let corner = 0; corner < EAR_RING; corner += 1) {
      const [a, b] = [step * EAR_RING + corner, step * EAR_RING + ((corner + 1) % EAR_RING)];
      indices.push(a, a + EAR_RING, b, b, a + EAR_RING, b + EAR_RING);
    }
  }
  const ear = new THREE.BufferGeometry();
  ear.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  ear.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  ear.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  ear.setIndex(indices);
  ear.computeVertexNormals();
  return ear;
}

// The way the ear's flat face looks at `share` along it: away from the head's middle, square to the ear's path,
// leaning back further down it so its inner face turns toward the front.
function earOutward(point, tangent, centre, share) {
  const outward = point.clone().sub(centre);
  outward.z -= outward.length() * THREE.MathUtils.smoothstep(share, 0.35, 0.8);
  return outward.addScaledVector(tangent, -outward.dot(tangent)).normalize();
}

// A big satin bow (glossy parts) in `hex` standing up on the top of the head between the ears, high enough to
// show over it from behind: two plump loops, thin at the knot and round at their ends, a round knot in `knotHex`
// and two short tails.
export function bow({ at, radius }, { size, hex, knotHex }) {
  const place = (shape) => shape.rotateX(-0.2).translate(at[0], at[1] + radius * 1.04, at[2] + radius * 0.04);
  const parts = [1, -1].flatMap((side) => {
    const tail = ball(size * 0.22, [0.8, 1.6, 0.35], [side * size * 0.2, -size * 0.38, -size * 0.06], hex, { detail: 10, crease: 0.1 }).rotateZ(side * 0.25);
    return [painted(place(bowLoop(side, size)), hex, { crease: 0.12 }), place(tail)];
  });
  parts.push(place(ball(size * 0.24, [1.1, 1, 0.85], [0, 0, size * 0.03], knotHex, { detail: 12, crease: 0.1 })));
  return parts;
}

// One loop of the bow, `size` long, to the left (`side` 1) or right (-1) of its knot at the origin, rising a
// little toward its end: a ball pulled out along x, thin where it leaves the knot and plump at its far end.
function bowLoop(side, size) {
  const loop = new THREE.SphereGeometry(1, 18, 12);
  const { position } = loop.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const along = (x + 1) / 2;
    const plump = Math.sin(Math.min(along / 0.7, 1) * Math.PI * 0.5);
    position.setXYZ(index, side * along * size, y * size * 0.5 * (0.35 + 0.65 * plump), z * size * 0.26 * (0.5 + 0.5 * plump));
  }
  loop.computeVertexNormals();
  return loop.rotateZ(side * 0.22);
}

// The muzzle `up` radians below the face's middle: two round whisker pads of fur in `hex` and a small pink nose in
// `noseHex` above them (skin), and the shared smile `mouthWidth` across under them (matte) with two buck teeth
// peeking from its top. Returns { matte, skin }.
export function muzzle(head, { up, padRadius, hex, noseHex, mouthWidth }) {
  const padAcross = (padRadius * 0.82) / head.radius;
  const pads = [1, -1].map((side) => onHead(ball(padRadius, [1, 0.8, 0.5], [0, 0, padRadius * 0.12], hex, { detail: 16, crease: 0 }), head, { across: side * padAcross, up }));
  const noseShape = onHead(ball(padRadius * 0.5, [1.35, 0.85, 0.75], [0, 0, padRadius * 0.38], noseHex, { detail: 14, crease: 0 }), head, { across: 0, up: up + padRadius / head.radius * 0.75 });
  const mouthUp = up - (padRadius * 0.95) / head.radius;
  const teeth = [1, -1].map((side) =>
    onHead(ball(1, [mouthWidth * 0.11, mouthWidth * 0.19, 0.004], [side * mouthWidth * 0.105, -mouthWidth * 0.1, 0], 0xfafaf6, { detail: 10, crease: 0 }), head, { across: 0, up: mouthUp, lift: 0.008 }),
  );
  return { matte: [...smile(head, { width: mouthWidth, up: mouthUp }), ...teeth], skin: [...pads, noseShape] };
}
