// The kit's round tree (M7d4c5, rebuilt to the study of MK8DX's Toad Circuit trees): a short thick trunk flaring
// at the root under a round crown of overlapping leaf scales (kit/leaf-scale.js) laid in five tiers on a ball,
// lighter on top and darker underneath, over a dark core so the gaps between scales read as shadow. About 5.4
// tall and 4 across, standing on y = 0. Under 1,500 triangles: scores stand on the sky's islands.
// Used by kit/props.js.

import * as THREE from 'three';
import { coloured, mergeShapes, shaded } from '../shape-utils.js';
import { createRandom, between } from '../random.js';
import { buildLeafScale } from './leaf-scale.js';
import { drawLeafScale } from './garden-textures.js';

// A round crown, a ball of CROWN_RADIUS about CROWN_Y. From the top tier down: the ring's angle from the top
// (radians), how many scales, their length and width, and the dark and light greens of their base and tip. The
// top is the lightest, the underside the darkest.
const CROWN_RADIUS = 1.85;
const CROWN_Y = 3.5;
const TIERS = [
  { polar: 0.25, count: 4, length: 1.1, width: 0.9, base: 0x4aa83a, tip: 0x8ae05c },
  { polar: 0.66, count: 8, length: 1.15, width: 1.0, base: 0x3a9a34, tip: 0x78d452 },
  { polar: 1.08, count: 12, length: 1.15, width: 0.98, base: 0x2e8530, tip: 0x62c244 },
  { polar: 1.5, count: 15, length: 1.15, width: 0.98, base: 0x24702a, tip: 0x4fb03a },
  { polar: 1.92, count: 14, length: 1.1, width: 0.98, base: 0x1a5a24, tip: 0x358f2e },
];
const TRUNK_COLOR = 0x7a5232;

// The tree's trunk (with the painted material) and canopy (with leaf maps), as parts.
export function buildRoundTree(kit) {
  const leafMaps = drawLeafScale();
  Object.values(leafMaps).forEach(kit.keep);
  const leafMaterial = new THREE.MeshStandardMaterial({ ...leafMaps, vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  return [
    { geometry: kit.keep(trunkShape()), material: kit.materials.painted },
    { geometry: kit.keep(canopyShape()), material: kit.keep(leafMaterial) },
  ];
}

// A lathe: flared at the root, then straight, darker at the foot where it meets the ground.
export function trunkShape() {
  const profile = [[0, 0], [0.85, 0], [0.6, 0.3], [0.46, 0.8], [0.4, 1.7], [0.38, 2.6], [0, 3.4]];
  const lathe = new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), 10);
  return shaded(coloured(lathe, TRUNK_COLOR), (x, y) => 0.6 + 0.4 * Math.min(y / 1.2, 1));
}

// The dark core and every tier's scales, one geometry. The scales are laid like shingles on a ball: each tier is a
// ring at one polar angle from the top, its scales lying along the surface with their tips pointing down the
// slope (so each tier's tips cover the tier below's bases), turned half a step from the tier above and jittered a
// little so they do not stand in rows.
export function canopyShape() {
  const random = createRandom(101);
  const core = coloured(new THREE.SphereGeometry(CROWN_RADIUS - 0.3, 8, 5).translate(0, CROWN_Y, 0), 0x174a1e);
  const scales = TIERS.flatMap((tier, tierIndex) =>
    Array.from({ length: tier.count }, (_, index) => {
      const turn = ((index + (tierIndex % 2) * 0.5) / tier.count) * 2 * Math.PI + between(random, -0.06, 0.06);
      const polar = tier.polar + between(random, -0.04, 0.04);
      return buildLeafScale({
        length: tier.length * between(random, 0.94, 1.06),
        width: tier.width,
        pitch: -polar,
        droop: 0.3,
        turn,
        position: [Math.sin(polar) * Math.sin(turn) * CROWN_RADIUS, CROWN_Y + Math.cos(polar) * CROWN_RADIUS, Math.sin(polar) * Math.cos(turn) * CROWN_RADIUS],
        base: tier.base,
        tip: tier.tip,
      });
    }),
  );
  return mergeShapes([core, ...scales]);
}
