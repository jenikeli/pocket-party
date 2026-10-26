// Checks that a kit-dressed course's layout stands where it can (M7d2, shared since M7d3): its decks run outside
// walls on level road and clear of the road, its props and grandstand stand on a deck, clear of the barrier and
// not hanging off and clear of the turn boards, and its bunting hangs between two walls. Plain maths on the track's stations, used by the
// unit tests of the Test track (kart-3d-kit.test.js) and Seaside Skyway (kart-3d-seaside.test.js).

import assert from 'node:assert/strict';
import { PROP_REACH, sideSign, deckDepthAt } from '../../host/games/kart-3d/kit/layout-rules.js';
import { stationIndexAt, wrapDistance } from '../../host/games/kart-3d/track.js';
import { dot, subtract } from '../../host/games/kart-3d/vector.js';

// How far the thickest barrier (the padded wall and its fence) reaches out from the edge of the ground.
export const BARRIER_REACH = 0.7;
// The grandstand's depth, from its front to its back wall.
const GRANDSTAND_DEPTH = 7.2;
// Where a turn board's middle stands, out from the edge of the ground, and half its width (kit/turn-boards.js):
// whichever way it is turned, the board stays within that far of its middle.
const BOARD_OUT = 1.5;
const BOARD_HALF_WIDTH = 1.1;

export const stationAt = (track, s) => track.stations[stationIndexAt(track, wrapDistance(track, s))];

// The stations a stretch from fromS to toS covers.
export function stationsBetween(track, fromS, toS) {
  return track.stations.filter((station) => station.s >= fromS && station.s < toS);
}

export function checkDecks(track, platforms) {
  for (const platform of platforms) {
    const side = sideSign(platform.side);
    for (const station of stationsBetween(track, platform.fromS, platform.toS)) {
      assert.ok(side > 0 ? station.wallRight : station.wallLeft, `a wall beside the deck at ${station.s.toFixed(0)}`);
      assert.ok(!station.gap && !station.antiGravity && station.normal.y > 0.95, `the deck at ${station.s.toFixed(0)} is on level, plain road`);
      for (const out of [BARRIER_REACH, platform.depth / 2, platform.depth]) {
        const point = deckPoint(station, side, out);
        assert.ok(!overRoad(track, point), `the deck at ${station.s.toFixed(0)}, ${out} out, is clear of the road`);
      }
    }
  }
}

// `props` are the layout's spots, `grandstand` its spot (or null). A prop must fit the deck's depth all along
// its reach, where a deck tapers too.
export function checkProps(track, props, platforms, grandstand) {
  const spots = grandstand ? [...props, { ...grandstand, piece: 'grandstand' }] : props;
  for (const spot of spots) {
    const reach = spot.piece === 'grandstand' ? 0 : PROP_REACH[spot.piece];
    assert.ok(reach !== undefined, `the ${spot.piece} at ${spot.s} is a prop the kit knows`);
    const along = spot.piece === 'grandstand' ? spot.length / 2 : reach;
    const deep = spot.piece === 'grandstand' ? GRANDSTAND_DEPTH : reach;
    const deck = platforms.find((platform) => platform.side === spot.side && spot.s - along >= platform.fromS && spot.s + along <= platform.toS);
    assert.ok(deck, `the ${spot.piece} at ${spot.s} is on a deck`);
    assert.ok(spot.out - reach >= BARRIER_REACH, `the ${spot.piece} at ${spot.s} is clear of the barrier`);
    const depth = Math.min(...[spot.s - along, spot.s, spot.s + along].map((s) => deckDepthAt(deck, s, platforms, track.length)));
    assert.ok(spot.out + deep <= depth, `the ${spot.piece} at ${spot.s} does not hang off the deck (${depth.toFixed(1)} deep there)`);
  }
}

// `boards` are turnBoardSpots's; no prop on a board's side may reach within its half width of the board's middle.
export function checkTurnBoards(track, boards, props) {
  for (const board of boards) {
    const s = track.stations[board.index].s;
    for (const spot of props.filter((prop) => sideSign(prop.side) === board.side)) {
      const along = Math.abs(wrapDistance(track, spot.s - s + track.length / 2) - track.length / 2);
      const apart = Math.hypot(along, spot.out - BOARD_OUT);
      assert.ok(apart >= PROP_REACH[spot.piece] + BOARD_HALF_WIDTH, `the ${spot.piece} at ${spot.s} is clear of the turn board at ${s.toFixed(0)}`);
    }
  }
}

export function checkBunting(track, distances) {
  for (const s of distances) {
    const station = stationAt(track, s);
    assert.ok(station.wallLeft && station.wallRight && !station.antiGravity, `the bunting at ${s} hangs between two walls`);
  }
}

// A point on the deck `out` beyond the edge of the ground at `station`, on `side`.
function deckPoint(station, side, out) {
  const lateral = side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft) + out);
  return { x: station.point.x + station.right.x * lateral, y: station.point.y + station.right.y * lateral, z: station.point.z + station.right.z * lateral };
}

// Whether `point` lies on (or within a barrier of) any part of the road, near its height.
function overRoad(track, point) {
  return track.stations.some((station) => {
    if (station.gap) {
      return false;
    }
    const offset = subtract(point, station.point);
    const along = dot(offset, station.tangent);
    const lateral = dot(offset, station.right);
    const edge = station.halfWidth + (lateral < 0 ? station.shoulderLeft : station.shoulderRight);
    return Math.abs(along) < station.segmentLength && Math.abs(lateral) < edge && Math.abs(dot(offset, station.normal)) < 3;
  });
}

// Decks that meet end to end on the same side have the same depth, so the deck runs on without a step.
export function checkDeckJoins(track, platforms) {
  for (const deck of platforms) {
    for (const other of platforms) {
      const gap = (((other.fromS - deck.toS) % track.length) + track.length) % track.length;
      if (other !== deck && other.side === deck.side && (gap < 1 || gap > track.length - 1)) {
        assert.equal(other.depth, deck.depth, `the decks joining at ${other.fromS} are as deep as each other`);
      }
    }
  }
}
