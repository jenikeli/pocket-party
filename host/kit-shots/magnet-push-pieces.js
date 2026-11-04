// The kit-shots pieces for the magnet's and the push's looks (M8c): `magnet` (a kart with a running magnet, three
// karts ahead in its pull, one behind it out of it) and `push` (a kart with a running push among others close
// by). They draw a made-up race through the race's own drawing (item-pieces.js's itemShowRace and drawItemRace),
// the effect counted down a few frames as the rules would, so the field lines are fieldTargets' own. Used by
// pieces.js.

import { KART_ITEMS } from '../../shared/protocol.js';
import { createKart } from '../games/kart-3d/kart-physics.js';
import { tuning } from '../games/kart-3d/tuning.js';
import { itemShowRace, drawItemRace, roadCamera } from './item-pieces.js';
import { PIECE_S } from './landmark-pieces.js';

const FRAME_SECONDS = 1 / 60;
const FRAMES = 40;
// How long the effect has run when the shot is taken (seconds).
const MAGNET_ELAPSED = 1.8;
const PUSH_ELAPSED = 1.3;

// A race of `karts` ([{ ahead, lateral, effect }]: along the road from PIECE_S and across it), its effects counted
// down a frame at a time, drawn from `cameras` ({ near, above }: [eye, look, fov] each). Each kart has the
// distance the rules' field targets read (fieldTargets in items/field-forces.js).
function fieldPiece(karts, cameras) {
  return {
    road: 'walled',
    addAfterBake(scene, track) {
      const race = itemShowRace(track, {});
      race.karts = karts.map(({ ahead, lateral, effect }) => {
        const kart = createKart(track, PIECE_S + ahead, lateral);
        kart.item = { held: null, rollLeft: 0, effect };
        kart.distance = kart.s;
        return kart;
      });
      const countDown = (shown) => shown.karts.forEach(({ item }) => item.effect && (item.effect.left -= FRAME_SECONDS));
      drawItemRace(scene, track, race, { frames: FRAMES, change: countDown });
    },
    camera: (track, view) => roadCamera(track, ...cameras[view]),
  };
}

// The effect `item` that has run `elapsed` seconds when the shot's last frame is drawn.
const running = (item, elapsed) => ({ item, left: tuning.itemEffectSeconds - elapsed + FRAMES * FRAME_SECONDS });

const MAGNET_CAMERAS = {
  near: [[-1.5, 2.6, -9], [0, 2, 8], 52],
  above: [[0, 15, -13], [0, 0, 8], 50],
};
const PUSH_CAMERAS = {
  near: [[3.2, 1.6, -6.5], [0, 0.6, 0], 50],
  above: [[0, 15, -12], [0, 0, 2], 50],
};

export const MAGNET_PUSH_PIECES = {
  magnet: fieldPiece(
    [
      { ahead: 0, lateral: 0, effect: running(KART_ITEMS.MAGNET, MAGNET_ELAPSED) },
      { ahead: 6, lateral: -3.2, effect: null },
      { ahead: 12, lateral: 3.2, effect: null },
      { ahead: 19, lateral: -0.8, effect: null },
      { ahead: -4, lateral: 4.2, effect: null },
    ],
    MAGNET_CAMERAS,
  ),
  push: fieldPiece(
    [
      { ahead: 0, lateral: 0, effect: running(KART_ITEMS.PUSH, PUSH_ELAPSED) },
      { ahead: 1.5, lateral: -3.4, effect: null },
      { ahead: -2, lateral: 3.4, effect: null },
      { ahead: 6, lateral: 1, effect: null },
    ],
    PUSH_CAMERAS,
  ),
};
