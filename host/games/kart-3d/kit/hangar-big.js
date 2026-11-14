// Palm Bay Airport's big hangar (M9), a landmark over the anti-gravity ring: open-sided, so the sun reaches the
// ring under its blue arched roof, half of it long skylights; white lattice ribs on coral columns; glazed gables
// over doors rolled open into pockets past both sides, HANGAR 1 and our emblem over the front ones (the road's
// way in); lamps under the ribs; floor markings, tool chests and a stair in the ring's infield; lattice towers
// under the raised ring. It sizes itself round the road's stations from fromS to toS (kit/hangar-plan.js), so it
// clears the ring wherever the course puts it. Used by the airport's dressing (airport-scenery.js), and by
// host/kit-shots/airport-h-pieces.js.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { planBigHangar } from './hangar-plan.js';
import { buildFrameGeometry } from './hangar-big-frame.js';
import { roofShapes, doorShapes, signShapes, floorDecal } from './hangar-big-skin.js';
import { buildFittingsGeometry, buildRingTowers } from './hangar-big-fittings.js';
import { hangarMaterials, hangarMesh } from './hangar-parts.js';
import { createFloorMarkings, createSignTexture, CORAL, NAVY } from './hangar-maps.js';

// The floor markings are drawn at this many pixels a unit.
const MARKING_PIXELS = 16;

// A landmark: { object, update(dt, race), spot }. `object` stands on
// its own origin, its doors facing +x; `spot` ({ x, y, z, heading }) is where it goes on the course, for
// placeLandmark. Nothing moves, so update does nothing.
export function buildBigHangar(kit, { fromS, toS }) {
  const plan = planBigHangar(kit.track, { fromS, toS });
  const { keep } = kit;
  const materials = hangarMaterials(kit);
  const roof = roofShapes(plan);
  const signs = signShapes(plan);
  const steel = mergeShapes([buildFrameGeometry(plan), buildFittingsGeometry(plan), buildRingTowers(plan), signs.board]);
  const object = new THREE.Group();
  object.name = 'big-hangar';
  object.add(
    hangarMesh(keep(steel), materials.steel),
    hangarMesh(keep(mergeShapes([...roof.sheet, ...doorShapes(plan)])), materials.sheet),
    hangarMesh(keep(mergeShapes(roof.glass)), materials.glass),
    hangarMesh(keep(signs.face), signMaterial(keep)),
    floorMarkings(plan, keep),
  );
  return { object, update() {}, spot: plan.spot };
}

function signMaterial(keep) {
  const map = keep(createSignTexture({ text: 'HANGAR 1', board: 0xffffff, ink: NAVY, stripe: CORAL, emblem: true }));
  return keep(new THREE.MeshStandardMaterial({ map, roughness: 0.5 }));
}

// The markings lie just over the floor, drawn see-through where unpainted; pulled toward the camera in the depth
// test so the floor under them never shows through.
function floorMarkings(plan, keep) {
  const { geometry, bounds } = floorDecal(plan);
  const map = keep(createFloorMarkings(plan.infield, bounds, MARKING_PIXELS));
  const material = keep(new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const mesh = new THREE.Mesh(keep(geometry), material);
  mesh.receiveShadow = true;
  return mesh;
}
