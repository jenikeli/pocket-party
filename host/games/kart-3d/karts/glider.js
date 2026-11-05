// The glider every kart opens over a glide gap (M9), in the style of MK8DX's Super Glider
// (test-results/reference/m9/F/): a wide, shallow delta of cloth over the kart, drooping at its tips, on a frame of
// tubes (leading edges, keel and crossbar), a grey nose cap and yellow tip caps, held up by one strut from behind
// the driver's seat. Its shapes, how far it is open, and how it unfolds. Geometry only (the canopy's picture is in
// glider-maps.js), so it is unit tested in Node. Used by kart-models.js.

import * as THREE from 'three';
import { roundedBox, mergeShapes } from '../shape-utils.js';
import { painted, ball, limb } from './part-shapes.js';
import { withSafeNormals } from './safe-normals.js';
import { easedShare } from './anti-gravity.js';

// How long the glider takes to open once the kart glides, and to fold away after it lands (kart-glide.js's
// kart.gliding).
export const GLIDER_OPEN_SECONDS = 0.3;
export const GLIDER_FOLD_SECONDS = 0.2;

// The canopy seen from above, in the kart's axes (+z forward, +y up, +x the kart's left): the nose in front, the
// wing tips swept back and the trailing edge a shallow V behind. The keel's top sits at KEEL_Y over the driver's
// head (a kart is about 2 long, the driver's head tops out near 1.9).
export const CANOPY = Object.freeze({
  halfSpan: 2,
  noseZ: 0.85,
  tailZ: -1.15,
  tipLeadZ: -0.92,
  tipTrailZ: -1.06,
});
const KEEL_Y = 2.55;
// The nose rides this much higher for each unit forward, the tips droop this far below the keel (more and more
// toward them, so from behind the canopy is a low arch), and the cloth bulges up this far between the leading and
// trailing edges.
const PITCH = 0.1;
const DROOP = 0.44;
const DROOP_CURVE = 1.7;
const BILLOW = 0.07;
// The canopy's grid: segments across the span (even, so the keel is a grid line) and from back to front.
const SPAN_SEGMENTS = 32;
const CHORD_SEGMENTS = 8;

// Where the strut stands on the engine cover behind the seat (the point the glider unfolds about) and where it
// meets the keel.
export const GLIDER_PIVOT = Object.freeze([0, 0.62, -0.8]);
const HANG = [0, KEEL_Y - 0.08, -0.48];
// Folded, the glider lies back over the kart's tail by this angle, its wings drawn in to this share of their span.
const FOLDED_TILT = (80 * Math.PI) / 180;
const FOLDED_SPREAD = 0.08;

const STRUT_HEX = 0xc9ced6;
const NOSE_HEX = 0x7d838c;
const TIP_HEX = 0xffc928;
const CLAMP_HEX = 0x34363d;

// The share (0 folded, 1 open) a frame later: it moves at a steady rate toward 1 while `gliding` is true (open
// over GLIDER_OPEN_SECONDS) and toward 0 otherwise (folded over GLIDER_FOLD_SECONDS). `dt` is the real time since
// the last drawn frame, in seconds.
export function nextGliderShare(share, gliding, dt) {
  return gliding ? Math.min(1, share + dt / GLIDER_OPEN_SECONDS) : Math.max(0, share - dt / GLIDER_FOLD_SECONDS);
}

// A point on the canopy, `across` from -1 (the right tip) to 1 (the left tip) and `along` from 0 (the trailing
// edge) to 1 (the leading edge), as [x, y, z] in the kart's axes.
export function canopyPoint(across, along) {
  const out = Math.abs(across);
  const lead = CANOPY.noseZ + (CANOPY.tipLeadZ - CANOPY.noseZ) * out;
  const trail = CANOPY.tailZ + (CANOPY.tipTrailZ - CANOPY.tailZ) * out;
  const z = trail + (lead - trail) * along;
  const y = KEEL_Y + PITCH * z - DROOP * out ** DROOP_CURVE + BILLOW * Math.sin(Math.PI * along) * (1 - out * out);
  return [across * CANOPY.halfSpan, y, z];
}

