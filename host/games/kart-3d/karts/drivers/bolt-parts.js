// Bolt's own parts (M7d5): his glass dome head with its face plate, ears, collar and antenna, his face (round
// glowing eyes, glowing brows and a glowing smile, pink cheek lights), and his ribbed arms ending in chrome mitts.
// The parts are laid on the head as a face's are (driver-parts.js's onHead). Used by bolt.js.

import * as THREE from 'three';
import { roundedCylinder } from '../../shape-utils.js';
import { ball, limb, painted } from '../part-shapes.js';
import { head as headShape, onHead, headDirection } from '../driver-parts.js';
import { eyebrows } from '../driver-face.js';

export const YELLOW = 0xf2c40f;
export const CHROME = 0xcfd6de;
export const NAVY = 0x23324a;

const GLASS = 0xc4f1f7;
const PLATE = 0x172c45;
const GLOW = 0xbdfaff;
const GLOW_DEEP = 0x2cc4e8;
const RED = 0xe0301e;
const GUNMETAL = 0x3b414c;

// The face plate shows through the glass round this way out from the head's middle, sharp-edged between these
// cosines of the angle from it.
const PLATE_TOWARD = headDirection(0, -0.06);
const PLATE_EDGE = [0.5, 0.62];

// The glass dome (glossy), painted pale cyan with the dark plate behind its front, so it reads as glass over a
// face; two streaks of light on it, a chrome collar round its foot, round chrome ears and the antenna.
export function addDome(parts, head) {
  const { at, radius } = head;
  const dome = headShape(at, radius, GLASS).shape;
  tintPlate(dome, at);
  parts.glossy.push(dome);
  // The light's streaks on the glass, one over the face and one on the back for the chase camera.
  [[0.5, 0.42], [Math.PI - 0.55, 0.45]].forEach(([across, up]) => {
    parts.glossy.push(onHead(arc(0.17, 0.9, 0.011, 0xffffff), head, { across, up, lift: 0.004 }));
    parts.glossy.push(onHead(ball(0.016, [1, 1, 0.4], [0.07, -0.07, 0.006], 0xffffff, { detail: 8, crease: 0 }), head, { across, up }));
  });
  const collar = new THREE.TorusGeometry(radius * 0.62, 0.045, 6, 24).rotateX(Math.PI / 2).translate(at[0], at[1] - radius * 0.76, at[2]);
  parts.metal.push(painted(collar, CHROME, { crease: 0 }));
  [1, -1].forEach((side) => {
    const ear = roundedCylinder(0.085, 0.085, 0.08, 0.02, 12).rotateZ(Math.PI / 2).translate(at[0] + side * radius * 0.98, at[1] - 0.02, at[2] - 0.02);
    const cap = roundedCylinder(0.05, 0.05, 0.04, 0.012, 10).rotateZ(Math.PI / 2).translate(at[0] + side * (radius * 0.98 + 0.05), at[1] - 0.02, at[2] - 0.02);
    parts.metal.push(painted(ear, CHROME, { crease: 0.15 }));
    parts.glossy.push(painted(cap, YELLOW, { crease: 0 }));
  });
  addAntenna(parts, at, radius);
}

// Recolours the dome: the plate's dark navy over its front, the glass's pale cyan elsewhere, a little darker at the
// foot, where the collar shades it.
function tintPlate(dome, at) {
  const glass = new THREE.Color(GLASS);
  const plate = new THREE.Color(PLATE);
  const { position, color } = dome.attributes;
  const direction = new THREE.Vector3();
  const mixed = new THREE.Color();
  const [low, high] = PLATE_EDGE;
  for (let index = 0; index < position.count; index += 1) {
    direction.fromBufferAttribute(position, index).sub(new THREE.Vector3(...at)).normalize();
    const share = THREE.MathUtils.smoothstep(direction.dot(PLATE_TOWARD), low, high);
    const foot = 1 - 0.25 * THREE.MathUtils.smoothstep(-direction.y, 0.5, 0.95);
    mixed.copy(glass).lerp(plate, share).multiplyScalar(foot);
    color.setXYZ(index, mixed.r, mixed.g, mixed.b);
  }
}

// A thin chrome stalk from the dome's top, leaning back a little, with a red ball on the end.
function addAntenna(parts, at, radius) {
  const top = [at[0], at[1] + radius * 0.93, at[2] - 0.02];
  const tip = [at[0] + 0.03, top[1] + 0.2, at[2] - 0.08];
  const base = roundedCylinder(0.045, 0.055, 0.04, 0.012, 12).translate(...top);
  parts.metal.push(painted(base, CHROME, { crease: 0 }), limb(top, tip, 0.018, CHROME, { detail: 6, crease: 0 }));
  parts.glossy.push(ball(0.055, [1, 1, 1], tip, RED, { detail: 12, crease: 0.1 }));
}

