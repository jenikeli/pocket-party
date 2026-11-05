// The kit-shots pieces for the road objects' looks (M8b): sandcastle (standing, beside a kart for size) and
// sandcastle-crumbling (one slumping, one sunk to a pile); and the jump's launch puff (M8d, a kart just lifted). They draw a made-up race's race.items.objects through the race's own
// drawing (item-pieces.js's itemShowRace and drawItemRace), counted down a few frames as the rules would. Used by
// pieces.js.

import { KART_ITEMS } from '../../shared/protocol.js';
import { tuning } from '../games/kart-3d/tuning.js';
import { itemShowRace, drawItemRace, roadCamera } from './item-pieces.js';
import { PIECE_S } from './landmark-pieces.js';

const FRAME_SECONDS = 1 / 60;
const FRAMES = 15;
// The jump piece: the kart is lifted this high, the launch happening on this frame of FRAMES.
const JUMP_LIFT = 0.6;
const JUMP_FRAME = 4;
// Where the shown kart stands across the road.
const KART_LATERAL = -4.2;

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

const settled = () => tuning.itemEffectSeconds - 2;
const castle = (lateral, left) => ({ item: KART_ITEMS.BLOCKER, s: PIECE_S, lateral, left });

const CASTLE_CAMERAS = {
  near: [[-1.5, 1.2, -6.5], [0.2, 0.8, 0], 38],
  above: [[-2, 5, -10], [0, 0.5, 0], 36],
};

// A kart just launched by the jump: the launch (item.jumpedAt) on frame JUMP_FRAME, the kart rising from then.
function jumpPiece(cameras) {
  return {
    road: 'walled',
    addAfterBake(scene, track) {
      const race = itemShowRace(track, { karts: [{ lateral: 0 }] });
      const [kart] = race.karts;
      const base = { ...kart.position };
      const launch = (shown, frame) => {
        if (frame === JUMP_FRAME) {
          kart.item.jumpedAt = frame;
        }
        const lift = frame >= JUMP_FRAME ? JUMP_LIFT * (frame - JUMP_FRAME) / (FRAMES - JUMP_FRAME) : 0;
        kart.position = { x: base.x + kart.up.x * lift, y: base.y + kart.up.y * lift, z: base.z + kart.up.z * lift };
        kart.previousPosition = kart.position;
      };
      drawItemRace(scene, track, race, { frames: FRAMES, change: launch });
    },
    camera: (track, view) => roadCamera(track, ...cameras[view]),
  };
}

const JUMP_CAMERAS = {
  near: [[-2.8, 0.9, -4.2], [0, 0.5, 0], 44],
  above: [[-2, 4.5, -6], [0, 0.3, 0], 40],
};

export const ROAD_OBJECT_PIECES = {
  jump: jumpPiece(JUMP_CAMERAS),
  sandcastle: objectPiece([castle(1.6, settled())], true, CASTLE_CAMERAS),
  'sandcastle-crumbling': objectPiece([castle(-2.2, -0.18), castle(2.2, -0.4)], false, CASTLE_CAMERAS),
};
