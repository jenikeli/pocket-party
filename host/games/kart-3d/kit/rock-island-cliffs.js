// A rocky island's rock (M9, from "M9: rock study" in docs/3d-findings.md): every mass's cliffs as flat facets
// (kit/rock-island-facets.js), stratum by stratum, with ledges and overhangs where one stratum is set back or out
// from the next, the notch at the waterline, and fallen blocks at the foot, all in one geometry. A stratum's top and
// bottom rings are roughened differently, so every face between them breaks into two flat triangles at slightly
// different angles, and each face has its own tone. The fine strata, joints and grit are in the rock's maps
// (kit/rock-island-maps.js). Used by kit/rock-island.js.

import * as THREE from 'three';
import { createRandom, between } from '../random.js';
import { createFacets } from './rock-island-facets.js';

// Pale limestone, warm and grey strata in turn (the map is pale too: these tint it), wet and dark at the foot, a
// little green where moss holds on a ledge.
const STRATA = [new THREE.Color(0xe8d6b4), new THREE.Color(0xd2bc98), new THREE.Color(0xc9c2b2)];
const WET = new THREE.Color(0x4a4a3c);
const MOSS = new THREE.Color(0x7e9a4c);
// The wet foot reaches up to this height (units), fading out over the next WET_FADE.
const WET_TOP = 0.5;
const WET_FADE = 1.6;
// The underside of an overhang is in shade, as the study's notches are.
const OVERHANG_SHADE = 0.55;
// A ledge this wide (units) or more holds moss.
const MOSS_LEDGE = 0.35;

// `island` from kit/rock-island-plan.js, `seed` its seed. Returns one indexed geometry with positions, normals,
// colours and texture coordinates.
export function buildRockFacets(island, seed) {
  const facets = createFacets();
  const random = createRandom(seed * 31 + 5);
  for (const mass of island.masses) {
    const strata = mass.tiers.map((tier, index) => STRATA[(index + Math.round(tier.tone + 1)) % STRATA.length]);
    mass.tiers.forEach((tier, index) => {
      addWall(facets, tier.bottom, tier.top, strata[index], mass.height, random);
      const next = mass.tiers[index + 1];
      if (next) {
        addBand(facets, mass, tier.top, next.bottom, strata[index + 1], random);
      }
    });
    addTop(facets, mass, strata.at(-1));
  }
  addBlocks(facets, island, random);
  return facets.toGeometry();
}

// The faces between two rings of the same corners, each corner's quad split into two flat triangles of one tone
// (the slight angle between them shows in the light, as a face of real rock is never quite one plane).
function addWall(facets, bottom, top, color, height, random) {
  const count = bottom.points.length;
  for (let corner = 0; corner < count; corner += 1) {
    const next = (corner + 1) % count;
    const [a, b] = [point(bottom, corner), point(bottom, next)];
    const [c, d] = [point(top, next), point(top, corner)];
    // The corners turn from +x toward +z round the mass, so this winding faces out, also into a cleft (where
    // a face looks sideways, and "away from the middle" would not tell).
    const tone = rockColor(color, (a[1] + c[1]) / 2, height, random);
    facets.add(a, c, b, null, tone);
    facets.add(a, d, c, null, tone);
  }
}

// The flat band where one stratum meets the next: a ledge where the upper one is set back (facing up, mossy if
// wide), an overhang where it stands out (facing down, in shade). Each triangle is judged on its own, by where its
// middle lies: over the lower stratum and out past the upper (a ledge), or the other way round (an overhang).
function addBand(facets, mass, lower, upper, color, random) {
  const count = lower.points.length;
  for (let corner = 0; corner < count; corner += 1) {
    const next = (corner + 1) % count;
    const [a, b, c, d] = [point(lower, corner), point(lower, next), point(upper, next), point(upper, corner)];
    for (const triangle of [[a, b, c], [a, c, d]]) {
      const middle = [0, 2].map((axis) => (triangle[0][axis] + triangle[1][axis] + triangle[2][axis]) / 3);
      const ledge = inside(lower.points, middle) && !inside(upper.points, middle);
      const width = Math.abs(reach(mass, a) + reach(mass, b) - reach(mass, c) - reach(mass, d)) / 2;
      const tone = ledge && width > MOSS_LEDGE ? color.clone().lerp(MOSS, 0.7) : color.clone().multiplyScalar(ledge ? 1 : OVERHANG_SHADE);
      facets.add(...triangle, [0, ledge ? 1 : -1, 0], rockColor(tone, lower.y, mass.height, random));
    }
  }
}

