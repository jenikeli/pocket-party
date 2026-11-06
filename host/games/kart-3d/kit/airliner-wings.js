// The airliner's wings (M9): low, swept wings 42 across with a little dihedral, winglets in the livery's colour,
// navigation lights, flap-track fairings under them, and an engine under each on a pylon, its intake lip in the livery's colour, a
// dark fan with a spinner, and an exhaust cone. Returns shapes by part, as kit/airliner-shapes.js does.

import * as THREE from 'three';
import { at, coloured, roundedBox } from '../shape-utils.js';
import { aerofoilLoft } from './airliner-lofts.js';

// The wing at its root (inside the fuselage), at the engine and at its tip: leading edge, chord, thickness.
const ROOT = { x: 4.5, y: 2.35, z: 1.8, chord: 8.5, thickness: 0.9 };
const SWEEP = Math.tan((27 * Math.PI) / 180);
const DIHEDRAL = Math.tan((7 * Math.PI) / 180);
const TIP_Z = 21;
const TIP_CHORD = 2.6;
// The engines hang under the wing this far out, this far under its leading edge and reaching this far ahead.
const ENGINE_Z = 7.5;
const ENGINE = { radius: 1.15, drop: 1.3, ahead: 2.6, length: 4.8 };
const WHITE = 0xf4f5f2;
const WING_GREY = 0xdfe3e8;

// The wing's leading edge, chord and thickness `z` out from the middle (positive either side).
function wingAt(z) {
  const share = (z - ROOT.z) / (TIP_Z - ROOT.z);
  return {
    lead: [ROOT.x - (z - ROOT.z) * SWEEP, ROOT.y + (z - ROOT.z) * DIHEDRAL],
    chord: ROOT.chord + (TIP_CHORD - ROOT.chord) * share,
    thickness: ROOT.thickness + (0.28 - ROOT.thickness) * share,
  };
}

// { wing, trim, painted }: both wings and their fairings, the winglets and intake lips, the engines.
export function buildAirlinerWings() {
  const parts = { wing: [], trim: [], painted: [] };
  for (const side of [-1, 1]) {
    const section = (z) => {
      const { lead, chord, thickness } = wingAt(z);
      return { lead: [lead[0], lead[1], side * z], chord, thickness };
    };
    parts.wing.push(coloured(aerofoilLoft([section(ROOT.z), section(ENGINE_Z), section(TIP_Z)], [0, 1, 0]), WING_GREY));
    parts.wing.push(...[5, 11, 15].map((z) => flapFairing(section(z))));
    parts.trim.push(winglet(section(TIP_Z)));
    // Navigation lights on the wing tips' leading edges: red on the left, green on the right (unlit by day).
    const tip = section(TIP_Z).lead;
    parts.painted.push(coloured(at(new THREE.SphereGeometry(0.16, 10, 8), tip[0] - 0.15, tip[1], tip[2] + side * 0.1), side < 0 ? 0xd8302a : 0x2fae5a));
    const engine = buildEngine(section(ENGINE_Z));
    parts.painted.push(...engine.painted);
    parts.trim.push(engine.lip);
  }
  return parts;
}

// A long pod under the wing's back half, where real flaps run on their tracks.
function flapFairing({ lead, chord, thickness }) {
  const pod = new THREE.SphereGeometry(1, 12, 8).scale(chord * 0.42, 0.28, 0.24);
  return coloured(at(pod, lead[0] - chord * 0.78, lead[1] - thickness * 0.4, lead[2]), 0xc8ced6);
}

// A winglet standing up off the wing's tip, swept back and leaning a little out.
function winglet({ lead, chord }) {
  const out = Math.sign(lead[2]);
  return coloured(aerofoilLoft([
    { lead: [lead[0] - 0.3, lead[1], lead[2]], chord: chord * 0.85, thickness: 0.22 },
    { lead: [lead[0] - 2.1, lead[1] + 2.6, lead[2] + out * 0.45], chord: 0.9, thickness: 0.12 },
  ], [0, 0, 1]), 0xffffff);
}

// A shape turned round the x axis from `profile` ([radius, along] pairs, along growing toward the front), its
// back at x = `back`.
function turned(profile, back, y, z, segments = 28) {
  const lathe = new THREE.LatheGeometry(profile.map(([radius, along]) => new THREE.Vector2(radius, along)), segments);
  return at(lathe.rotateZ(-Math.PI / 2), back, y, z);
}

// The engine under the wing at `section`: { painted, lip }.
function buildEngine({ lead, chord }) {
  const { radius, drop, ahead, length } = ENGINE;
  const y = lead[1] - drop;
  const z = lead[2];
  const back = lead[0] + ahead - length;
  const cowl = [[radius * 0.68, 0], [radius * 0.83, 0.5], [radius * 0.97, 2], [radius, length - 1.2]];
  const lip = [[radius, length - 1.2], [radius * 0.96, length - 0.5], [radius * 0.89, length - 0.18], [radius * 0.8, length - 0.1], [radius * 0.75, length - 0.2], [radius * 0.73, length - 0.6]];
  const pylonLength = chord * 0.75 + ahead * 0.6;
  return {
    lip: coloured(turned(lip, back, y, z), 0xffffff),
    painted: [
      coloured(turned(cowl, back, y, z), WHITE),
      coloured(at(new THREE.CylinderGeometry(radius * 0.73, radius * 0.73, 0.06, 28).rotateZ(Math.PI / 2), back + length - 0.6, y, z), 0x3a3f47),
      coloured(turned([[0, 0], [0.32, 0.05], [0.24, 0.35], [0, 0.5]], back + length - 0.62, y, z, 16), 0xe8eaec),
      coloured(at(new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, 0.05, 28).rotateZ(Math.PI / 2), back + 0.02, y, z), 0x2a2d33),
      coloured(turned([[0, -0.8], [0.25, -0.5], [0.5, 0], [0, 0.02]], back, y, z, 16), 0x8d939b),
      coloured(at(roundedBox(pylonLength, drop, 0.4, 0.15), lead[0] + ahead * 0.4 - pylonLength / 2, y + drop * 0.6, z), WING_GREY),
    ],
  };
}