// The canopy, one sheet for every design (drawn from both sides), its texture coordinates spanning it as seen
// from above, the nose at the picture's top and the kart's left on its left (glider-maps.js draws to match).
// Built round GLIDER_PIVOT, the glider's own origin.
export function buildGliderCanopy() {
  const positions = [];
  const uvs = [];
  for (let row = 0; row <= CHORD_SEGMENTS; row += 1) {
    for (let column = 0; column <= SPAN_SEGMENTS; column += 1) {
      const [x, y, z] = canopyPoint((column / SPAN_SEGMENTS) * 2 - 1, row / CHORD_SEGMENTS);
      positions.push(x - GLIDER_PIVOT[0], y - GLIDER_PIVOT[1], z - GLIDER_PIVOT[2]);
      uvs.push((1 - x / CANOPY.halfSpan) / 2, (z - CANOPY.tailZ) / (CANOPY.noseZ - CANOPY.tailZ));
    }
  }
  const index = [];
  const width = SPAN_SEGMENTS + 1;
  for (let row = 0; row < CHORD_SEGMENTS; row += 1) {
    for (let column = 0; column < SPAN_SEGMENTS; column += 1) {
      const corner = row * width + column;
      // Wound so the faces' fronts point up.
      index.push(corner, corner + width, corner + 1, corner + 1, corner + width, corner + width + 1);
    }
  }
  const canopy = new THREE.BufferGeometry();
  canopy.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  canopy.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  canopy.setIndex(index);
  canopy.computeVertexNormals();
  return canopy;
}

// The frame in `palette`'s colours (kart-designs.js): leading edges, keel and crossbar in its third colour, the
// strut light grey with dark clamps at both ends, a grey nose cap and yellow tip caps. One geometry coloured per
// vertex, for the kart's glossy material, built round GLIDER_PIVOT.
export function buildGliderFrame(palette) {
  // The leading edges, which show against the sky, are rounder than the thin keel and crossbar under the cloth.
  const tube = (points, radius, hex, round = 6) => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    return painted(new THREE.TubeGeometry(curve, points.length * 2, radius, round, false), hex, { crease: 0.2 });
  };
  // Just under the cloth, so the canopy's edge rests on the tube.
  const under = ([x, y, z], drop) => [x, y - drop, z];
  const edge = (side) => [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1].map((out) => under(canopyPoint(side * out, 1), 0.02));
  const keel = [1, 0.75, 0.5, 0.25, 0].map((along) => under(canopyPoint(0, along), 0.05));
  const crossbar = [-0.55, -0.25, 0, 0.25, 0.55].map((across) => under(canopyPoint(across, 0.62), 0.09));
  const shapes = [
    tube(edge(1), 0.05, palette.third, 8),
    tube(edge(-1), 0.05, palette.third, 8),
    tube(keel, 0.04, palette.third),
    tube(crossbar, 0.03, palette.third),
    limb(GLIDER_PIVOT, HANG, 0.045, STRUT_HEX),
    painted(roundedBox(0.14, 0.1, 0.2, 0.03, { chamfered: true }).translate(HANG[0], HANG[1] + 0.02, HANG[2]), CLAMP_HEX),
    painted(roundedBox(0.16, 0.06, 0.16, 0.025, { chamfered: true }).translate(...GLIDER_PIVOT), CLAMP_HEX),
    ball(0.085, [1, 0.8, 1.3], canopyPoint(0, 1), NOSE_HEX, { detail: 10 }),
    ...[1, -1].map((side) => ball(0.075, [1, 1, 1.4], canopyPoint(side, 0.5), TIP_HEX, { detail: 10 })),
  ];
  const frame = withSafeNormals(mergeShapes(shapes));
  return frame.translate(-GLIDER_PIVOT[0], -GLIDER_PIVOT[1], -GLIDER_PIVOT[2]);
}

// Sets `glider` (a group at the kart's origin holding the canopy and frame) open `share` of the way (0 to 1, not
// yet eased): folded it is not drawn; opening, it swings up from lying back over the kart's tail about the strut's
// foot while its wings spread out.
export function placeGlider(glider, share) {
  glider.visible = share > 0;
  if (!glider.visible) {
    return;
  }
  const open = easedShare(share);
  glider.position.set(...GLIDER_PIVOT);
  // A negative turn about the kart's left (+x) tips its top back (-z).
  glider.rotation.x = -(1 - open) * FOLDED_TILT;
  glider.scale.set(FOLDED_SPREAD + (1 - FOLDED_SPREAD) * open, 0.4 + 0.6 * open, 0.4 + 0.6 * open);
}
