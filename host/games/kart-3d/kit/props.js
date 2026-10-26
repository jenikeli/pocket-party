// The kit's props on the decks beside the road (M7d2): cones, tyre stacks, warp pipes, giant mushrooms, the MKTV
// van, sponsor stands, street lamps and floodlight towers, and since M7d3 the seaside's palms, parasols,
// loungers, surfboards, lifebuoys and barrels, round trees, hedges and planters. Each spot in a course's layout names a prop and where
// it stands; every prop of one kind draws as one instanced mesh per part (sponsor stands, which each show their
// own brand, are merged into one shape instead). Used by the courses' dressings.

import * as THREE from 'three';
import { stationIndexAt } from '../track.js';
import { frameAt, facingRoad, edgeLateral, placeInstances, withShadows } from './frames.js';
import { sideSign } from './layout-rules.js';
import { buildCone, buildTyreStack, buildWarpPipe, buildGiantMushroom } from './small-props.js';
import { buildMktvVan } from './mktv-van.js';
import { buildSponsorStand } from './sponsor-stand.js';
import { buildLanternLamp, buildTripleLamp } from './street-lamps.js';
import { buildFloodlight } from './floodlight.js';
import { buildPalm } from './palm.js';
import { buildParasol, buildLounger, buildSurfboards, buildLifebuoyPost, buildBarrels } from './beach-props.js';
import { buildRoundTree, buildHedge, buildPlanter } from './garden-props.js';
import { mergeShapes } from '../shape-utils.js';

// Lamps by day: warm glass lit by the sun, not glowing (lit lamps in daylight looked odd on the M7c device run).
const GLASS = { color: 0xfff4dc, roughness: 0.15, metalness: 0.1 };

// Each prop's parts: [{ geometry, material }], by its name in PROP_REACH (kit/layout-rules.js).
function propParts(materials) {
  const { plastic, painted, iron, glass, sponsors, fronds } = materials;
  const van = buildMktvVan();
  const lantern = buildLanternLamp();
  const triple = buildTripleLamp();
  const floodlight = buildFloodlight();
  const palm = buildPalm();
  return {
    cone: [{ geometry: buildCone(), material: plastic }],
    'tyre-stack': [{ geometry: buildTyreStack(), material: painted }],
    'warp-pipe': [{ geometry: buildWarpPipe(), material: plastic }],
    'giant-mushroom': [{ geometry: buildGiantMushroom(), material: plastic }],
    'mktv-van': [{ geometry: van.body, material: painted }, { geometry: van.boards, material: sponsors }],
    'lantern-lamp': [{ geometry: lantern.iron, material: iron }, { geometry: lantern.glass, material: glass }],
    'triple-lamp': [{ geometry: triple.iron, material: iron }, { geometry: triple.glass, material: glass }],
    floodlight: [{ geometry: floodlight.steel, material: iron }, { geometry: floodlight.glass, material: glass }],
    palm: [{ geometry: palm.trunk, material: painted }, { geometry: palm.fronds, material: fronds }],
    parasol: [{ geometry: buildParasol(), material: painted }],
    lounger: [{ geometry: buildLounger(), material: painted }],
    surfboards: [{ geometry: buildSurfboards(), material: plastic }],
    'lifebuoy-post': [{ geometry: buildLifebuoyPost(), material: painted }],
    barrels: [{ geometry: buildBarrels(), material: painted }],
    'round-tree': [{ geometry: buildRoundTree(), material: painted }],
    hedge: [{ geometry: buildHedge(), material: painted }],
    planter: [{ geometry: buildPlanter(), material: painted }],
  };
}

// Adds the props; `kit` is the course's { world, track, keep, sponsors, fronds } (kit/kit.js). `spots` lists
// [{ piece, s, side: 'left' or 'right', out, turn }]: the prop's name, where along the lap and on which side, how
// far out from the edge of the ground (on the deck there), and how far it is turned (degrees, about up) from
// facing the road.
export function buildProps(kit, spots) {
  const { world, keep } = kit;
  const materials = {
    plastic: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })),
    painted: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })),
    iron: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 })),
    glass: keep(new THREE.MeshStandardMaterial(GLASS)),
    sponsors: kit.sponsors,
    fronds: kit.fronds,
  };
  const parts = propParts(materials);
  for (const [piece, pieceParts] of Object.entries(parts)) {
    const frames = spots.filter((spot) => spot.piece === piece).map((spot) => spotFrame(kit.track, spot));
    for (const { geometry, material } of pieceParts) {
      keep(geometry);
      if (frames.length > 0) {
        world.add(placeInstances(geometry, material, frames));
      }
    }
  }
  const stands = spots.filter((spot) => spot.piece === 'sponsor-stand');
  if (stands.length > 0) {
    world.add(...buildStands(kit, stands, materials));
  }
}

// Where a spot's prop stands: a frame on the deck, facing the road, turned by spot.turn.
export function spotFrame(track, { s, side, out, turn = 0 }) {
  const station = track.stations[stationIndexAt(track, ((s % track.length) + track.length) % track.length)];
  const sign = sideSign(side);
  const frame = frameAt(station, edgeLateral(station, sign) + sign * out, 0, facingRoad(station, sign));
  return frame.multiply(new THREE.Matrix4().makeRotationY((turn * Math.PI) / 180));
}

// Every sponsor stand merged into two shapes (legs and boards), each stand showing its own brand.
function buildStands({ track, keep }, stands, { painted, sponsors }) {
  const built = stands.map((spot, index) => {
    const stand = buildSponsorStand(index * 5 + 1);
    const frame = spotFrame(track, spot);
    return { frame: stand.frame.applyMatrix4(frame), boards: stand.boards.applyMatrix4(frame) };
  });
  return [
    withShadows(new THREE.Mesh(keep(mergeShapes(built.map((stand) => stand.frame))), painted)),
    withShadows(new THREE.Mesh(keep(mergeShapes(built.map((stand) => stand.boards))), sponsors)),
  ];
}
