// The airport's control tower (M9), a landmark about 40 tall: a tapering clad shaft on a round podium, a round
// glass cab with a gallery, a coral roof with a dome, antennas, and a radar turning on top (docs/queue.md's task
// G). Its shapes are built in kit/control-tower-shapes.js; here each part gets its material. It stands on its
// origin, its door toward +x. Used by the airport's dressing (airport-scenery.js) and kit-shots
// (host/kit-shots/airport-g-pieces.js).

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { buildControlTowerShapes, PODIUM, RADAR_HEIGHT, TOWER_TOP } from './control-tower-shapes.js';
import { createCladdingMaps } from './terminal-maps.js';

// One turn of the radar takes this many seconds.
const RADAR_TURN_SECONDS = 4;

// What the tower covers seen from above (a circle round its origin) and how tall it stands.
export const CONTROL_TOWER_FOOTPRINT = Object.freeze({ radius: PODIUM.radius + 0.5, height: TOWER_TOP });

// Every part's shapes merged into one geometry each: { partName: geometry }. Needs no canvas, so the unit tests
// can count its triangles.
export function controlTowerGeometry() {
  return Object.fromEntries(Object.entries(buildControlTowerShapes()).map(([name, shapes]) => [name, mergeShapes(shapes)]));
}

// `kit` is the course's kit (kit/kit.js). Returns { object, update(dt) }: the tower as a group, and turning its
// radar on.
export function buildControlTower(kit) {
  const materials = createMaterials(kit);
  const object = new THREE.Group();
  let radar = null;
  for (const [name, geometry] of Object.entries(controlTowerGeometry())) {
    const mesh = new THREE.Mesh(kit.keep(geometry), materials[name]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    object.add(mesh);
    if (name === 'radar') {
      mesh.position.y = RADAR_HEIGHT;
      radar = mesh;
    }
  }
  function update(dt) {
    radar.rotation.y = (radar.rotation.y + (dt * 2 * Math.PI) / RADAR_TURN_SECONDS) % (2 * Math.PI);
  }
  return { object, update };
}

function createMaterials({ keep, materials }) {
  const cladding = createCladdingMaps();
  Object.values(cladding).forEach(keep);
  return {
    cladding: keep(new THREE.MeshStandardMaterial({ vertexColors: true, ...cladding, roughness: 1 })),
    painted: materials.painted,
    gloss: materials.plastic,
    // Tinted per vertex (kit/control-tower-shapes.js): reflects the sky like the terminal's upper glass.
    glass: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.6 })),
    radar: materials.painted,
  };
}
