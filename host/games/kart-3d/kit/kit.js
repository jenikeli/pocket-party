// What every piece of the kit (M7d2) is given to build itself on a course, made once by the course's dressing:
// { world, track, keep, sponsors, fronds, textures }: the group to add to, the track, keep(thing) to
// register what must be disposed with the world, the one material all sponsor
// boards share (kit/sponsors.js), the one all palm fronds share (kit/palm.js), and the textures several pieces
// use (concrete, grass, wood, sand, and since M7d4 the concrete's and wood's relief: normal maps to go with
// them), drawn once and shared. Used by the courses' dressings (test-track-scenery.js, seaside-scenery.js).
// Since M7d4b a dressing builds each piece into a named part of the world (kitPart), so the Measure tool can
// hide one part at a time.

import * as THREE from 'three';
import { createSponsorMaterial } from './sponsors.js';
import { createConcreteTexture } from './concrete.js';
import { createGrassTexture } from './road-textures.js';
import { createWoodTexture, createSandTexture } from './seaside-textures.js';
import { createFrondMaterial } from './palm.js';

export function createKit({ world, track, keep }) {
  const concrete = createConcreteTexture();
  const wood = createWoodTexture();
  return {
    world,
    track,
    keep,
    sponsors: createSponsorMaterial(keep),
    fronds: createFrondMaterial(keep),
    textures: {
      concrete: keep(concrete.map),
      concreteRelief: keep(concrete.relief),
      grass: keep(createGrassTexture()),
      wood: keep(wood.map),
      woodRelief: keep(wood.relief),
      sand: keep(createSandTexture()),
    },
  };
}

// `kit` with its world swapped for the part called `name` (one of KIT_PARTS in kit/layout-rules.js): a group in
// kit's world, made the first time the part is asked for. Pieces built with it add to that group.
export function kitPart(kit, name) {
  let group = kit.world.children.find((child) => child.isGroup && child.name === name);
  if (!group) {
    group = new THREE.Group();
    group.name = name;
    kit.world.add(group);
  }
  return { ...kit, world: group };
}
