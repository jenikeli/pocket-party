// What every piece of the kit (M7d2) is given to build itself on a course, made once by the course's dressing:
// { world, track, keep, sponsors, textures }: the group to add to, the track, keep(thing) to register what must
// be disposed with the world, the one material all sponsor boards share (kit/sponsors.js), and the textures
// several pieces use (concrete, grass), drawn once and shared. Used by the courses' dressings
// (test-track-scenery.js).

import { createSponsorMaterial } from './sponsors.js';
import { createConcreteTexture } from './concrete.js';
import { createGrassTexture } from './road-textures.js';

export function createKit({ world, track, keep }) {
  return {
    world,
    track,
    keep,
    sponsors: createSponsorMaterial(keep),
    textures: { concrete: keep(createConcreteTexture()), grass: keep(createGrassTexture()) },
  };
}
