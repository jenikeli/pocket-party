// Unit tests for Palm Bay Airport's ground plan (M9, host/games/kart-3d/airport-ground.js): the ground holds the
// whole road but the glide over the bay, meets the road flush where it is at ground level, eases into the land
// beside it, is cut away over the cutting, roofs the tunnel high enough, and its paving, seawalls and beaches lie
// where the land and the sea say. Also builds the ground, its walls and its tunnel with a stand-in kit (the real
// one draws its textures on a canvas) and counts their triangles against the task's budget.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy. Node
// has no import map, so a resolve hook does the same here (as in kart-3d-kit-parts.test.js).
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    return specifier === 'three' ? next(`${threeFolder}three.module.js`, context) : next(specifier, context);
  },
});

// The ground's maps are drawn on a canvas; a stand-in document gives one that holds nothing.
globalThis.document = {
  createElement: () => ({ getContext: () => ({ createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData() {} }) }),
};
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import {
  inSea, inRect, landHeightAt, seaBedAt, groundHeightAt, inCutting, hasRibbon, ribbonStart, ribbonHeight, besideRoad, tunnelSpan,
  PAVED, SEAWALLS, BEACH_EDGES, CUTTING_HOLE, TUNNEL, RUNWAY, BEACH_LEVEL, RIBBON_WIDTH,
} from '../../host/games/kart-3d/airport-ground.js';

const track = buildTrack(PALM_BAY_AIRPORT);
const { stations } = track;
const nextOf = (index) => stations[(index + 1) % stations.length];

test('the ground holds every road station except the glide over the bay and its ramp\'s lip over the seawall', () => {
  const glideStart = stations.find((station) => station.glide).s;
  stations.forEach((station) => {
    if (station.glide || !inSea(station.point.x, station.point.z)) {
      return;
    }
    assert.ok(glideStart - station.s > 0 && glideStart - station.s < 5, `the road at s ${station.s.toFixed(1)} is over the sea`);
  });
  const jumpGap = stations.filter((station) => station.gap && !station.glide);
  assert.ok(jumpGap.length > 0 && jumpGap.every((station) => !inSea(station.point.x, station.point.z)), 'the plain jump lands on land');
});

test('the ground meets the road\'s edges flush wherever the road lies at ground level', () => {
  let checked = 0;
  stations.forEach((station, index) => {
    const atGround = [0, BEACH_LEVEL].some((level) => Math.abs(station.point.y - level) < 0.01);
    if (!atGround || !hasRibbon(station, nextOf(index)) || inCutting(station)) {
      return;
    }
    for (const side of [-1, 1]) {
      const edge = besideRoad(station, side, 0);
      assert.ok(Math.abs(groundHeightAt(edge.x, edge.z) - station.point.y) <= 0.05, `the ground at s ${station.s.toFixed(1)}, side ${side}`);
      assert.equal(ribbonHeight(station, side, 0), station.point.y);
      checked += 1;
    }
  });
  assert.ok(checked > 2000, `checked ${checked} edges`);
});

test('beside the road the ground starts at the road\'s edge and eases into the land', () => {
  stations.forEach((station, index) => {
    if (!hasRibbon(station, nextOf(index))) {
      return;
    }
    for (const side of [-1, 1]) {
      const out = ribbonStart(station) + RIBBON_WIDTH;
      const far = besideRoad(station, side, out);
      assert.ok(Math.abs(ribbonHeight(station, side, out) - groundHeightAt(far.x, far.z)) < 1e-9);
    }
  });
  const ramp = stations.find((station) => station.s > 605 && station.s < 612);
  assert.ok(ribbonHeight(ramp, 1, 0) > ribbonHeight(ramp, 1, RIBBON_WIDTH / 2), 'an embankment falls away from the ramp');
});

test('the cutting runs under the runway, its land cut away, the tunnel\'s roof clearing the road by at least 6', () => {
  const cutting = stations.filter(inCutting);
  assert.ok(cutting.length > 100);
  cutting.forEach((station) => assert.ok(inRect(CUTTING_HOLE, station.point.x, station.point.z), `s ${station.s.toFixed(1)} in the hole`));
  const { fromS, toS } = tunnelSpan(track);
  assert.ok(toS - fromS >= 30, 'at least the runway slab\'s width');
  stations.filter((station) => station.s >= fromS && station.s < toS).forEach((station) => {
    assert.ok(TUNNEL.lintel - station.point.y >= 6, `the roof over s ${station.s.toFixed(1)}`);
  });
  const middle = stations.find((station) => station.s >= (fromS + toS) / 2);
  assert.ok(Math.abs(middle.point.z - RUNWAY.z) < 1.5, 'the runway crosses over the tunnel\'s middle');
});

test('paving lies flat at the airfield\'s level, on land', () => {
  for (const rect of PAVED) {
    for (const [x, z] of [[rect.fromX, rect.fromZ], [rect.toX, rect.fromZ], [rect.fromX, rect.toZ], [rect.toX, rect.toZ]]) {
      assert.ok(Math.abs(landHeightAt(x, z)) < 1e-9, `${rect.kind} at (${x}, ${z})`);
      assert.ok(!inSea((x + rect.fromX + rect.toX) / 3, (z + rect.fromZ + rect.toZ) / 3), `${rect.kind} on land`);
    }
  }
});

test('seawalls stand between the land and the sea, beaches slope into it at the beach\'s level', () => {
  for (const { from, to, seaward } of SEAWALLS) {
    for (const share of [0.1, 0.5, 0.9]) {
      const [x, z] = [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
      assert.ok(!inSea(x - seaward[0], z - seaward[1]) && inSea(x + seaward[0], z + seaward[1]), `seawall at (${x}, ${z})`);
    }
  }
  for (const [from, to] of BEACH_EDGES) {
    const [x, z] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    assert.ok(Math.abs(seaBedAt(x, z) - BEACH_LEVEL) < 1e-9);
    assert.ok(Math.abs(landHeightAt(x, z) - BEACH_LEVEL) < 0.1, `the beach at (${x}, ${z}) meets the sea bed`);
  }
});

test('the ground, its walls and the tunnel stay within 250,000 triangles', async () => {
  const THREE = await import('three');
  const { buildTerrain } = await import('../../host/games/kart-3d/kit/terrain.js');
  const { buildRetainingWalls } = await import('../../host/games/kart-3d/kit/retaining-wall.js');
  const { buildTunnel } = await import('../../host/games/kart-3d/kit/tunnel.js');
  const { buildSeawalls } = await import('../../host/games/kart-3d/kit/seawall.js');
  const world = new THREE.Group();
  const marker = new THREE.Texture();
  const kit = { world, track, keep: (thing) => thing, textures: { grass: marker, sand: marker, concrete: marker, concreteRelief: marker } };
  buildTerrain(kit);
  buildRetainingWalls(kit);
  buildTunnel(kit);
  buildSeawalls(kit, -8.2);
  let triangles = 0;
  world.traverse((object) => {
    if (object.isMesh) {
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    }
  });
  assert.ok(triangles > 50000 && triangles <= 250000, `${triangles} triangles`);
});
