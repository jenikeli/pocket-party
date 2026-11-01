// The kit's rocky islands (M7d3, rebuilt to the M7d4 study in M7d4d), as round MK8DX's sky courses (Mario Circuit,
// Toad Circuit): islands floating in the sky, a thick grassy top with a rounded lip hanging over cliffs of big
// rounded rock slabs, stacked in tiers with dark seams between them and stepping in to a point below (round trees
// on top come from kit/round-tree.js); and the same cliffs rising from the sea as the backdrop on the horizon.
// Every island of a kind is merged into two geometries (the grass and the rock), each island's outline wobbled its
// own way and each tier of slabs its own way again. Seen from far, so the tiers are the shape and the slabs, seams
// and cracks within them are in the rock's maps (kit/rock-maps.js), one material for every rock of the course.
// Used by the seaside sky.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { rockMaterial } from './rock-maps.js';

const SEGMENTS = 36;
const GRASS = 0x6cc04a;
// Warm tan to orange, one per tier of slabs.
const ROCK_COLORS = [0xeeb478, 0xe09a56, 0xf4c890, 0xd48a4c, 0xe8a866];
// The backdrop's rock is darker: far off, the haze lightens it, and pale rock washed out to a blank white wall.
const BACKDROP_COLORS = [0x7e6249, 0x93704c, 0x6f5640, 0x88694c];
// How dark a seam between two tiers is, like the crease where the rock meets the grass above it.
const SEAM_SHADE = 0.45;
// A slab's cross-section: four rows down its face, [how far along it, how far its edge tucks in (a share of the
// kind's rounding)]: rounded at the top and the foot, its face nearly upright between.
const SLAB_FACE = [[0.08, 0.6], [0.3, 0.1], [0.7, 0], [0.92, 0.7]];

// Cross-sections from the top down, [share of the radius out, height, shade (1 is the colour as it is)]: heights
// are in radii from the top for a floating island, in shares of its height above the sea for a backdrop cliff.
// The grass: its top, then the rounded lip over the rock, its underside dark where it overhangs.
const FLOATING_GRASS = [[0, 0.08, 1], [0.5, 0.06, 1], [0.85, 0.035, 1], [0.97, 0.02, 0.95], [1.01, 0, 0.85], [1.03, -0.035, 0.72], [1.02, -0.07, 0.55], [0.97, -0.095, 0.4], [0.88, -0.1, 0.3]];
const BACKDROP_GRASS = [[0, 1.04, 1], [0.5, 1, 1], [0.72, 0.95, 0.95], [0.8, 0.92, 0.85], [0.83, 0.885, 0.72], [0.825, 0.85, 0.55], [0.79, 0.83, 0.38], [0.73, 0.825, 0.3]];
// The rock: the crease under the grass, then tiers of slabs { out, from, to } (heights as above), then its end: a
// floating island's point, a backdrop cliff's foot under the sea. `rounding` is how far a slab's edges tuck in,
// `seam` how far in from the narrower tier a seam cuts, both in shares of the radius.
const FLOATING_ROCK = {
  crease: [0.9, -0.105],
  rounding: 0.05,
  seam: 0.08,
  tiers: [{ out: 0.94, from: -0.105, to: -0.32 }, { out: 0.84, from: -0.32, to: -0.52 }, { out: 0.7, from: -0.52, to: -0.72 }, { out: 0.54, from: -0.72, to: -0.9 }, { out: 0.36, from: -0.9, to: -1.05 }],
  end: [[0.16, -1.13, 0.6], [0, -1.2, 0.55]],
};
const BACKDROP_ROCK = {
  crease: [0.75, 0.83],
  rounding: 0.025,
  seam: 0.04,
  tiers: [{ out: 0.79, from: 0.83, to: 0.65 }, { out: 0.86, from: 0.65, to: 0.42 }, { out: 0.93, from: 0.42, to: 0.2 }, { out: 1, from: 0.2, to: -0.02 }],
  end: [[1.05, -0.03, 0.6], [1.08, -0.05, 0.55]],
};
// The rock's maps are laid on in tiles this many units round (and half as many down) for each kind.
const FLOATING_TILE = 10;
const BACKDROP_TILE = 24;

// `kit` is the course's (kit/kit.js), `islands` lists { x, z, y (the top's height), radius }. Returns the parts,
// [{ geometry, material }]: the grass and the rock.
export function buildFloatingIslands(kit, islands) {
  const place = (island) => (out, up) => [out * island.radius, island.y + up * island.radius];
  return islandParts(
    kit,
    mergeShapes(islands.map((island) => lathe(island, grassRows(FLOATING_GRASS), place(island), grassUv))),
    mergeShapes(islands.map((island) => lathe(island, rockRows(FLOATING_ROCK, ROCK_COLORS), place(island), rockUv(island.radius, FLOATING_TILE)))),
  );
}

