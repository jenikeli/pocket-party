// The kit's barriers (M7d2): what stands on each of the kart rules' walls, in the style the course's layout
// chooses for that stretch (kit/layout-rules.js). Each style is its own piece with an add(segment, side) for
// every walled station segment and meshes() at the end, so a whole style draws in a few draw calls however much
// of the course it covers. Every barrier stands on a concrete ledge that juts out from the road's edge under it,
// as thick as the road, so none of it hangs in the air past the road (the M7d2 device run saw rails standing on
// nothing), and widens under the turn boards (ledgeWidthAt in kit/layout-rules.js); where a barrier starts, stops
// or changes style, each style ends itself cleanly (its end(): a wall's cross-section closed, a rail ending on a
// post, a row of blocks on a whole block). Since M7d4 the ledge has a coping with a rounded nose over a darker,
// weathered face, and the concrete its relief. Drawing only: the walls themselves are the rules'
// (kart-walls.js). Used by the courses' dressings.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, roundProfile } from './extrude.js';
import { withShadows, edgeLateral } from './frames.js';
import { addScaled } from '../vector.js';
import { ROAD_THICKNESS } from './road.js';
import { BARRIER_STYLES, barrierStyleAt, turnBoardSpots, ledgeWidthAt } from './layout-rules.js';
import { createPlainWall, createAntiGravityWall } from './plain-wall.js';
import { createSponsorWall } from './sponsor-wall.js';
import { createGuardrail } from './guardrail.js';
import { createStripedRail } from './striped-rail.js';
import { createRailFence } from './rail-fence.js';
import { createBlockCurbs } from './block-curbs.js';
import { createPromenadeRail } from './promenade-rail.js';
import { createApronRail } from './apron-rail.js';
import { createPaddedBarrier } from './padded-barrier.js';

const STYLE_BUILDERS = {
  [BARRIER_STYLES.WALL]: createPlainWall,
  [BARRIER_STYLES.ANTI_GRAVITY_WALL]: createAntiGravityWall,
  [BARRIER_STYLES.SPONSOR_WALL]: createSponsorWall,
  [BARRIER_STYLES.GUARDRAIL]: createGuardrail,
  [BARRIER_STYLES.STRIPED_RAIL]: createStripedRail,
  [BARRIER_STYLES.RAIL_FENCE]: createRailFence,
  [BARRIER_STYLES.BLOCK_CURBS]: createBlockCurbs,
  [BARRIER_STYLES.PROMENADE_RAIL]: createPromenadeRail,
  [BARRIER_STYLES.APRON_RAIL]: createApronRail,
  [BARRIER_STYLES.PADDED_BARRIER]: createPaddedBarrier,
};

// The ledge is this wide away from the turn boards: wide enough for the widest barrier (the plain wall's foot
// reaches 0.75).
const LEDGE_WIDTH = 0.95;
const LEDGE_TOP = 0.1;
const LEDGE_COLOR = 0xd2ccc2;
// The ledge's face below its coping is darker, weathered where rain runs down it (M7d4, as on the reference seaside course's
// seawall).
const LEDGE_FACE_COLOR = 0xa49e94;
const COPING_DEPTH = 0.16;

// The ledge's cross-section `width` wide, [outward, lift] (see kit/extrude.js), in two parts: the coping, a
// kerb a little above the road on its inner face with a rounded nose along its outer edge (M7d4), and the
// face below it, down to the road's underside.
function copingProfile(width) {
  return [[0, 0], ...roundProfile([[0, LEDGE_TOP], [width, LEDGE_TOP], [width, -COPING_DEPTH]], 0.07, 2)];
}

function ledgeFaceProfile(width) {
  return [[width, -COPING_DEPTH], [width, -ROAD_THICKNESS], [0, -ROAD_THICKNESS]];
}

// Adds every barrier to the world; `kit` is what kit/kit.js makes for the course, `runs` the course's choice of
// styles (see barrierStyleAt).
export function buildBarriers(kit, runs) {
  const { world, track, keep, textures } = kit;
  const styles = new Map();
  const ledge = createStripBuilder();
  const boards = turnBoardSpots(track, runs);
  const ledgeWidth = (index, side) => ledgeWidthAt(boards, index, side, track.stations.length, LEDGE_WIDTH);
  // The style on `side` from `station` on, or null where there is no wall.
  const styleAt = (station, side) => (hasWall(station, side) ? barrierStyleAt(runs, station, side) : null);
  const styleNamed = (name) => {
    if (!styles.has(name)) {
      styles.set(name, STYLE_BUILDERS[name](kit));
    }
    return styles.get(name);
  };
  track.stations.forEach((station, index) => {
    const segment = { station, next: track.stations[(index + 1) % track.stations.length], index };
    const before = track.stations[(index - 1 + track.stations.length) % track.stations.length];
    for (const side of [-1, 1]) {
      // Where a barrier stops or turns into another style here, the old one ends and the new one starts.
      const [ending, starting] = [styleAt(before, side), styleAt(station, side)];
      if (ending !== starting) {
        if (ending) {
          styleNamed(ending).end(station, index, side, 1);
        }
        if (starting) {
          styleNamed(starting).end(station, index, side, -1);
        }
      }
      if (!hasWall(station, side)) {
        continue;
      }
      const nextIndex = (index + 1) % track.stations.length;
      const [width, nextWidth] = [ledgeWidth(index, side), ledgeWidth(nextIndex, side)];
      extrudeSegment(ledge, segment, side, copingProfile(width), LEDGE_COLOR, { endProfile: copingProfile(nextWidth), smooth: true });
      extrudeSegment(ledge, segment, side, ledgeFaceProfile(width), LEDGE_FACE_COLOR, { endProfile: ledgeFaceProfile(nextWidth) });
      if (!hasWall(before, side)) {
        addLedgeEnd(ledge, station, side, -1, ledgeWidth(index, side));
      }
      if (!hasWall(segment.next, side)) {
        addLedgeEnd(ledge, segment.next, side, 1, ledgeWidth(nextIndex, side));
      }
      styleNamed(barrierStyleAt(runs, station, side)).add(segment, side);
    }
  });
  for (const style of styles.values()) {
    world.add(...style.meshes());
  }
  const concrete = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.85 }));
  world.add(withShadows(new THREE.Mesh(keep(ledge.build()), concrete)));
}

function hasWall(station, side) {
  return !station.gap && (side > 0 ? station.wallRight : station.wallLeft);
}

// The ledge's end face at `station`, `width` wide, where a wall starts (`facing` -1, facing back along the road)
// or ends (1).
function addLedgeEnd(builder, station, side, facing, width) {
  const normal = { x: station.tangent.x * facing, y: station.tangent.y * facing, z: station.tangent.z * facing };
  const top = LEDGE_TOP;
  const corner = (out, lift) => ({
    point: addScaled(addScaled(station.point, station.right, edgeLateral(station, side) + side * out), station.normal, lift),
    normal,
    uv: [out / 8, lift / 8],
  });
  const [near, far] = side * facing > 0 ? [0, width] : [width, 0];
  builder.quad([corner(near, top), corner(far, top), corner(near, -ROAD_THICKNESS), corner(far, -ROAD_THICKNESS)], LEDGE_COLOR);
}
