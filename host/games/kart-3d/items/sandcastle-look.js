// The blocker's shapes (M8b): a sandcastle, our own design. A round keep and four corner towers moulded as if from
// a bucket (ridges round them), walls between them with a gate in the front one, crenellations on top, dark
// windows, a starfish and shells stuck on, all on a mound of sand that is wet and darker at its foot; a little
// red flag on the keep; and the pile it slumps into at its end. The sand's grain is in drawn maps
// (sand-look.js). Built once, round the castle's middle on y = 0, z along the road (the karts come from -z).
// Used by road-object-drawing.js; how it moves is road-object-motion.js.

import * as THREE from 'three';
import { coloured, indexed, mergeShapes, roundedBox } from '../shape-utils.js';
import { finishInSand } from './sand-look.js';
import { BLOCKER_SIZE } from './road-objects.js';

// Designed at this radius and height, then scaled to the rules' BLOCKER_SIZE, so the castle is always the size
// the karts bump off.
const DESIGN_RADIUS = 1.4;
const DESIGN_HEIGHT = 1.6;
const SAND_HEX = 0xf3d59e;
const HOLE_HEX = 0x6e4b2b;
const STARFISH_HEX = 0xff7b3a;
const SHELL_HEXES = [0xfff3e8, 0xffc4cc];
const POLE_HEX = 0x8a5a2e;
const FLAG_HEX = 0xe8332b;
const KNOB_HEX = 0xffd84a;
// The mound's top, and the keep's and the towers' sizes (design units): radius at the bottom and top, height,
// sides round, merlons on top, and the heights of the bucket's ridges as shares of the height.
const MOUND_TOP = 0.24;
const KEEP = { bottom: 0.56, top: 0.46, height: 1.14, sides: 12, merlons: 6, ridges: [0.3, 0.62] };
const TOWER = { bottom: 0.36, top: 0.3, height: 0.78, sides: 10, merlons: 4, ridges: [0.4], out: 0.86 };
const MERLON_HEIGHT = 0.22;
const WALL = { length: 1.02, height: 0.58, thickness: 0.2 };
// Windows and the starfish sit above the top ridge, below the lip: this share of the way up.
const WINDOW_SHARE = 0.81;
// The flag's pole stands on the keep's roof (units above the road, after scaling), this tall.
const FLAG_FOOT = (MOUND_TOP + KEEP.height) * (BLOCKER_SIZE.height / DESIGN_HEIGHT);
const POLE_HEIGHT = 0.6;
const PENNANT = { length: 0.42, depth: 0.26 };

// The castle: one geometry, coloured per vertex, with its grain's texture coordinates.
export function buildSandcastle() {
  const keepRoof = MOUND_TOP + KEEP.height;
  const parts = [mound(), tower(KEEP, 0, 0), ...merlonRing(KEEP, 0, 0, keepRoof), ...keepDecor(), ...shells()];
  for (let corner = 0; corner < 4; corner += 1) {
    const angle = Math.PI / 4 + (corner * Math.PI) / 2;
    const [x, z] = [Math.cos(angle) * TOWER.out, Math.sin(angle) * TOWER.out];
    parts.push(tower(TOWER, x, z), ...merlonRing(TOWER, x, z, MOUND_TOP + TOWER.height), wall(angle + Math.PI / 4));
    // A window on each tower, facing out.
    const out = TOWER.out + radiusAt(TOWER, WINDOW_SHARE) + 0.01;
    parts.push(hole(0.1, 0.14, Math.cos(angle) * out, MOUND_TOP + WINDOW_SHARE * TOWER.height, Math.sin(angle) * out, Math.PI / 2 - angle));
  }
  return finish(mergeShapes(parts));
}

// The pile the castle slumps into: a soft, lumpy mound with a few tumbled blocks.
export function buildSandPile() {
  const radii = [1.6, 1.5, 1.3, 1.02, 0.7, 0.36, 0];
  const pile = new THREE.LatheGeometry(radii.map((radius) => new THREE.Vector2(radius, 0.62 * Math.cos((radius / 1.6) * (Math.PI / 2)) ** 1.4)), 14);
  const { position } = pile.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const angle = Math.atan2(z, x);
    const lump = 1 + 0.08 * Math.sin(3 * angle + 1.3) + 0.04 * Math.sin(5 * angle);
    position.setXYZ(index, x * lump, y * (1 + 0.18 * Math.sin(2 * angle + 0.6)), z * lump);
  }
  pile.computeVertexNormals();
  const blocks = [[0.75, 0.28, -0.3, 1], [-0.55, 0.34, 0.4, 2.4], [0.05, 0.42, -0.6, 4.1]].map(([x, y, z, turn]) =>
    coloured(new THREE.BoxGeometry(0.24, 0.2, 0.18).rotateX(turn).rotateY(turn).translate(x, y, z), SAND_HEX));
  return finish(mergeShapes([coloured(pile, SAND_HEX), ...blocks]));
}

// The pole with a knob on top and the pennant bent in a frozen ripple, standing on the keep's roof in the castle's
// own units, its pole on the castle's axis (so the drawing turns it in the wind about y and it moves with the
// castle).
export function buildFlag() {
  const pole = coloured(new THREE.CylinderGeometry(0.022, 0.026, POLE_HEIGHT, 6).translate(0, POLE_HEIGHT / 2, 0), POLE_HEX);
  const pennant = new THREE.PlaneGeometry(PENNANT.length, PENNANT.depth, 6, 1);
  const { position } = pennant.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const along = position.getX(index) / PENNANT.length + 0.5;
    const y = position.getY(index) * (1 - along * 0.92) + POLE_HEIGHT - PENNANT.depth / 2 - 0.03;
    position.setXYZ(index, along * PENNANT.length, y, 0.05 * Math.sin(along * Math.PI * 2.2) * along);
  }
  pennant.computeVertexNormals();
  const knob = coloured(indexed(new THREE.IcosahedronGeometry(0.04, 0)).translate(0, POLE_HEIGHT, 0), KNOB_HEX);
  return mergeShapes([pole, coloured(pennant, FLAG_HEX), knob]).translate(0, FLAG_FOOT, 0);
}

