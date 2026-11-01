// What every piece of the kit (M7d2) is given to build itself on a course, made once by the course's dressing:
// { world, track, keep, materials, sponsors, palm, textures }: the group to add to, the track, keep(thing) to
// register what must be disposed with the world, the plain materials several pieces share (since M7d4c3: plastic,
// painted, iron and glass), the one material all sponsor
// boards share (kit/sponsors.js), the palm's trunk and frond materials (kit/palm.js), and the textures several pieces
// use (concrete, grass, wood, sand, and since M7d4 the concrete's and wood's relief: normal maps to go with
// them), drawn once and shared. Used by the courses' dressings (test-track-scenery.js, seaside-scenery.js).
// Since M7d4c3 every prop and landmark builds its own parts from the kit: its geometry, and its material (made with
// keep) unless one of these serves. Since M7d4b a dressing builds each piece into a named part of the world (kitPart), so the Measure tool can
// hide one part at a time.

import * as THREE from 'three';
import { createSponsorMaterial } from './sponsors.js';
import { createConcreteTexture } from './concrete.js';
import { createGrassTexture } from './road-textures.js';
import { createWoodTexture, createSandTexture } from './seaside-textures.js';
import { createPalmMaterials } from './palm.js';

// Lamps by day: warm glass lit by the sun, not glowing (lit lamps in daylight looked odd on the M7c device run).
const GLASS = { color: 0xfff4dc, roughness: 0.15, metalness: 0.1 };

export function createKit({ world, track, keep }) {
  const concrete = createConcreteTexture();
  const wood = createWoodTexture();
  return {
    world,
    track,
    keep,
    materials: {
      plastic: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })),
      painted: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })),
      iron: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 })),
      glass: keep(new THREE.MeshStandardMaterial(GLASS)),
    },
    sponsors: createSponsorMaterial(keep),
    palm: createPalmMaterials(keep),
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
