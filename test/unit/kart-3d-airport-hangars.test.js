// Unit tests for Palm Bay Airport's hangars (M9 task H), which run without a browser (their maps need a canvas, so
// only the plan and the shapes are checked): the big hangar sized round the anti-gravity ring clears the road
// and the karts on it, its doors face the road's way in, its infield's things stand inside the ring, and both
// hangars keep to their triangle budgets with no NaN.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The hangars import Three.js by its bare name, which the browser's import map points at the vendored copy; Node
// has no import map, so a resolve hook does the same here.
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') {
      return next(`${threeFolder}three.module.js`, context);
    }
    if (specifier.startsWith('three/addons/')) {
      return next(`${threeFolder}addons/${specifier.slice('three/addons/'.length)}`, context);
    }
    return next(specifier, context);
  },
});

const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { PALM_BAY_AIRPORT } = await import('../../host/games/kart-3d/palm-bay-airport.js');
const { planBigHangar, RIB_DEPTH } = await import('../../host/games/kart-3d/kit/hangar-plan.js');
const { buildFrameGeometry } = await import('../../host/games/kart-3d/kit/hangar-big-frame.js');
const { roofShapes, doorShapes, signShapes, floorDecal } = await import('../../host/games/kart-3d/kit/hangar-big-skin.js');
const { buildFittingsGeometry, buildRingTowers, infieldSpots, lampSpots, LAMP_DROP } = await import('../../host/games/kart-3d/kit/hangar-big-fittings.js');
const { buildHangar, hangarShapes, AIRLINES } = await import('../../host/games/kart-3d/kit/hangar.js');

// The ring's anti-gravity stretch, in the track's own s (docs/queue.md's "Decisions made during the run").
const RING = { fromS: 654, toS: 771 };
const track = buildTrack(PALM_BAY_AIRPORT);
const plan = planBigHangar(track, RING);
// A kart and the wall on the road's edge reach this far off it along its normal; the steel stays this much higher.
const KART_REACH = 2.5;
const CLEARANCE = 1;

function triangles(geometry) {
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}

// Each station's two edges (shoulders included) lifted `lift` along the road's normal, in the hangar's frame.
function ringEdges(lift) {
  return track.stations
    .filter((station) => station.s >= RING.fromS && station.s <= RING.toS)
    .flatMap((station) => [-1, 1].map((side) => {
      const lateral = side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft));
      const { point, right, normal } = station;
      return plan.toLocal({
        x: point.x + right.x * lateral + normal.x * lift,
        y: point.y + right.y * lateral + normal.y * lift,
        z: point.z + right.z * lateral + normal.z * lift,
      });
    }));
}

function insidePolygon([x, z], polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x1, z1] = polygon[index];
    const [x2, z2] = polygon[previous];
    if (z1 > z !== z2 > z && x < ((x2 - x1) * (z - z1)) / (z2 - z1) + x1) {
      inside = !inside;
    }
  }
  return inside;
}

test('the ring stands inside the hangar, between its columns and its doors', () => {
  for (const edge of [...ringEdges(0), ...ringEdges(KART_REACH)]) {
    assert.ok(Math.abs(edge.z) < plan.width / 2 - 3, `an edge at z ${edge.z.toFixed(1)} reaches the columns`);
    assert.ok(Math.abs(edge.x) < plan.length / 2, `an edge at x ${edge.x.toFixed(1)} is past the doors`);
  }
});

test('the ribs and the lamps under them clear the karts on the banked ring', () => {
  const lamps = lampSpots(plan);
  for (const edge of ringEdges(KART_REACH)) {
    const ribUnderside = plan.archY(edge.z) - RIB_DEPTH;
    assert.ok(edge.y + CLEARANCE < ribUnderside, `a kart at ${edge.y.toFixed(1)} meets the ribs at ${ribUnderside.toFixed(1)}`);
    for (const lamp of lamps.filter(({ x, z }) => Math.hypot(x - edge.x, z - edge.z) < 2)) {
      const lampBottom = plan.archY(lamp.z) - RIB_DEPTH - LAMP_DROP;
      assert.ok(edge.y + CLEARANCE < lampBottom, `a kart at ${edge.y.toFixed(1)} meets a lamp at ${lampBottom.toFixed(1)}`);
    }
  }
});

test('the doors face the road coming in: the road before the ring is out past the front', () => {
  const before = track.stations.find((station) => station.s >= RING.fromS - 20);
  const after = track.stations.find((station) => station.s >= RING.toS + 20);
  assert.ok(plan.toLocal(before.point).x > plan.length / 2, 'the way in is not out the front');
  assert.ok(plan.toLocal(after.point).x > plan.length / 2, 'the way out is not out the front');
  const back = plan.toWorld({ x: 0, y: 0, z: 0 });
  assert.ok(Math.abs(back.x - plan.spot.x) < 1e-9 && Math.abs(back.z - plan.spot.z) < 1e-9, 'toWorld and spot disagree');
});

test('the tool chests and the stair stand inside the ring, clear of its edge', () => {
  const { chests, stair } = infieldSpots(plan);
  for (const { x, z } of [...chests, stair]) {
    assert.ok(insidePolygon([x, z], plan.infield), `(${x.toFixed(1)}, ${z.toFixed(1)}) is outside the infield`);
    const nearest = Math.min(...plan.infield.map(([edgeX, edgeZ]) => Math.hypot(edgeX - x, edgeZ - z)));
    assert.ok(nearest > 4, `(${x.toFixed(1)}, ${z.toFixed(1)}) is ${nearest.toFixed(1)} from the ring`);
  }
});

test('the big hangar fits its budget of 100,000 triangles, with no NaN', () => {
  const roof = roofShapes(plan);
  const signs = signShapes(plan);
  const geometries = [
    buildFrameGeometry(plan), buildFittingsGeometry(plan), buildRingTowers(plan), ...roof.sheet, ...roof.glass,
    ...doorShapes(plan), signs.board, signs.face, floorDecal(plan).geometry,
  ];
  const total = geometries.reduce((sum, geometry) => sum + triangles(geometry), 0);
  assert.ok(total < 100000, `${total} triangles`);
  for (const geometry of geometries) {
    assert.ok(geometry.attributes.position.array.every(Number.isFinite), 'a NaN in a position');
  }
});

test('small hangars of every size fit their budget of 25,000 triangles, door and sign at the front', () => {
  for (const [width, depth] of [[16, 14], [24, 20], [32, 28]]) {
    const shapes = hangarShapes(width, depth, AIRLINES['Coral Wings']);
    const all = [...shapes.sheet, ...shapes.painted, shapes.sign];
    const total = all.reduce((sum, geometry) => sum + triangles(geometry), 0);
    assert.ok(total < 25000, `${width} by ${depth}: ${total} triangles`);
    assert.ok(all.every((geometry) => geometry.attributes.position.array.every(Number.isFinite)), 'a NaN in a position');
    shapes.sign.computeBoundingBox();
    assert.ok(shapes.sign.boundingBox.min.x > depth / 2, 'the sign is not on the front');
  }
});

test('a small hangar of an unknown airline is refused', () => {
  assert.throws(() => buildHangar({}, { width: 20, depth: 16, airline: 'Mystery Air' }), /Unknown airline/);
});
