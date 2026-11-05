// The kit-shots pieces for the teleport's and the sticky walls' looks (M8c): sticky-walls (goo along the walls,
// fully down), sticky-kart (a kart held against the right wall, goo on it), sticky-guardrail (the same on a guardrail), teleport-warning (karts flickering
// over their cyan rings) and teleport-hop (karts popping in at new spots, sparkles at both ends). They draw a
// made-up race through the race's own drawing (item-pieces.js's itemShowRace and drawItemRace), counted down a few
// frames as the rules would. Used by pieces.js.

import { tuning } from '../games/kart-3d/tuning.js';
import { pointAt } from '../games/kart-3d/track.js';
import { TELEPORT_AFTER_SECONDS } from '../games/kart-3d/items/teleport.js';
import { buildBarriers } from '../games/kart-3d/kit/barriers.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { BARRIER_STYLES, KIT_PARTS } from '../games/kart-3d/kit/layout-rules.js';
import { itemShowRace, drawItemRace, roadCamera } from './item-pieces.js';
import { PIECE_S } from './landmark-pieces.js';

const FRAME_SECONDS = 1 / 60;
const FRAMES = 15;
// A held kart's middle stands this far (a kart's radius) from the right wall.
const HELD_GAP = 0.9;
const PAIR_LATERALS = [-2.2, 2.2];

// A piece drawn by drawItemRace from the race `makeRace(track)`, `change(race)` run before each frame, seen from
// `cameras` ({ near, above }: [eye, look, fov] each).
function fieldPiece(makeRace, change, cameras, style = BARRIER_STYLES.WALL) {
  return {
    road: 'walled',
    // The barrier on both sides (the plain wall unless `style` says), to see the goo on it.
    build: (kit) => buildBarriers(kitPart(kit, KIT_PARTS.BARRIERS), [{ fromS: 0, toS: 1000, side: 'both', style }]),
    addAfterBake: (scene, track) => drawItemRace(scene, track, makeRace(track), { frames: FRAMES, change }),
    camera: (track, view) => roadCamera(track, ...cameras[view]),
  };
}

const WALL_CAMERAS = {
  near: [[-3, 1.3, -9], [8, 0.5, 5], 52],
  above: [[-2, 7, -12], [4, 0.5, 4], 50],
};
const HELD_CAMERAS = {
  near: [[2, 1.4, -5], [7.5, 0.7, 0], 46],
  above: [[1, 5.5, -7], [7, 0.4, 0], 42],
};
const PAIR_CAMERAS = {
  near: [[0, 1.5, -9], [0, 0.8, 0], 40],
  above: [[0, 6, -10], [0, 0.5, 0], 40],
};

const settledSticky = (race) => (race.items.stickyLeft = tuning.itemEffectSeconds - 2);
// The race's own fields a kart made by createKart lacks, which the teleport's look reads: racing, not falling.
function racing(race) {
  race.karts.forEach((kart) => Object.assign(kart, { finishTime: null, respawnIn: null }));
  return race;
}
const pair = (track) => racing(itemShowRace(track, { karts: PAIR_LATERALS.map((lateral) => ({ lateral })) }));

function heldKart(track) {
  const station = track.stations[pointAt(track, PIECE_S).index];
  const race = itemShowRace(track, { karts: [{ lateral: station.halfWidth + station.shoulderRight - HELD_GAP }] });
  race.karts[0].item.stuckLeft = 0.9;
  return race;
}

// Where each kart stood and where it landed, for the hop's sparkles: behind and ahead along the road from PIECE_S.
function hopsFor(track) {
  const spot = (s, lateral) => pointAt(track, PIECE_S + s, lateral).position;
  return [{ from: spot(-12, -2.2), to: spot(0, -2.2) }, { from: spot(14, 2.2), to: spot(0, 2.2) }];
}

export const TELEPORT_STICKY_PIECES = {
  'sticky-walls': fieldPiece((track) => itemShowRace(track, {}), settledSticky, WALL_CAMERAS),
  'sticky-kart': fieldPiece(heldKart, settledSticky, HELD_CAMERAS),
  'sticky-guardrail': fieldPiece(heldKart, settledSticky, HELD_CAMERAS, BARRIER_STYLES.GUARDRAIL),
  'teleport-warning': fieldPiece(
    (track) => {
      const race = pair(track);
      race.items.teleport = { warningLeft: 0.55 + FRAMES * FRAME_SECONDS, afterLeft: TELEPORT_AFTER_SECONDS, hops: [] };
      return race;
    },
    (race) => (race.items.teleport.warningLeft -= FRAME_SECONDS),
    PAIR_CAMERAS,
  ),
  'teleport-hop': fieldPiece(
    (track) => {
      const race = pair(track);
      race.items.teleport = { warningLeft: 0, afterLeft: 0.4 + FRAMES * FRAME_SECONDS, hops: hopsFor(track) };
      return race;
    },
    (race) => (race.items.teleport.afterLeft -= FRAME_SECONDS),
    PAIR_CAMERAS,
  ),
};
