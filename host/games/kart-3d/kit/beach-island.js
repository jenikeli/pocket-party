// The kit's beach islands (M7d3), as off MK8DX's Cheep Cheep Beach and Koopa Cape: sand round a grassy hill, a
// shelf of pale sand under the water round it, turquoise shallows over that shelf fading into the deep blue, and
// white foam where the water meets the beach. Every island's land, shallows, foam and rocks are merged into one
// geometry each; their outline and height come from seaside-landmarks.js. Used by the seaside surroundings.

import * as THREE from 'three';
import { shoreRadius, islandHeightAt } from '../seaside-landmarks.js';
import { createRandom, between } from '../random.js';
import { coloured, mergeShapes } from '../shape-utils.js';

const SEGMENTS = 40;
// Rings of the land from the middle out (shares of the shore's radius), the last ones under water.
const LAND_RINGS = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.72, 0.8, 0.86, 0.92, 0.97, 1, 1.06, 1.18, 1.32, 1.5];
const COLORS = { grass: 0x67b844, grassHigh: 0x4f9e38, sand: 0xf4e2ae, wetSand: 0xd9c690, rock: 0x8d8a84 };
// The shallows reach this far out (share of the shore's radius), turquoise near the beach.
const SHALLOWS = [[0.96, 0x46dccb, 0.78], [1.15, 0x3bc8c6, 0.55], [1.35, 0x2fb0c4, 0.28], [1.6, 0x2b8fc0, 0]];
const FOAM = [[0.975, 0], [1, 0.95], [1.035, 0.6], [1.07, 0]];

// `islands` from seaside-landmarks.js, `seaLevel` the sea's height. Returns { land, shallows, foam, rocks }
// (geometries; land and rocks coloured per vertex, shallows and foam with an alpha too) and { palms, huts }:
// spots { x, y, z, turn, size } for the palms on the islands and the huts in their shallows.
export function buildBeachIslands(islands, seaLevel) {
  const random = createRandom(2026);
  return {
    land: mergeShapes(islands.map((island) => buildLand(island, seaLevel))),
    shallows: mergeShapes(islands.map((island) => buildRings(island, seaLevel + 0.05, SHALLOWS))),
    foam: mergeShapes(islands.map((island) => buildRings(island, seaLevel + 0.08, FOAM.map(([share, alpha]) => [share, 0xffffff, alpha]), true))),
    rocks: mergeShapes(islands.flatMap((island) => buildRocks(island, seaLevel, random))),
    palms: islands.flatMap((island) => palmSpots(island, seaLevel, random)),
    huts: islands.flatMap((island) => hutSpots(island, seaLevel, random)),
  };
}

// A point `share` of the way out to the island's shore at segment `segment`, at height `y`.
function pointOn(island, share, segment, y) {
  const angle = (segment / SEGMENTS) * 2 * Math.PI;
  const radius = shoreRadius(island, angle) * share;
  return [island.x + Math.cos(angle) * radius, y, island.z + Math.sin(angle) * radius];
}

// A grid of rings by segments round the island, its corners from cornerAt(ring, segment) -> { point, color:
// [r, g, b, a] }, faces up. Returns an indexed geometry with uv laid over the world (a tile per 6 units).
function radialGrid(ringCount, cornerAt, withAlpha) {
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let segment = 0; segment <= SEGMENTS; segment += 1) {
      const { point, color } = cornerAt(ring, segment);
      positions.push(...point);
      colors.push(...(withAlpha ? color : color.slice(0, 3)));
      uvs.push(point[0] / 6, point[2] / 6);
      if (ring > 0 && segment > 0) {
        const here = ring * (SEGMENTS + 1) + segment;
        const inside = here - (SEGMENTS + 1);
        // Counterclockwise seen from above, so the faces point up.
        indices.push(inside - 1, inside, here, inside - 1, here, here - 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, withAlpha ? 4 : 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildLand(island, seaLevel) {
  const color = new THREE.Color();
  return radialGrid(LAND_RINGS.length, (ring, segment) => {
    const share = LAND_RINGS[ring];
    const height = islandHeightAt(island, share);
    if (share > 1) {
      color.setHex(COLORS.wetSand);
    } else if (height < 1.15) {
      color.setHex(COLORS.sand);
    } else {
      color.setHex(height > island.height * 0.6 ? COLORS.grassHigh : COLORS.grass);
    }
    return { point: pointOn(island, share, segment, seaLevel + height), color: [color.r, color.g, color.b, 1] };
  }, false);
}

// Flat rings on the water from `stops` ([share, hex, alpha]): alpha blended between them. The foam's alpha also
// comes and goes round the island (`patchy`), so it reads as breaking surf rather than a painted line.
function buildRings(island, y, stops, patchy = false) {
  const color = new THREE.Color();
  return radialGrid(stops.length, (ring, segment) => {
    const [share, hex, alpha] = stops[ring];
    const angle = (segment / SEGMENTS) * 2 * Math.PI;
    const patch = patchy ? 0.55 + 0.45 * Math.sin(angle * 7 + island.x) * Math.sin(angle * 3 + island.z) : 1;
    color.setHex(hex);
    return { point: pointOn(island, share, segment, y), color: [color.r, color.g, color.b, alpha * patch] };
  }, true);
}

// Grey rocks half sunk round the shore, flat-faceted.
function buildRocks(island, seaLevel, random) {
  return Array.from({ length: Math.round(island.radius / 4) }, () => {
    const angle = random() * 2 * Math.PI;
    const radius = shoreRadius(island, angle) * between(random, 0.95, 1.12);
    const size = between(random, 0.8, 2.2);
    const rock = new THREE.IcosahedronGeometry(size, 0).scale(1, 0.7, between(random, 0.8, 1.3)).rotateY(random() * 6);
    rock.translate(island.x + Math.cos(angle) * radius, seaLevel + size * 0.15, island.z + Math.sin(angle) * radius);
    // Polyhedra come unindexed, so their normals are worked out per face: flat facets, not a smooth ball.
    rock.computeVertexNormals();
    return coloured(rock, COLORS.rock);
  });
}

function palmSpots(island, seaLevel, random) {
  return Array.from({ length: island.palms }, () => {
    const angle = random() * 2 * Math.PI;
    const share = between(random, 0.3, 0.8);
    const radius = shoreRadius(island, angle) * share;
    return {
      x: island.x + Math.cos(angle) * radius,
      y: seaLevel + islandHeightAt(island, share) - 0.2,
      z: island.z + Math.sin(angle) * radius,
      turn: random() * 2 * Math.PI,
      size: between(random, 0.8, 1.15),
    };
  });
}

// Huts stand in the shallows just off the beach, their door (+z) facing the island.
function hutSpots(island, seaLevel, random) {
  return Array.from({ length: island.huts }, (_, index) => {
    const angle = ((index + random() * 0.5) / Math.max(island.huts, 1)) * 2 * Math.PI;
    const radius = shoreRadius(island, angle) * 1.12 + 2;
    // Turning by `turn` about up takes +z to (sin turn, cos turn): toward the middle, (-cos angle, -sin angle).
    return { x: island.x + Math.cos(angle) * radius, y: seaLevel, z: island.z + Math.sin(angle) * radius, turn: Math.atan2(-Math.cos(angle), -Math.sin(angle)), size: 1 };
  });
}
