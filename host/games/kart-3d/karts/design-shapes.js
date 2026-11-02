// The designs' shapes (M7d5): our go-kart in a design's colours with its driver, the parts of each material
// kind merged into one geometry, so a kart is one draw call per kind plus one per wheel. The kart's own parts are
// the same shapes in every design, so they are built once and only copied and painted per design. Geometry only
// (no textures), so it is unit tested in Node. Used by kart-models.js.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { addParts, paintKart, MATERIAL_KINDS } from './part-shapes.js';
import { buildKartBody } from './kart-body.js';
import { buildKartRear } from './kart-rear.js';
import { buildCockpit } from './kart-cockpit.js';
import { SEAT } from './kart-layout.js';
import { withSafeNormals } from './safe-normals.js';

// The kart's parts for every design (part-shapes.js's kartPart), to give buildDesignShapes. Its shapes are only
// copied from, so the caller disposes them once every design is built (disposeKartParts).
export function buildKartParts() {
  return [...buildKartBody(), ...buildKartRear(), ...buildCockpit()];
}

export function disposeKartParts(kartParts) {
  kartParts.forEach((part) => part.shape.dispose());
}

// Returns { glossy, matte, metal, decal }: one geometry for each material kind (part-shapes.js's MATERIAL_KINDS),
// the kart's parts (buildKartParts) painted in `design`'s palette, with its driver. A kind the design does not use
// (a robot or a frog with no part in skin) is an empty geometry, which draws nothing. Every kind's normals are made
// safe for the GPU (safe-normals.js).
export function buildDesignShapes(design, kartParts) {
  const parts = addParts(paintKart(kartParts, design.palette), design.buildDriver(SEAT));
  return Object.fromEntries(MATERIAL_KINDS.map((kind) => [kind, parts[kind].length > 0 ? withSafeNormals(mergeShapes(parts[kind])) : emptyShape()]));
}

function emptyShape() {
  const shape = new THREE.BufferGeometry();
  shape.setIndex([]);
  return shape;
}
