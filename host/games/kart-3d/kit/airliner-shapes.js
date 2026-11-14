// The airliner's body (M9), after a narrow-body jet made fat and toy-like as
// The reference airport course planes are: a round fuselage 45 long with a blunt nose and a tail cone sweeping up,
// the fairing under its wings, and its tail: a swept fin and tail planes. It stands on its gear (kit/airliner-
// gear.js) facing +x, its left side toward -z. Returns shapes by part, as kit/terminal-body.js does; the
// livery's pictures (kit/airliner-liveries.js) are laid on the fuselage and fin by their texture coordinates.

import * as THREE from 'three';
import { at, coloured } from '../shape-utils.js';
import { aerofoilLoft, fuselageLoft, spacedPositions } from './airliner-lofts.js';

// The fuselage: its axis's height, radius, and where its nose, round middle and tail cone start and end.
export const FUSELAGE = Object.freeze({ axisY: 4.1, radius: 3, noseX: 22.5, noseStart: 12.5, tailStart: -9, tailX: -22.5 });
export const FUSELAGE_LENGTH = FUSELAGE.noseX - FUSELAGE.tailX;
// The nose's tip sits this far below the axis, as a jet's nose droops toward its windscreen.
const NOSE_DROP = 0.8;
// The tail cone's top drops by this much, and its bottom sweeps up to this far under its top.
const TAIL_TOP_DROP = 0.9;
const TAIL_END_HEIGHT = 0.5;
// The cabin's floor, where the doors' sills are (the terminal's jet bridges meet them at 3.2, kit/terminal-
// bridges.js), and the front left door's middle along x.
export const SILL_Y = 3.2;
export const FRONT_DOOR_X = 13.5;
export const REAR_DOOR_X = -15.5;
// The fin: its root's leading edge, chord and height, and how far back its top is swept.
export const FIN = Object.freeze({ rootX: -11.2, rootY: 6, rootChord: 8, height: 7.6, tipChord: 3.2, sweep: 6.2 });
const AROUND = 64;

// The fuselage's oval section at `x`: { centre, halfHeight, halfWidth }.
export function fuselageSection(x) {
  const { axisY, radius, noseX, noseStart, tailStart, tailX } = FUSELAGE;
  if (x > noseStart) {
    // Elliptic toward the tip, the top curving down faster than the flatter bottom.
    const share = Math.min((x - noseStart) / (noseX - noseStart), 1);
    const tipY = axisY - NOSE_DROP;
    const top = tipY + (axisY + radius - tipY) * Math.sqrt(1 - share ** 2);
    const bottom = tipY - (tipY - (axisY - radius)) * Math.cbrt(1 - share ** 3);
    return { centre: (top + bottom) / 2, halfHeight: (top - bottom) / 2, halfWidth: radius * Math.sqrt(1 - share ** 2.2) };
  }
  if (x < tailStart) {
    const share = Math.min((tailStart - x) / (tailStart - tailX), 1);
    const top = axisY + radius - TAIL_TOP_DROP * share ** 2;
    const endBottom = axisY + radius - TAIL_TOP_DROP - TAIL_END_HEIGHT;
    const bottom = axisY - radius + (endBottom - (axisY - radius)) * share ** 1.5;
    return { centre: (top + bottom) / 2, halfHeight: (top - bottom) / 2, halfWidth: 0.25 + (radius - 0.25) * (1 - share ** 1.8) };
  }
  return { centre: axisY, halfHeight: radius, halfWidth: radius };
}

// Where the fuselage's skin is on the left side (-z) at height `y` and along `x`.
export function leftSideAt(x, y) {
  const { centre, halfHeight, halfWidth } = fuselageSection(x);
  const share = Math.min(Math.abs(y - centre) / halfHeight, 1);
  return -halfWidth * Math.sqrt(1 - share ** 2);
}

// The fuselage's rings: close together toward the nose and the tail, every 3 units along the round middle, and
// a last ring just behind the tail cone's end, closed to a point.
function fuselageXs() {
  const { noseX, noseStart, tailStart, tailX } = FUSELAGE;
  const middle = spacedPositions(tailStart, noseStart, 8, 'both').slice(1, -1);
  return [tailX - 0.15, ...spacedPositions(tailX, tailStart, 14, 'from'), ...middle, ...spacedPositions(noseStart, noseX, 18, 'to')];
}

function tailEndSection(x) {
  return x < FUSELAGE.tailX ? { ...fuselageSection(FUSELAGE.tailX), halfHeight: 0, halfWidth: 0 } : fuselageSection(x);
}

// { body, fin, painted, wing }: the fuselage (its livery's picture), the fin (its livery's tail picture), the
// fairing under the wings and the beacon, and the tail planes.
export function buildAirlinerBody() {
  return {
    body: [coloured(fuselageLoft(tailEndSection, fuselageXs(), { around: AROUND, noseX: FUSELAGE.noseX, length: FUSELAGE_LENGTH }), 0xffffff)],
    fin: [buildFin()],
    // The fairing, and a red beacon on top.
    painted: [buildFairing(), coloured(at(new THREE.SphereGeometry(0.22, 10, 6, 0, 2 * Math.PI, 0, Math.PI / 2), 1, FUSELAGE.axisY + FUSELAGE.radius - 0.03, 0), 0xd8302a)],
    wing: [-1, 1].map(buildTailPlane),
  };
}

// The fin, its texture laid on from the side over the box round it, so the tail's picture covers it.
function buildFin() {
  const { rootX, rootY, rootChord, height, tipChord, sweep } = FIN;
  const fin = coloured(aerofoilLoft([
    { lead: [rootX, rootY, 0], chord: rootChord, thickness: 0.7 },
    { lead: [rootX - sweep * 0.5, rootY + height * 0.5, 0], chord: (rootChord + tipChord) / 2, thickness: 0.5 },
    { lead: [rootX - sweep, rootY + height, 0], chord: tipChord, thickness: 0.32 },
  ], [0, 0, 1]), 0xffffff);
  const { position, uv } = fin.attributes;
  const left = rootX - rootChord - sweep;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, (position.getX(index) - left) / (rootX - left), (position.getY(index) - rootY) / height);
  }
  return fin;
}

// A tail plane on `side` (-1 left, 1 right), swept back with a little dihedral.
function buildTailPlane(side) {
  const root = [-14.6, 4.7, side * 0.6];
  const tip = [root[0] - 5.2, root[1] + 0.8, side * 8.6];
  return coloured(aerofoilLoft([
    { lead: root, chord: 5.4, thickness: 0.6 },
    { lead: tip, chord: 2.1, thickness: 0.26 },
  ], [0, 1, 0]), 0xdfe3e8);
}

// The fairing under the wings' roots, a long flattened pod in the belly's grey that the main gear tucks into.
function buildFairing() {
  const pod = new THREE.SphereGeometry(1, 32, 16).scale(8.5, 1.1, 2.3);
  return coloured(at(pod, 0.5, 2.05, 0), 0xc4cad2);
}
