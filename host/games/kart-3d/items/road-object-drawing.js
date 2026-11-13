// Draws the things items leave on the road (M8b), read from race.items.objects (road-objects.js): each blocker
// as a sandcastle (castle-drawing.js). Each object's frame on the road is worked out once, when it is first seen.
// Used by item-drawing.js.

import * as THREE from 'three';
import { KART_ITEMS } from '../../../../shared/protocol.js';
import { objectFrame } from './road-objects.js';
import { sandcastleMotion } from './road-object-motion.js';
import { createCastleDrawing } from './castle-drawing.js';

// Shared by every frame with no race, so update allocates nothing.
const NO_OBJECTS = [];

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape). `bursts` is burst-look.js's.
export function createRoadObjectDrawing(scene, bursts) {
  const castles = createCastleDrawing(scene, bursts);
  // Each object seen, by id: { frame (its Matrix4 on the road), landed, slumped (its puffs made), seenAt }.
  const records = new Map();
  let shownRace = null;
  let frameNumber = 0;
  let time = 0;
  const motion = {};

  // `race` null (the setup screen) or a race with no objects draws none; puffs already flying go on.
  function update(race, track, poses, dt) {
    if (race !== shownRace) {
      shownRace = race;
      records.clear();
    }
    const objects = race?.items?.objects ?? NO_OBJECTS;
    frameNumber += 1;
    time += dt;
    let blockers = 0;
    for (const object of objects) {
      blockers += object.item === KART_ITEMS.BLOCKER ? 1 : 0;
    }
    castles.begin(blockers);
    let castleIndex = 0;
    for (const object of objects) {
      const record = recordOf(track, object);
      if (object.item === KART_ITEMS.BLOCKER) {
        castles.place(record, object, castleIndex, time);
        castleIndex += 1;
      }
    }
    // Objects gone from the race are forgotten.
    records.forEach((record, id) => {
      if (record.seenAt !== frameNumber) {
        records.delete(id);
      }
    });
    castles.end();
  }

  // The object's record, made the first time it is seen (so allocating only then). A castle first seen already
  // down (a race shown part way through) makes no puff for what happened before.
  function recordOf(track, object) {
    let record = records.get(object.id);
    if (!record) {
      const { position, forward, up, right } = objectFrame(track, object);
      // The models' x is to the left, so their axes are a right-handed frame with y up and z along the road.
      const frame = new THREE.Matrix4()
        .makeBasis(new THREE.Vector3(-right.x, -right.y, -right.z), new THREE.Vector3(up.x, up.y, up.z), new THREE.Vector3(forward.x, forward.y, forward.z))
        .setPosition(position.x, position.y, position.z);
      sandcastleMotion(object.left, motion);
      record = { frame, landed: motion.landed, slumped: motion.vanishing, seenAt: 0 };
      records.set(object.id, record);
    }
    record.seenAt = frameNumber;
    return record;
  }

  return { update, dispose: castles.dispose };
}
