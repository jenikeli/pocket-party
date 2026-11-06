// The planes' smooth skins (M9), lofted through cross-sections with karts/curved-shapes.js's loft: a fuselage
// through oval sections along x, its texture laid on once from nose to tail and round it, so a livery picture
// (kit/airliner-paint.js) covers it; and wings, tails and winglets through aerofoil sections. Used by the
// airliner's shapes (kit/airliner-shapes.js, kit/airliner-wings.js) and the prop plane (kit/prop-plane.js).

import * as THREE from 'three';
import { loft, joinNormals } from '../karts/curved-shapes.js';

// The point at angle `around` (0 at the bottom, PI/2 on the left side, -z, PI at the top) on the oval section
// { centre, halfHeight, halfWidth } at `x`.
export function sectionPoint(x, { centre, halfHeight, halfWidth }, around) {
  return new THREE.Vector3(x, centre - halfHeight * Math.cos(around), -halfWidth * Math.sin(around));
}

// A fuselage through the sections sectionAt(x) at each of `xs` (from tail to nose, x growing), `around` points
// round each. Texture coordinates: u from the nose (`noseX`, 0) to `length` behind it (1); v round the section
// from the bottom (0) up the left side to the top (0.5) and down the right side (1). Each ring repeats its first
// point at its end, so v runs to 1 with no texture squeezed between; the seam's normals are joined.
export function fuselageLoft(sectionAt, xs, { around, noseX, length }) {
  const rings = xs.map((x) => {
    const section = sectionAt(x);
    return Array.from({ length: around + 1 }, (unused, step) => sectionPoint(x, section, (2 * Math.PI * step) / around));
  });
  const skin = loft(rings);
  const uv = skin.attributes.uv;
  xs.forEach((x, row) => {
    for (let step = 0; step <= around; step += 1) {
      uv.setXY(row * (around + 1) + step, (noseX - x) / length, step / around);
    }
  });
  return joinNormals(skin);
}

// Positions from `from` to `to` spaced closer toward the end where `dense` is ('from', 'to' or 'both'), `count`
// of them: a fuselage's rings, close where its nose and tail curve fast.
export function spacedPositions(from, to, count, dense) {
  return Array.from({ length: count }, (unused, index) => {
    const share = index / (count - 1);
    const eased = {
      from: 1 - Math.cos((share * Math.PI) / 2),
      to: Math.sin((share * Math.PI) / 2),
      both: (1 - Math.cos(share * Math.PI)) / 2,
    }[dense];
    return from + (to - from) * eased;
  });
}

// Half an aerofoil's thickness at `share` of its chord from the leading edge, a share of its thickness: a NACA
// four-digit section's, with its trailing edge left a little round (a toy's wing has no sharp edge).
function halfThickness(share) {
  const naca = 5 * (0.2969 * Math.sqrt(share) - 0.126 * share - 0.3516 * share ** 2 + 0.2843 * share ** 3 - 0.1036 * share ** 4);
  return Math.max(naca, 0.06);
}

// One closed outline round an aerofoil, from its trailing edge along one face to the leading edge and back
// along the other: [along, across] pairs, along a share of the chord back from the leading edge and across a
// share of the thickness (half of it at most).
function aerofoilOutline(pointsPerFace) {
  const shares = Array.from({ length: pointsPerFace }, (unused, index) => (1 - Math.cos((index / (pointsPerFace - 1)) * Math.PI)) / 2);
  // The leading edge's point sits on the chord line, so the nose of the section is round on both faces.
  const face = shares.map((share) => [share, share === 0 ? 0 : halfThickness(share)]);
  const there = [...face].reverse();
  const back = face.slice(1, -1).map(([share, half]) => [share, -half]);
  return [...there, ...back];
}

// A wing, tail plane, fin or winglet through `sections` (from root to tip): { lead: [x, y, z] of its leading
// edge, chord (it runs back along -x), thickness }, its thickness along `thicknessAxis` ([x, y, z], y for a wing,
// z for a fin). The last section is closed flat to its chord line, a rounded tip. The rings' order is chosen so
// the skin faces out whichever way the sections run.
export function aerofoilLoft(sections, thicknessAxis, pointsPerFace = 9) {
  const outline = aerofoilOutline(pointsPerFace);
  const across = new THREE.Vector3(...thicknessAxis);
  const span = new THREE.Vector3(...sections.at(-1).lead).sub(new THREE.Vector3(...sections[0].lead));
  // loft's skin faces (the way along a ring) x (the way from ring to ring); along the first face it runs +x.
  const facesOut = new THREE.Vector3(1, 0, 0).cross(span).dot(across) > 0;
  const ordered = facesOut ? outline : [...outline].reverse();
  const tip = { ...sections.at(-1), thickness: 0.001 };
  const rings = [...sections, tip].map(({ lead, chord, thickness }) => ordered.map(([along, side]) => (
    new THREE.Vector3(...lead).add(new THREE.Vector3(-along * chord, 0, 0)).addScaledVector(across, side * thickness)
  )));
  return loft(rings, true);
}
