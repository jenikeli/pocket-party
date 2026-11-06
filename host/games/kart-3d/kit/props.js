// The kit's props on the decks beside the road (M7d2): cones, tyre stacks, warp pipes, giant mushrooms, the MKTV
// van, sponsor stands, street lamps and floodlight towers, and since M7d3 the seaside's palms, parasols,
// loungers, surfboards, lifebuoys and barrels, round trees, hedges and planters. Each spot in a course's layout names a prop and where
// it stands; every prop of one kind draws as one instanced mesh per part (sponsor stands, which each show their
// own brand, are merged into one shape instead). Since M7d4c3 each prop's builder (in its own file) takes the kit
// and returns its parts, [{ geometry, material }], so this file only places them. Used by the courses' dressings.

import * as THREE from 'three';
import { stationIndexAt } from '../track.js';
import { frameAt, facingRoad, edgeLateral, placeInstances } from './frames.js';
import { sideSign } from './layout-rules.js';
import { buildCone } from './cone.js';
import { buildTyreStack } from './tyre-stack.js';
import { buildWarpPipe } from './warp-pipe.js';
import { buildGiantMushroom } from './giant-mushroom.js';
import { buildMktvVan } from './mktv-van.js';
import { buildSponsorStands } from './sponsor-stand.js';
import { buildLanternLamp, buildTripleLamp } from './street-lamps.js';
import { buildFloodlight } from './floodlight.js';
import { buildPalmParts } from './palm.js';
import { buildParasol, buildLounger, buildSurfboards, buildLifebuoyPost, buildBarrels } from './beach-props.js';
import { buildRoundTree } from './round-tree.js';
import { buildHedge } from './hedge.js';
import { buildPlanter } from './planter.js';
import { buildStairTruck, buildBeltLoader, buildFuelTruck } from './airport-trucks.js';
import { buildRunwayLight } from './airfield-runway-light.js';
import { buildTaxiwaySign } from './airfield-taxiway-sign.js';
import { buildWindsock } from './airfield-windsock.js';
import { buildAirfieldFloodlight } from './airfield-floodlight.js';
import { buildBaggageTrain, buildUldDolly, buildFollowMeCar } from './airport-carts.js';

// Each instanced prop's builder, by its name in PROP_REACH (kit/layout-rules.js). Only the props a course uses are
// built. The sponsor stand is not here: its stands are merged (kit/sponsor-stand.js).
export const PROP_BUILDERS = {
  cone: buildCone,
  'tyre-stack': buildTyreStack,
  'warp-pipe': buildWarpPipe,
  'giant-mushroom': buildGiantMushroom,
  'mktv-van': buildMktvVan,
  'lantern-lamp': buildLanternLamp,
  'triple-lamp': buildTripleLamp,
  floodlight: buildFloodlight,
  palm: buildPalmParts,
  parasol: buildParasol,
  lounger: buildLounger,
  surfboards: buildSurfboards,
  'lifebuoy-post': buildLifebuoyPost,
  barrels: buildBarrels,
  'round-tree': buildRoundTree,
  hedge: buildHedge,
  planter: buildPlanter,
  'baggage-train': buildBaggageTrain,
  'uld-dolly': buildUldDolly,
  'stair-truck': buildStairTruck,
  'belt-loader': buildBeltLoader,
  'fuel-truck': buildFuelTruck,
  'follow-me-car': buildFollowMeCar,
  'runway-light': buildRunwayLight,
  'taxiway-sign': buildTaxiwaySign,
  windsock: buildWindsock,
  'airport-floodlight': buildAirfieldFloodlight,
};

// Adds the props; `kit` is the course's (kit/kit.js). `spots` lists
// [{ piece, s, side: 'left' or 'right', out, turn }]: the prop's name, where along the lap and on which side, how
// far out from the edge of the ground (on the deck there), and how far it is turned (degrees, about up) from
// facing the road.
export function buildProps(kit, spots) {
  const { world, track } = kit;
  for (const [piece, buildPiece] of Object.entries(PROP_BUILDERS)) {
    const frames = spots.filter((spot) => spot.piece === piece).map((spot) => spotFrame(track, spot));
    if (frames.length > 0) {
      for (const { geometry, material } of buildPiece(kit)) {
        world.add(placeInstances(geometry, material, frames));
      }
    }
  }
  const stands = spots.filter((spot) => spot.piece === 'sponsor-stand');
  if (stands.length > 0) {
    world.add(...buildSponsorStands(kit, stands.map((spot) => spotFrame(track, spot))));
  }
}

// Where a spot's prop stands: a frame on the deck, facing the road, turned by spot.turn.
export function spotFrame(track, { s, side, out, turn = 0 }) {
  const station = track.stations[stationIndexAt(track, ((s % track.length) + track.length) % track.length)];
  const sign = sideSign(side);
  const frame = frameAt(station, edgeLateral(station, sign) + sign * out, 0, facingRoad(station, sign));
  return frame.multiply(new THREE.Matrix4().makeRotationY((turn * Math.PI) / 180));
}