// Round glowing eyes set close, glowing brows over them and a glowing open smile, and pink cheek lights, all in the
// skin kind, whose faint glow in each part's own colour lights them from within; the eyes' dark pupils and white
// highlights are glossy, so they shine on the plate.
export function addFace(parts, head) {
  [1, -1].forEach((side) => {
    const size = 0.09;
    const onEye = (layer) => onHead(layer, head, { across: side * 0.21, up: 0.1 });
    // The lit disc in a deeper cyan rim; on it a small dark pupil looking a little inward and down, two highlights.
    const lit = [
      oval(size * 1.1, size * 1.14, 0.01, [0, 0, 0], GLOW_DEEP, 10),
      oval(size, size * 1.05, 0.012, [0, 0, 0.006], GLOW),
    ];
    const marks = [
      oval(size * 0.36, size * 0.46, 0.012, [-side * size * 0.06, -size * 0.12, 0.02], PLATE, 10),
      oval(size * 0.2, size * 0.24, 0.008, [side * size * 0.3, size * 0.32, 0.028], 0xffffff, 8),
      oval(size * 0.09, size * 0.09, 0.006, [-side * size * 0.28, -size * 0.38, 0.026], 0xffffff, 6),
    ];
    parts.skin.push(...lit.map(onEye));
    parts.glossy.push(...marks.map(onEye));
    const cheek = painted(new THREE.CircleGeometry(0.045, 16).scale(1, 0.7, 1), 0xff86a8, { crease: 0 });
    parts.skin.push(onHead(cheek, head, { across: side * 0.43, up: -0.17, lift: 0.004 }));
  });
  parts.skin.push(...eyebrows(head, { across: 0.21, up: 0.42, length: 0.08, thickness: 0.026, tilt: 0.1, hex: GLOW }));
  parts.skin.push(onHead(painted(smileShape(0.19), GLOW, { crease: 0 }), head, { across: 0, up: -0.36, lift: 0.004 }));
}

// A flat open smile `width` across, as driver-face.js's mouth is shaped: its top curves up to the corners and its
// bottom is a deep round curve. Drawn in light on the plate, so it has no teeth or tongue. A grid of columns from
// bottom to top rather than one filled outline: an outline's long triangles cut under the dome's curve (onHead
// moves only their corners onto it), and the plate showed through them.
function smileShape(width) {
  const half = width / 2;
  const cornerLift = width * 0.16;
  const depth = width * 0.36;
  const grid = new THREE.PlaneGeometry(1, 1, 16, 3);
  const { position } = grid.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) * width;
    const share = position.getY(index) + 0.5;
    const top = cornerLift * (x / half) ** 2;
    const bottom = cornerLift - (cornerLift + depth) * Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
    position.setXY(index, x, bottom + (top - bottom) * share);
  }
  return grid;
}

// A thin curved streak `radius` round, `spread` radians long, `thickness` thick, bowing up, built round the origin
// facing +z for onHead.
function arc(radius, spread, thickness, hex) {
  const points = Array.from({ length: 7 }, (unused, step) => {
    const angle = Math.PI / 2 + spread * (step / 6 - 0.5);
    return new THREE.Vector3(radius * Math.cos(angle), radius * (Math.sin(angle) - 1), thickness);
  });
  return painted(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, thickness, 5, false), hex, { crease: 0 });
}

// An arm from `shoulder` to `hand`: a yellow ball joint at the shoulder and the elbow, ribbed chrome between them
// (a dark core under a run of short fat limbs), a chrome cuff and a big chrome mitt on the wheel, thumb on top.
export function addArm(parts, shoulder, hand) {
  const side = Math.sign(hand[0]);
  const elbow = [(shoulder[0] + hand[0]) / 2 + side * 0.1, (shoulder[1] + hand[1]) / 2 - 0.1, (shoulder[2] + hand[2]) / 2];
  const handAt = new THREE.Vector3(...hand);
  const wrist = handAt.clone().lerp(new THREE.Vector3(...elbow), 0.13 / handAt.distanceTo(new THREE.Vector3(...elbow))).toArray();
  parts.glossy.push(ball(0.1, [1, 1, 1], shoulder, YELLOW, { detail: 12, crease: 0.15 }));
  parts.glossy.push(ball(0.07, [1, 1, 1], elbow, YELLOW, { detail: 12, crease: 0.1 }));
  [[shoulder, elbow], [elbow, wrist]].forEach(([from, to]) => {
    parts.matte.push(limb(from, to, 0.04, GUNMETAL, { detail: 6, crease: 0 }));
    parts.metal.push(...ribs(from, to, 3));
  });
  parts.metal.push(limb(wrist, hand, 0.07, CHROME, { detail: 10, crease: 0 }));
  parts.metal.push(ball(0.1, [1.05, 0.85, 1.15], hand, CHROME, { detail: 12, crease: 0.15 }));
  parts.metal.push(ball(0.042, [1, 0.8, 1.3], [hand[0] - side * 0.025, hand[1] + 0.07, hand[2] + 0.01], CHROME, { detail: 10, crease: 0 }));
}

// `count` short fat chrome limbs spaced along from `from` to `to`, clear of the joints at both ends.
function ribs(from, to, count) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  return Array.from({ length: count }, (unused, index) => {
    const middle = start.clone().lerp(end, (index + 1) / (count + 1));
    const half = end.clone().sub(start).normalize().multiplyScalar(0.012);
    return limb(middle.clone().sub(half).toArray(), middle.clone().add(half).toArray(), 0.058, CHROME, { detail: 8, crease: 0 });
  });
}

// An oval `width` by `height` by `depth` (radii) at `at` in the face's flat axes, coloured `hex`.
function oval(width, height, depth, at, hex, detail = 12) {
  return ball(1, [width, height, depth], at, hex, { detail, crease: 0 });
}
