// The airport's airliner (M9), a landmark about 45 long and 42 across, big beside the karts as Sunshine Airport's
// planes are: a round fuselage with its cockpit and cabin windows and doors, swept wings with two engines, a tail
// with the airline's emblem, a big emblem on its nose, and its landing gear. Its body and tail are built in kit/
// airliner-shapes.js, its wings and engines in kit/airliner-wings.js, its gear in kit/airliner-gear.js, its
// liveries in kit/airliner-liveries.js; here each part gets its material and becomes one mesh.
// It stands on its gear on its origin (under the wings' middle), faces +x, its left side (-z) with the front door
// the terminal's jet bridges reach. Every airliner on a course shares its fuselage's, fin's and trim's geometry,
// and one set of materials per livery; the parts coloured per vertex are copied per plane (OWN_COPY). Used by the airport's dressing (airport-scenery.js), the take-off plane
// (kit/take-off-plane.js) and kit-shots (host/kit-shots/airport-i-pieces.js).

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { buildAirlinerBody, leftSideAt, FIN, FRONT_DOOR_X, FUSELAGE, SILL_Y } from './airliner-shapes.js';
import { buildAirlinerWings } from './airliner-wings.js';
import { buildAirlinerGear, GEAR_PIVOT_Y } from './airliner-gear.js';
import { AIRLINER_LIVERIES, paintFin, paintFuselage } from './airliner-liveries.js';
import { createSkinMaps, createWingMaps, SKIN_TILE } from './airliner-maps.js';
import { projectUv } from './terminal-uv.js';

export { AIRLINER_LIVERIES } from './airliner-liveries.js';

// The front left door's sill, at its middle, on the fuselage's skin: where a jet bridge's cab meets it (kit/
// terminal.js's terminalGates, at a sill of 3.2). The door faces -z.
export const AIRLINER_DOOR = Object.freeze({ x: FRONT_DOOR_X, y: SILL_Y, z: leftSideAt(FRONT_DOOR_X, SILL_Y) });
// What the airliner covers seen from above, in its own frame (x from tail to nose, z either side to its winglets),
// and how tall it stands (to its fin's top).
export const AIRLINER_FOOTPRINT = Object.freeze({ minX: FUSELAGE.tailX - 0.2, maxX: FUSELAGE.noseX, halfWidth: 21.6, height: FIN.rootY + FIN.height });

// Parts coloured per vertex, which the course's baked shade darkens (baked-shade.js bakes each colour buffer
// once, where its first mesh stands): each plane gets its own copy, so it takes the shade of its own place.
const OWN_COPY = new Set(['wing', 'painted', 'gear']);
// What every airliner built on a kit shares: { geometry, materials, liveries }.
const sharedByKit = new WeakMap();

// Every part's shapes merged into one geometry each: { partName: geometry }, the gear's built round its pivot.
// Needs no canvas, so the unit tests can count its triangles.
export function airlinerGeometry() {
  const parts = {};
  for (const list of [buildAirlinerBody(), buildAirlinerWings()]) {
    for (const [name, shapes] of Object.entries(list)) {
      parts[name] = [...(parts[name] ?? []), ...shapes];
    }
  }
  const geometry = Object.fromEntries(Object.entries(parts).map(([name, shapes]) => [name, mergeShapes(shapes)]));
  projectUv(geometry.wing, SKIN_TILE);
  return { ...geometry, gear: buildAirlinerGear() };
}

// `kit` is the course's kit (kit/kit.js); `livery` one of AIRLINER_LIVERIES's names. Returns { object, update,
// gear }: the plane as a group, an update with nothing to move, and its gear's mesh (for the take-off plane).
export function buildAirliner(kit, { livery }) {
  const shared = sharedFor(kit);
  const materials = { ...shared.materials, ...liveryMaterials(kit, shared, livery) };
  const object = new THREE.Group();
  let gear = null;
  for (const [name, geometry] of Object.entries(shared.geometry)) {
    const mesh = new THREE.Mesh(OWN_COPY.has(name) ? kit.keep(geometry.clone()) : geometry, materials[name]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    object.add(mesh);
    if (name === 'gear') {
      mesh.position.y = GEAR_PIVOT_Y;
      gear = mesh;
    }
  }
  return { object, update() {}, gear };
}

function sharedFor(kit) {
  if (!sharedByKit.has(kit)) {
    const geometry = airlinerGeometry();
    Object.values(geometry).forEach(kit.keep);
    sharedByKit.set(kit, { geometry, materials: createSharedMaterials(kit), skin: createSkin(kit), liveries: new Map() });
  }
  return sharedByKit.get(kit);
}

function createSharedMaterials({ keep, materials }) {
  const wingMaps = createWingMaps();
  Object.values(wingMaps).forEach(keep);
  return {
    wing: keep(new THREE.MeshStandardMaterial({ vertexColors: true, ...wingMaps, roughness: 1, metalness: 0.1 })),
    painted: materials.plastic,
    gear: materials.painted,
  };
}

// The fuselage's seams and rivets, repeated in tiles SKIN_TILE units long and about as tall round it.
function createSkin({ keep }) {
  const skin = createSkinMaps();
  const roundLength = 2 * Math.PI * FUSELAGE.radius;
  for (const texture of Object.values(skin)) {
    texture.repeat.set(Math.round((FUSELAGE.noseX - FUSELAGE.tailX) / SKIN_TILE), Math.round(roundLength / SKIN_TILE));
    keep(texture);
  }
  return skin;
}

// The livery's own materials { body, fin, trim }, drawn the first time it is asked for on this kit.
function liveryMaterials({ keep }, shared, name) {
  const livery = AIRLINER_LIVERIES[name];
  if (!livery) {
    throw new Error(`Unknown airliner livery "${name}" (known: ${Object.keys(AIRLINER_LIVERIES).join(', ')})`);
  }
  if (!shared.liveries.has(name)) {
    shared.liveries.set(name, {
      body: keep(new THREE.MeshStandardMaterial({ map: keep(paintFuselage(livery)), ...shared.skin, roughness: 1, metalness: 0.1 })),
      fin: keep(new THREE.MeshStandardMaterial({ map: keep(paintFin(livery)), roughness: 0.35, metalness: 0.1 })),
      trim: keep(new THREE.MeshStandardMaterial({ color: livery.main, roughness: 0.35 })),
    });
  }
  return shared.liveries.get(name);
}
