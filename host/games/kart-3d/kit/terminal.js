// The airport's terminal (M9), a landmark: a long, low building facing the apron, after Sunshine Airport's in
// MK8DX in our own colours and name (docs/queue.md's task G). Its body, hall, roof, round ends and jet bridges are
// built in kit/terminal-body.js, terminal-inside.js, terminal-roof.js, terminal-ends.js and terminal-bridges.js,
// its maps in terminal-maps.js and pictures in terminal-pictures.js; here each part gets its material and becomes
// one mesh.
// It stands on its origin (the foot of the hall's glass, halfway along), faces +x and runs along z. Used by the
// airport's dressing (airport-scenery.js) and kit-shots (host/kit-shots/airport-g-pieces.js).

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { buildTerminalBody, BACK } from './terminal-body.js';
import { buildTerminalInside } from './terminal-inside.js';
import { buildTerminalRoof, SIGN_TOP } from './terminal-roof.js';
import { buildJetBridge, BRIDGE_DOOR } from './terminal-bridges.js';
import { buildTerminalEnds, END_REACH } from './terminal-ends.js';
import { createBandMaps, createCladdingMaps, createRoofMaps, createSkylightMaps, createRibbedMaps } from './terminal-maps.js';
import { drawSign, drawDepartureBoard } from './terminal-pictures.js';

// The jet bridges stand at these shares of the length either side of the middle.
const GATE_SHARES = [-0.3, 0, 0.3];
// Parts that are see-through cast no shadow.
const SEE_THROUGH = new Set(['lowerGlass']);

// Where the jet bridges' doors are, for parking planes: [{ x, y, z }] in the terminal's own frame.
export function terminalGates(length) {
  return GATE_SHARES.map((share) => ({ x: BRIDGE_DOOR.x, y: BRIDGE_DOOR.y, z: share * length }));
}

// What the terminal covers seen from above, in its own frame, and how tall it stands (to the sign's top).
export function terminalFootprint(length) {
  return { minX: BACK - 0.8, maxX: BRIDGE_DOOR.x, minZ: -length / 2 - END_REACH - 0.6, maxZ: length / 2 + END_REACH + 0.6, height: SIGN_TOP };
}

// Every part's shapes merged into one geometry each: { partName: geometry }. Needs no canvas, so the unit tests
// can count its triangles.
export function terminalGeometry(length) {
  const lists = [
    buildTerminalBody(length),
    buildTerminalInside(length),
    buildTerminalRoof(length),
    buildTerminalEnds(length),
    ...terminalGates(length).map(({ z }) => buildJetBridge(z)),
  ];
  const parts = {};
  for (const list of lists) {
    for (const [name, shapes] of Object.entries(list)) {
      parts[name] = [...(parts[name] ?? []), ...shapes];
    }
  }
  return Object.fromEntries(Object.entries(parts).map(([name, shapes]) => [name, mergeShapes(shapes)]));
}

// `kit` is the course's kit (kit/kit.js); `length` the terminal's along z. Returns { object, update }: the
// building as a group, and an update that has nothing to move.
export function buildTerminal(kit, { length }) {
  const materials = createMaterials(kit);
  const object = new THREE.Group();
  for (const [name, geometry] of Object.entries(terminalGeometry(length))) {
    const mesh = new THREE.Mesh(kit.keep(geometry), materials[name]);
    mesh.castShadow = !SEE_THROUGH.has(name);
    mesh.receiveShadow = true;
    object.add(mesh);
  }
  return { object, update() {} };
}

// One material per part, every one coloured per vertex.
function createMaterials({ keep, materials, textures }) {
  // A material from drawn maps (kit/surface-maps.js's toMaps): their roughness map sets the roughness.
  const mapped = (maps, settings = {}) => {
    Object.values(maps).forEach(keep);
    return keep(new THREE.MeshStandardMaterial({ vertexColors: true, ...maps, roughness: 1, ...settings }));
  };
  const sign = keep(drawSign());
  const board = keep(drawDepartureBoard());
  return {
    concrete: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.85 })),
    cladding: mapped(createCladdingMaps()),
    painted: materials.painted,
    gloss: materials.plastic,
    band: mapped(createBandMaps()),
    roof: mapped(createRoofMaps(), { metalness: 0.3 }),
    skylight: mapped(createSkylightMaps(), { metalness: 0.4 }),
    ribbed: mapped(createRibbedMaps(), { metalness: 0.3 }),
    // Dark glass that shows the hall dimly behind the sky it reflects.
    lowerGlass: keep(new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x1d3d52, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.7 })),
    upperGlass: keep(new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x8cc4ea, roughness: 0.2, metalness: 0.35 })),
    sign: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: sign, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 })),
    // Lit from inside, softly enough to stay out of the bloom.
    board: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: board, emissiveMap: board, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.3 })),
  };
}