// The flag's material: the pennant is a single sheet, seen from both sides.
export function createFlagMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, side: THREE.DoubleSide });
}

// The mound the castle stands on, its edge sloping down to the road.
function mound() {
  const points = [[DESIGN_RADIUS, 0], [1.37, 0.09], [1.3, 0.17], [1.18, 0.23], [0.9, MOUND_TOP], [0, MOUND_TOP + 0.01]];
  return coloured(new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), 16), SAND_HEX);
}

// A tower's radius a share of the way up it (it narrows toward the top, as a bucket's mould does).
function radiusAt({ bottom, top }, share) {
  return bottom + (top - bottom) * share;
}

// A bucket-moulded tower at (x, z) on the mound: ridges round it, a lip at its top edge, a flat roof.
function tower(size, x, z) {
  const { bottom, top, height, sides, ridges } = size;
  const points = [[bottom + 0.03, -0.04], [bottom, 0.04]];
  for (const share of ridges) {
    const [y, radius] = [share * height, radiusAt(size, share)];
    points.push([radius, y - 0.045], [radius + 0.03, y], [radius, y + 0.045]);
  }
  points.push([top + 0.035, height - 0.08], [top + 0.035, height], [0, height]);
  const shape = new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), sides);
  return coloured(shape.translate(x, MOUND_TOP, z), SAND_HEX);
}

// The crenellations round a tower's top at `y`: blocks on its rim, gaps between.
function merlonRing({ top, merlons }, x, z, y) {
  return Array.from({ length: merlons }, (unused, index) => {
    const angle = ((index + 0.5) * 2 * Math.PI) / merlons;
    const block = new THREE.BoxGeometry(top * 0.62, MERLON_HEIGHT, 0.16);
    block.rotateY(Math.PI / 2 - angle).translate(x + Math.cos(angle) * (top - 0.05), y + MERLON_HEIGHT / 2, z + Math.sin(angle) * (top - 0.05));
    return coloured(block, SAND_HEX);
  });
}

// The wall between two corner towers, facing out at `angle`, with two merlons on it; the front one (facing the
// karts coming, -z) has the gate.
function wall(angle) {
  const out = TOWER.out * Math.SQRT1_2;
  const pieces = [roundedBox(WALL.length, WALL.height, WALL.thickness, 0.04, { chamfered: true }).translate(0, MOUND_TOP + WALL.height / 2, out)];
  for (const along of [-0.22, 0.22]) {
    pieces.push(new THREE.BoxGeometry(0.16, 0.14, WALL.thickness).translate(along, MOUND_TOP + WALL.height + 0.07, out));
  }
  const sand = coloured(mergeShapes(pieces), SAND_HEX);
  const facesFront = Math.abs(Math.sin(angle) + 1) < 1e-6;
  const parts = facesFront ? [sand, hole(0.24, 0.4, 0, MOUND_TOP + 0.2, out + WALL.thickness / 2 + 0.008, 0)] : [sand];
  return mergeShapes(parts).rotateY(Math.PI / 2 - angle);
}

// A dark arched opening `width` by `height` flat against a wall at (x, y, z), facing out at `turn` about y (0
// faces +z).
function hole(width, height, x, y, z, turn) {
  const arch = new THREE.Shape();
  arch.moveTo(-width / 2, -height / 2);
  arch.lineTo(width / 2, -height / 2);
  arch.lineTo(width / 2, height / 2 - width / 2);
  arch.absarc(0, height / 2 - width / 2, width / 2, 0, Math.PI, false);
  arch.closePath();
  return coloured(new THREE.ShapeGeometry(arch, 4).rotateY(turn).translate(x, y, z), HOLE_HEX);
}

// The keep's two side windows and, facing the karts, an orange starfish stuck on it as children decorate theirs.
function keepDecor() {
  const y = MOUND_TOP + WINDOW_SHARE * KEEP.height;
  const out = radiusAt(KEEP, WINDOW_SHARE) + 0.01;
  const windows = [Math.PI / 2, -Math.PI / 2].map((turn) => hole(0.1, 0.16, Math.sin(turn) * out, y, 0, turn));
  const outline = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const [angle, reach] = [Math.PI / 2 + (point * Math.PI) / 5, point % 2 === 0 ? 0.1 : 0.042];
    outline[point === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * reach, Math.sin(angle) * reach);
  }
  const star = indexed(new THREE.ExtrudeGeometry(outline, { depth: 0.025, bevelEnabled: false }));
  return [...windows, coloured(star.rotateY(Math.PI).translate(0, y, -out + 0.012), STARFISH_HEX)];
}

// Three shells lying on the mound.
function shells() {
  return [[0.8, -0.85, 0], [-1.05, -0.55, 1], [0.15, 1.15, 0]].map(([x, z, kind]) =>
    coloured(indexed(new THREE.IcosahedronGeometry(0.08, 0)).scale(1, 0.45, 1.25).rotateY(x * 3).translate(x, 0.2, z), SHELL_HEXES[kind]));
}

// Scaled to the rules' size and finished in sand (wet at its foot, darker in the creases round the mound's top).
function finish(geometry) {
  const upward = BLOCKER_SIZE.height / DESIGN_HEIGHT;
  const across = BLOCKER_SIZE.radius / DESIGN_RADIUS;
  return finishInSand(geometry.scale(across, upward, across), MOUND_TOP * upward);
}
