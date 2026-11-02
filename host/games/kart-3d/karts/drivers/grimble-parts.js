// The parts only Grimble the gnome has (M7d5): his tall pointed hat that flops over at its tip, his big fluffy
// beard in smooth clumps, and his belt with its gold buckle. Used by grimble.js. Every place is [x, y, z] in the
// kart's axes (kart-layout.js); `face` is driver-parts.js's head ({ at, radius }).

import * as THREE from 'three';
import { painted, ball } from '../part-shapes.js';
import { onHead } from '../driver-parts.js';
import { loft } from '../curved-shapes.js';

// The hat's middle line, built standing up from its base at the origin: up `height` and, near the top, flopping
// over backward and down, a little to one side, as a soft felt hat does. In shares of the hat's height.
const HAT_LINE = [[0, 0, 0], [0, 0.3, 0], [0, 0.55, 0.03], [0.02, 0.78, 0], [0.05, 0.92, -0.12], [0.08, 0.92, -0.28], [0.1, 0.8, -0.4], [0.11, 0.66, -0.44]];

// The hat on the head `face`, `radius` round at its base, `height` tall, tipped back `tilt` radians round the
// head's middle so its rim crosses the forehead just over the brows and the nape low at the back, its base `rise`
// above the head's middle. A cone round the middle line, narrowing to a round tip, over a rolled band. Returns
// { felt (cloth parts), band (cloth part) }.
export function floppyHat(face, { radius, height, tilt, rise, hex, bandHex }) {
  const curve = new THREE.CatmullRomCurve3(HAT_LINE.map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(height)));
  const steps = 30;
  const around = 18;
  const { normals, binormals } = curve.computeFrenetFrames(steps, false);
  const rings = Array.from({ length: steps + 1 }, (unused, step) => {
    const share = step / steps;
    // Straight-sided low down, so it sits down round the head, then narrowing faster toward the floppy tip.
    const reach = Math.max(radius * (1 - share) ** 1.15, 0.02);
    const centre = curve.getPointAt(share);
    return Array.from({ length: around }, (unusedCorner, corner) => {
      const angle = (corner / around) * Math.PI * 2;
      return centre.clone().addScaledVector(normals[step], reach * Math.cos(angle)).addScaledVector(binormals[step], reach * Math.sin(angle));
    });
  });
  const tip = curve.getPointAt(1);
  const onHeadPlace = (shape) => shape.translate(0, rise, 0).rotateX(-tilt).translate(...face.at);
  const cone = onHeadPlace(loft(rings, true));
  const tipBall = onHeadPlace(new THREE.SphereGeometry(0.03, 10, 6).translate(tip.x, tip.y, tip.z));
  const band = onHeadPlace(new THREE.TorusGeometry(radius, 0.045, 8, 24).rotateX(Math.PI / 2).scale(1, 1.2, 1));
  return {
    felt: [painted(cone, hex, { crease: 0.12, reach: 0.25 }), painted(tipBall, hex, { crease: 0 })],
    band: painted(band, bandHex, { crease: 0.1 }),
  };
}

// The beard (skin parts: their faint glow in the beard's own white keeps it bright in shade), `hex`: a
// moustache under the nose drooping outward, a fringe of clumps framing the face from the sideburns down round
// the jaw, leaving the smile (`mouthUp` radians down the face) clear, and a big fluffy bib hanging from the chin
// over the chest, widest at the top and ending in a round point. Every clump is a squashed ball, its foot a little
// darker, so they read apart.
export function beard(face, hex, mouthUp) {
  const [x, y, z] = face.at;
  const clump = (stretch, at, turn, detail) => ball(1, stretch, [0, 0, 0], hex, { detail, crease: 0.18 }).rotateZ(turn).translate(...at);
  const onFace = (stretch, across, up, turn) => onHead(clump(stretch, [0, 0, 0], turn, 14), face, { across, up });
  const parts = [];
  [1, -1].forEach((side) => {
    parts.push(onFace([0.12, 0.05, 0.055], side * 0.13, mouthUp + 0.2, -side * 0.35));
    // The fringe, from the ear down to beside the chin, each clump turned to follow the jaw.
    parts.push(onFace([0.08, 0.13, 0.045], side * 0.85, mouthUp + 0.3, side * 0.1));
    parts.push(onFace([0.1, 0.12, 0.05], side * 0.62, mouthUp - 0.02, side * 0.5));
    parts.push(onFace([0.1, 0.1, 0.05], side * 0.42, mouthUp - 0.28, side * 0.9));
  });
  parts.push(clump([0.25, 0.2, 0.15], [x, y - 0.4, z + 0.16], 0, 16));
  parts.push(clump([0.19, 0.17, 0.12], [x, y - 0.55, z + 0.17], 0, 16));
  parts.push(clump([0.1, 0.1, 0.08], [x, y - 0.68, z + 0.16], 0, 16));
  return parts;
}

// A brown belt round the waist at `waist` ([x, y, z]), `width` wide and `depth` deep (the body's), with a square
// gold buckle at its front. Returns { strap (matte), buckle (metal) }.
export function belt(waist, { width, depth, hex, buckleHex }) {
  const [x, y, z] = waist;
  const strap = new THREE.TorusGeometry(width / 2, 0.035, 6, 24).rotateX(Math.PI / 2).scale(1, 1.4, depth / width).translate(x, y, z);
  const frame = new THREE.TorusGeometry(0.055, 0.016, 6, 4, Math.PI * 2).rotateZ(Math.PI / 4).scale(1.1, 1, 1).translate(x, y, z + depth / 2 + 0.03);
  return { strap: painted(strap, hex, { crease: 0.1 }), buckle: painted(frame, buckleHex, { crease: 0 }) };
}
