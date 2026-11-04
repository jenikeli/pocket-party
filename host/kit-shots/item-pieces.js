// The kit-shots pieces for the items' looks (M8): item-box, item-box-row (a row across the road), item-box-broken
// (one box mid-burst, one popping back), and kart-big, kart-small, kart-bouncy (each beside a kart with no effect,
// for size). They draw from a made-up race state through the race's own drawing (items/item-drawing.js,
// kart-models.js), a few frames on so the bursts and wobbles are under way; itemShowRace and drawItemRace are for
// the later items' pieces too. Used by pieces.js.

import * as THREE from 'three';
import { KART_ITEMS } from '../../shared/protocol.js';
import { createKart } from '../games/kart-3d/kart-physics.js';
import { createKartModels } from '../games/kart-3d/kart-models.js';
import { kartPose } from '../games/kart-3d/race-views.js';
import { RACE_PHASES } from '../games/kart-3d/race.js';
import { pointAt } from '../games/kart-3d/track.js';
import { tuning } from '../games/kart-3d/tuning.js';
import { createItemDrawing } from '../games/kart-3d/items/item-drawing.js';
import { kartLookScale, kartRubbery } from '../games/kart-3d/items/kart-effect-looks.js';
import { PIECE_S } from './landmark-pieces.js';

const FRAME_SECONDS = 1 / 60;
// Two karts side by side stand this far either side of the road's middle.
const PAIR_LATERAL = 1.7;
const ROW_LATERALS = [-5.4, -1.8, 1.8, 5.4];
// Which design each shown kart draws (indexes into KART_DESIGNS): a plain one beside the one with the effect.
const DESIGNS = [0, 1];

// A race as the item drawing reads it (queue.md's "State"), racing, standing still at PIECE_S: `karts` is
// [{ lateral, effect }] (effect { item, left } or null), `boxes` [{ s, lateral, returnLeft }].
export function itemShowRace(track, { karts = [], boxes = [] }) {
  return {
    phase: RACE_PHASES.RACING,
    karts: karts.map(({ lateral, effect = null }) => {
      const kart = createKart(track, PIECE_S, lateral);
      // In the air the wheels keep still (kart-models.js rolls them only on the ground).
      kart.grounded = false;
      kart.item = { held: null, rollLeft: 0, effect };
      return kart;
    }),
    items: { allowed: Object.values(KART_ITEMS), random: 1, boxes },
  };
}

// Draws `race` into `scene` as the race's renderer would, `frames` frames one 60th of a second apart, calling
// `change(race, frame)` (if given) before each: an effect starting, a box breaking. Nothing is freed: the page is
// closed after its picture.
export function drawItemRace(scene, track, race, { frames = 1, change } = {}) {
  const models = createKartModels(Math.max(race.karts.length, 1));
  scene.add(...models.karts);
  const items = createItemDrawing(scene);
  for (let frame = 0; frame < frames; frame += 1) {
    change?.(race, frame);
    const poses = race.karts.map((kart) => kartPose(kart, 1));
    race.karts.forEach((kart, index) => {
      models.show(index, kart, poses[index], DESIGNS[index % DESIGNS.length], FRAME_SECONDS, kartLookScale(race, kart), kartRubbery(race, kart));
    });
    if (race.karts.length === 0) {
      models.hide(0);
    }
    items.update(race, track, poses, FRAME_SECONDS);
  }
}

// Counts every running effect down one frame, as the rules would.
function countDown(race) {
  race.karts.forEach(({ item }) => {
    if (item.effect) {
      item.effect.left -= FRAME_SECONDS;
    }
  });
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

// A piece drawn by drawItemRace, seen from `cameras` ({ near, above }: [eye, look, fov] each).
function itemPiece(makeRace, options, cameras) {
  return {
    road: 'walled',
    addAfterBake: (scene, track) => drawItemRace(scene, track, makeRace(track), options),
    camera: (track, view) => roadCamera(track, ...cameras[view]),
  };
}

const BOX_CAMERAS = {
  near: [[1.6, 1.3, -3.6], [0, 1.25, 0], 36],
  above: [[0, 3.2, -8], [0, 1.2, 0], 34],
};
const ROW_CAMERAS = {
  near: [[3, 1.3, -11], [0, 1.2, 0], 40],
  above: [[0, 6, -16], [0, 0.8, 0], 40],
};
const KART_CAMERAS = {
  near: [[3.6, 1.5, 6.2], [0, 0.9, 0], 38],
  above: [[0, 3.4, -8.5], [0, 1, 0], 34],
};

const row = (returnLefts) => ROW_LATERALS.map((lateral, index) => ({ s: PIECE_S, lateral, returnLeft: returnLefts[index] }));

// The second box was driven through just now, the fourth is about to be back.
function breakSecondBox(race, frame) {
  if (frame === 1) {
    race.items.boxes[1].returnLeft = tuning.itemBoxReturnSeconds;
  }
  race.items.boxes.forEach((box) => (box.returnLeft = Math.max(box.returnLeft - (frame > 1 ? FRAME_SECONDS : 0), 0)));
}

// A kart beside a plain one whose effect `item` starts on the second frame and has run `frames` frames since.
function effectPiece(item, frames) {
  return itemPiece(
    (track) => itemShowRace(track, { karts: [{ lateral: -PAIR_LATERAL }, { lateral: PAIR_LATERAL }] }),
    {
      frames,
      change(race, frame) {
        if (frame === 1) {
          race.karts[1].item.effect = { item, left: tuning.itemEffectSeconds };
        }
        countDown(race);
      },
    },
    KART_CAMERAS,
  );
}

export const ITEM_PIECES = {
  'item-box': itemPiece((track) => itemShowRace(track, { boxes: [{ s: PIECE_S, lateral: 0, returnLeft: 0 }] }), { frames: 20 }, BOX_CAMERAS),
  'item-box-row': itemPiece((track) => itemShowRace(track, { boxes: row([0, 0, 0, 0]) }), { frames: 20 }, ROW_CAMERAS),
  'item-box-broken': itemPiece(
    (track) => itemShowRace(track, { boxes: row([0, 0, 0, 0.3]) }),
    { frames: 10, change: breakSecondBox },
    ROW_CAMERAS,
  ),
  'kart-big': effectPiece(KART_ITEMS.BIG, 90),
  'kart-small': effectPiece(KART_ITEMS.SMALL, 24),
  'kart-bouncy': effectPiece(KART_ITEMS.BOUNCY, 70),
};