// `cliffs` lists { x, z, radius, height }, standing on the sea at `seaLevel`. Returns the parts, as above.
export function buildBackdropCliffs(kit, cliffs, seaLevel) {
  const place = (cliff) => (out, up) => [out * cliff.radius, seaLevel + up * cliff.height];
  return islandParts(
    kit,
    mergeShapes(cliffs.map((cliff) => lathe(cliff, grassRows(BACKDROP_GRASS), place(cliff), grassUv))),
    mergeShapes(cliffs.map((cliff) => lathe(cliff, rockRows(BACKDROP_ROCK, BACKDROP_COLORS), place(cliff), rockUv(cliff.radius, BACKDROP_TILE)))),
  );
}

function islandParts(kit, grass, rock) {
  const { keep, textures } = kit;
  return [
    { geometry: keep(grass), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.grass, roughness: 0.95 })) },
    { geometry: keep(rock), material: rockMaterial(kit) },
  ];
}

// The rows a lathe turns round: { out, up, color, shade, tier } (tier: which tier of slabs, whose own wobble
// it takes; none for the grass and the seams, so a seam always lies inside the slabs either side of it).
function grassRows(profile) {
  return profile.map(([out, up, shade]) => ({ out, up, color: GRASS, shade, tier: null }));
}

// Each tier is a rounded slab (SLAB_FACE), lighter at its top and darker at its foot, then a dark seam cut in
// under it, back past the narrower of it and the next tier.
function rockRows({ crease, rounding, seam, tiers, end }, colors) {
  const rows = [{ out: crease[0], up: crease[1], color: colors[0], shade: SEAM_SHADE * 0.8, tier: null }];
  tiers.forEach(({ out, from, to }, tier) => {
    const color = colors[tier % colors.length];
    const [top, bottom] = [Math.max(from, to), Math.min(from, to)];
    for (const [along, tuck] of SLAB_FACE) {
      const up = from + (to - from) * along;
      rows.push({ out: out - tuck * rounding, up, color, shade: 0.8 + 0.28 * ((up - bottom) / (top - bottom)), tier });
    }
    if (tier < tiers.length - 1) {
      rows.push({ out: Math.min(out, tiers[tier + 1].out) - seam, up: to, color, shade: SEAM_SHADE, tier: null });
    }
  });
  const last = colors[(tiers.length - 1) % colors.length];
  return [...rows, ...end.map(([out, up, shade]) => ({ out, up, color: last, shade, tier: null }))];
}

// The grass's texture laid flat over the world, as on the beach islands (a tile per 6 units).
function grassUv({ x, z }) {
  return [x / 6, z / 6];
}

// The rock's tile round the island a whole number of times (so it meets itself), and down its rows by distance
// along the cross-section, so the slabs keep their size on slopes and overhangs alike.
function rockUv(radius, tile) {
  const repeats = Math.max(1, Math.round((2 * Math.PI * radius * 0.8) / tile));
  return ({ segment, along }) => [(segment / SEGMENTS) * repeats, -along / (tile / 2)];
}

// Turns `rows` round the island's middle, every corner's distance out wobbled by its angle: two waves phased by
// where the island is, so each has its own outline, and a third phased by its tier, so the tiers do not line up.
// `place(out, up)` gives a row's [radius, height], `uvAt({ segment, along, x, z })` a corner's texture coordinates
// (`along`: how far down the cross-section, in units). Rows run from the top down, so the faces point out.
function lathe(island, rows, place, uvAt) {
  const phase = island.x * 0.23 + island.z * 0.31;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const color = new THREE.Color();
  let along = 0;
  let previous = null;
  rows.forEach((row, index) => {
    const [radius, y] = place(row.out, row.up);
    along += previous ? Math.hypot(radius - previous[0], y - previous[1]) : 0;
    previous = [radius, y];
    color.setHex(row.color).multiplyScalar(row.shade);
    for (let segment = 0; segment <= SEGMENTS; segment += 1) {
      const angle = (segment / SEGMENTS) * 2 * Math.PI;
      const tierWobble = row.tier === null ? 0 : 0.04 * Math.sin(5 * angle + phase + 2.1 * row.tier);
      const wobble = 1 + 0.08 * Math.sin(3 * angle + phase) + 0.04 * Math.sin(7 * angle + phase * 1.7) + tierWobble;
      const [x, z] = [island.x + Math.cos(angle) * radius * wobble, island.z + Math.sin(angle) * radius * wobble];
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      uvs.push(...uvAt({ segment, along, x, z }));
      if (index > 0 && segment > 0) {
        const here = index * (SEGMENTS + 1) + segment;
        const above = here - (SEGMENTS + 1);
        indices.push(above - 1, above, here, above - 1, here, here - 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
