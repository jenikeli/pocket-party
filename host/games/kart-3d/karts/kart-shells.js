// Our go-kart's two smooth shells (M7d5, round 3), each lofted through cross-sections (curved-shapes.js's loft) so
// it is one smooth form, as MK8DX's Standard Kart's are (test-results/reference/m7d5/): the long nose, a rounded
// box in section that slopes down from the cockpit to a round tip, its paint split into a top in the main colour,
// sides in the second and a skirt in the third along crisp lines (each band its own surface, meeting edge to
// edge); and the cowl, a curved blade sweeping round the driver's legs, tall at the front, thinner and lower round
// the sides until it fades into the pods, bulging out at its foot, with a rim in the main colour. Used by
// kart-body.js.

import * as THREE from 'three';
import { loft } from './curved-shapes.js';
import { kartPart } from './part-shapes.js';

// The nose from its back (t = 0, inside the cowl) to its tip (t = 1): where it is, how wide and how high.
const NOSE = { backZ: 0.12, length: 1.1, halfWidth: 0.35, narrowing: 0.05, backTop: 0.7, drop: 0.36, bottom: 0.11 };
// The tip rounds off over this last share of the nose.
const NOSE_TIP = 0.14;
// How square its sections are (2 a circle, more is boxier).
const NOSE_SQUARENESS = 3.4;
// Its paint bands, by how high up a section they reach (shares of its half height from its middle).
const TOP_FROM = 0.4;
const SKIRT_BELOW = -0.5;
// The emblem's disc on the nose's top, where it is flattest (kart-body.js places it).
export const NOSE_EMBLEM = { at: [0, 0.478, 0.842], normal: [0, 0.951, 0.311], radius: 0.17 };

// The cowl round the legs: an arc round (0, COWL_MIDDLE_Z), open at the back.
const COWL = { middleZ: 0.3, radius: 0.36, reach: (105 * Math.PI) / 180, base: 0.42, thickness: 0.11, flare: 0.08 };

// Returns the shells' parts (part-shapes.js's kartPart), naming their palette colours.
export function buildShells() {
  return [...buildNose(), ...buildCowl()];
}

// The nose's section at t: { z, halfWidth, middle, halfHeight }, rounding off to nothing at the tip.
function noseSection(t) {
  const tipShare = Math.max(0, (t - (1 - NOSE_TIP)) / NOSE_TIP);
  const rounding = Math.sqrt(Math.max(0, 1 - tipShare * tipShare));
  const top = NOSE.backTop - NOSE.drop * t;
  return {
    z: NOSE.backZ + NOSE.length * t,
    halfWidth: (NOSE.halfWidth - NOSE.narrowing * t) * rounding,
    middle: (top + NOSE.bottom) / 2,
    halfHeight: ((top - NOSE.bottom) / 2) * rounding,
  };
}

// The nose's four paint bands, each lofted over its part of every section: angles go round a section from the
// kart's left (0) over the top (pi / 2) and under.
function buildNose() {
  const angleAt = (share) => Math.asin(Math.abs(share) ** (NOSE_SQUARENESS / 2)) * Math.sign(share);
  const [topFrom, skirtAt] = [angleAt(TOP_FROM), angleAt(SKIRT_BELOW)];
  const bands = [
    { role: 'third', from: Math.PI - skirtAt, to: 2 * Math.PI + skirtAt, points: 7 },
    { role: 'second', from: skirtAt, to: topFrom, points: 6 },
    { role: 'main', from: topFrom, to: Math.PI - topFrom, points: 10 },
    { role: 'second', from: Math.PI - topFrom, to: Math.PI - skirtAt, points: 6 },
  ];
  // Rings closer together toward the tip, where it curves most.
  const shares = [...Array.from({ length: 15 }, (unused, step) => (step / 15) * (1 - NOSE_TIP)), ...Array.from({ length: 9 }, (unused, step) => 1 - NOSE_TIP * Math.cos(((step + 1) / 9) * (Math.PI / 2)))];
  return bands.map(({ role, from, to, points }) => {
    const rings = shares.map((t) => {
      const section = noseSection(t);
      return Array.from({ length: points }, (unused, index) => sectionPoint(section, from + ((to - from) * index) / (points - 1)));
    });
    return kartPart('glossy', loft(rings), role, 0.15);
  });
}

// The point at `angle` round a nose section (a superellipse, round-cornered and nearly flat on top).
function sectionPoint({ z, halfWidth, middle, halfHeight }, angle) {
  const bend = (value) => Math.sign(value) * Math.abs(value) ** (2 / NOSE_SQUARENESS);
  return new THREE.Vector3(halfWidth * bend(Math.cos(angle)), middle + halfHeight * bend(Math.sin(angle)), z);
}

// The cowl: a section (a thick blade, rounded on top) carried round the arc from the kart's left to its right,
// and its rim tube along the top.
function buildCowl() {
  const steps = 30;
  const tops = [];
  const rings = Array.from({ length: steps + 1 }, (unused, step) => {
    // From the left round to the right, so the surface faces out.
    const angle = COWL.reach - (2 * COWL.reach * step) / steps;
    const out = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const foot = new THREE.Vector3(0, COWL.base, COWL.middleZ).addScaledVector(out, COWL.radius);
    const height = cowlHeight(angle);
    const ring = cowlSection(height).map(([across, up]) => foot.clone().addScaledVector(out, across).setY(COWL.base + up));
    tops.push(foot.clone().addScaledVector(out, cowlBulge(height, height)).setY(COWL.base + height + 0.025));
    return ring;
  });
  const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tops), 26, 0.038, 6, false);
  return [kartPart('glossy', loft(rings, true), 'second', 0.3), kartPart('glossy', rim, 'main', 0)];
}

// How tall the cowl stands at `angle` round its arc: the steering wheel's height at the front, lower round the
// sides, and fading to nothing at its ends.
function cowlHeight(angle) {
  const front = Math.max(0, Math.cos(angle));
  const fade = Math.min(1, (COWL.reach - Math.abs(angle)) / 0.4);
  return Math.max(0.03, (0.2 + 0.24 * front ** 1.5) * fade * (2 - fade));
}

// The cowl's section `height` tall as [across (outward), up] points, from its foot outside, up over its rounded
// top and down inside: thick at the foot and thinner at the top, its foot bulging outward.
function cowlSection(height) {
  const outside = [0, 0.3, 0.6, 0.85].map((share) => [cowlBulge(height, share * height) + cowlThickness(height, share * height) / 2, share * height]);
  const inside = [0.85, 0.6, 0.3, 0].map((share) => [cowlBulge(height, share * height) - cowlThickness(height, share * height) / 2, share * height]);
  const topThickness = cowlThickness(height, height);
  const lip = [[topThickness * 0.4, height + 0.015], [0, height + 0.025], [-topThickness * 0.4, height + 0.015]];
  return [...outside, ...lip.map(([across, up]) => [cowlBulge(height, height) + across, up]), ...inside];
}

function cowlThickness(height, up) {
  return COWL.thickness * (1 - 0.45 * (up / Math.max(height, 0.001)));
}

// How far out the cowl leans at `up` in a section `height` tall: most at its foot.
function cowlBulge(height, up) {
  const share = 1 - up / Math.max(height, 0.001);
  return COWL.flare * share * share;
}
