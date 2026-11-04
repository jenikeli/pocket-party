// The kit-shots pieces for the road objects' looks (M8b): sandcastle (standing, beside a kart for size),
// sandcastle-crumbling (one slumping, one sunk to a pile), kicker (standing, beside a kart) and kicker-flipping
// (one flipping up, one folding down). They draw a made-up race's race.items.objects through the race's own
// drawing (item-pieces.js's itemShowRace and drawItemRace), counted down a few frames as the rules would. Used by
// pieces.js.

import * as THREE from 'three';
import { KART_ITEMS } from '../../shared/protocol.js';
import { pointAt } from '../games/kart-3d/track.js';
import { tuning } from '../games/kart-3d/tuning.js';
import { itemShowRace, drawItemRace } from './item-pieces.js';
import { PIECE_S } from './landmark-pieces.js';

const FRAME_SECONDS = 1 / 60;
const FRAMES = 15;
// Where the shown kart stands across the road, and the kicker's middle along it from the kart.
const KART_LATERAL = -4.2;
const KICKER_AHEAD = 4;

// A piece of `objects` ([{ item, s, lateral, left }], `left` as on the last of the frames drawn), a kart beside
// them if `withKart`, seen from `cameras` ({ near, above }: [eye, look, fov] each).
function objectPiece(objects, withKart, cameras) {
  return {
    road: 'walled',
    addAfterBake(scene, track) {
      const race = itemShowRace(track, { karts: withKart ? [{ lateral: KART_LATERAL }] : [] });
      race.items.objects = objects.map((object, id) => ({ ...object, id, left: object.left + FRAMES * FRAME_SECONDS }));
      const countDown = (shown) => shown.items.objects.forEach((object) => (object.left -= FRAME_SECONDS));
      drawItemRace(scene, track, race, { frames: FRAMES, change: countDown });
    },
    camera: (track, view) => roadCamera(track, ...cameras[view]),
  };
}

// A camera standing in the road's axes at PIECE_S: `eye` and `look` are [across (right), up, along].
function roadCamera(track, eye, look, fov) {
  const { position, forward, right, normal } = pointAt(track, PIECE_S);
  const toWorld = ([across, up, along]) => new THREE.Vector3(
    position.x + right.x * across + normal.x * up + forward.x * along,
    position.y + right.y * across + normal.y * up + forward.y * along,
    position.z + right.z * across + normal.z * up + forward.z * along,
  );
  return { position: toWorld(eye), target: toWorld(look), fov };
}

const settled = () => tuning.itemEffectSeconds - 2;
const castle = (lateral, left) => ({ item: KART_ITEMS.BLOCKER, s: PIECE_S, lateral, left });
const kicker = (lateral, left) => ({ item: KART_ITEMS.RAMP, s: PIECE_S + KICKER_AHEAD, lateral, left });

const CASTLE_CAMERAS = {
  near: [[-1.5, 1.2, -6.5], [0.2, 0.8, 0], 38],
  above: [[-2, 5, -10], [0, 0.5, 0], 36],
};
const KICKER_CAMERAS = {
  near: [[-3, 1.3, -6], [0.5, 0.4, KICKER_AHEAD], 44],
  above: [[-11, 4.5, -2], [0.5, 0.3, KICKER_AHEAD], 40],
};

export const ROAD_OBJECT_PIECES = {
  sandcastle: objectPiece([castle(1.6, settled())], true, CASTLE_CAMERAS),
  'sandcastle-crumbling': objectPiece([castle(-2.2, -0.18), castle(2.2, -0.4)], false, CASTLE_CAMERAS),
  kicker: objectPiece([kicker(1.5, settled())], true, KICKER_CAMERAS),
  'kicker-flipping': objectPiece([kicker(-3.6, tuning.itemEffectSeconds - 0.14), kicker(3.6, -0.15)], false, KICKER_CAMERAS),
};