// Whether the point [x, z] lies inside the closed outline `points` (a ray cast along +x crosses it an odd number
// of times).
function inside(points, [x, z]) {
  let crossings = 0;
  points.forEach(([x1, z1], index) => {
    const [x2, z2] = points[(index + 1) % points.length];
    if (z1 > z !== z2 > z && x < x1 + ((z - z1) * (x2 - x1)) / (z2 - z1)) {
      crossings += 1;
    }
  });
  return crossings % 2 === 1;
}

// The top of the rock under the grass cap, a fan to its middle: hidden by the cap, but it closes the rock.
function addTop(facets, mass, color) {
  const top = mass.tiers.at(-1).top;
  const middle = [mass.x, top.y, mass.z];
  top.points.forEach((_, corner) => {
    facets.add(point(top, corner), middle, point(top, (corner + 1) % top.points.length), [0, 1, 0], color);
  });
}

// Blocks fallen from the cliffs lie round the foot, half in the water: angular, a dodecahedron stretched and
// turned (flat faces stay flat), none on the beach.
function addBlocks(facets, island, random) {
  const block = new THREE.DodecahedronGeometry(1, 0);
  const matrix = new THREE.Matrix4();
  island.masses.forEach((mass, massIndex) => {
    const foot = mass.tiers[0].top;
    const onBeach = new Set(island.beach?.mass === massIndex ? island.beach.corners : []);
    const count = Math.min(Math.round(foot.points.length * 0.6), 22);
    for (let index = 0; index < count; index += 1) {
      const corner = Math.floor(random() * foot.points.length);
      if (onBeach.has(corner)) {
        continue;
      }
      const size = between(random, 0.5, 1.6) * Math.min(mass.radius / 6, 1.4);
      const [x, , z] = point(foot, corner);
      const out = between(random, 0.3, 1.8);
      const [awayX, awayZ] = [x - mass.x, z - mass.z].map((value) => value / Math.hypot(x - mass.x, z - mass.z));
      matrix.compose(
        new THREE.Vector3(x + awayX * out, between(random, -0.5, 0.1) * size, z + awayZ * out),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6.3, random() * 6.3, random() * 6.3)),
        new THREE.Vector3(size * between(random, 1, 1.6), size * between(random, 0.6, 0.9), size * between(random, 0.9, 1.3)),
      );
      addPolyhedron(facets, block.clone().applyMatrix4(matrix), STRATA[index % STRATA.length], random);
    }
  });
  block.dispose();
}

// Every triangle of an unindexed shape as a facet of its own, darker low down where it is wet.
function addPolyhedron(facets, shape, color, random) {
  const { position } = shape.attributes;
  const corner = (index) => [position.getX(index), position.getY(index), position.getZ(index)];
  for (let first = 0; first < position.count; first += 3) {
    const [a, b, c] = [corner(first), corner(first + 1), corner(first + 2)];
    facets.add(a, b, c, null, rockColor(color, (a[1] + b[1] + c[1]) / 3, 1, random));
  }
  shape.dispose();
}

// A facet's colour: its stratum's, a little lighter or darker on its own (so neighbouring planes read apart),
// lighter higher up where the rock weathers pale, wet and dark at the foot.
function rockColor(color, y, height, random) {
  const lift = 0.92 + 0.12 * Math.min(Math.max(y / height, 0), 1);
  const facet = color.clone().multiplyScalar(lift * between(random, 0.9, 1.06));
  const dry = Math.min(Math.max((y - WET_TOP) / WET_FADE, 0), 1);
  return WET.clone().lerp(facet, dry);
}

function point(ring, corner) {
  const [x, z] = ring.points[corner];
  return [x, ring.y, z];
}

function reach(mass, [x, , z]) {
  return Math.hypot(x - mass.x, z - mass.z);
}
