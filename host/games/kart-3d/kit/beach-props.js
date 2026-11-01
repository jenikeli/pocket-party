// The kit's beach and harbour props (M7d3, rebuilt in M7d4c4 to the study), our own toy versions of what stands
// about on MK8DX's seaside courses: a striped beach parasol, a sun lounger, surfboards stuck in the sand, a
// lifebuoy on a post and a stack of oil drums. Each is one geometry coloured per vertex, standing on y = 0 and
// facing +z (toward the road); the shapes are drawn in beach-parasol.js, beach-lounger.js, beach-surfboards.js,
// beach-lifebuoy.js and beach-barrels.js. Each builder takes the kit and returns the prop's parts,
// [{ geometry, material }]. Used by kit/props.js.

import { parasolShape } from './beach-parasol.js';
import { loungerShape } from './beach-lounger.js';
import { surfboardsShape } from './beach-surfboards.js';
import { lifebuoyPostShape } from './beach-lifebuoy.js';
import { barrelsShape } from './beach-barrels.js';

const PARASOL_COLORS = [0xe8402f, 0xf6f4ee];

export function buildParasol(kit) {
  return [{ geometry: kit.keep(parasolShape(PARASOL_COLORS)), material: kit.materials.painted }];
}

export function buildLounger(kit) {
  return [{ geometry: kit.keep(loungerShape()), material: kit.materials.painted }];
}

export function buildSurfboards(kit) {
  return [{ geometry: kit.keep(surfboardsShape()), material: kit.materials.plastic }];
}

export function buildLifebuoyPost(kit) {
  return [{ geometry: kit.keep(lifebuoyPostShape()), material: kit.materials.painted }];
}

export function buildBarrels(kit) {
  return [{ geometry: kit.keep(barrelsShape()), material: kit.materials.painted }];
}
