// The kit's stone lighthouse (M7d3), as at MK8DX's Daisy Circuit: a tapering tower of stone blocks on a wider
// plinth, a door with an awning and small windows climbing it, corbels under a green balcony with a railing, a
// glass lamp room between green mullions, and an orange dome with a finial. Three parts by material: stone
// (textured with blocks), painted parts and glass. `height` is the tower's to the balcony; it stands on y = 0,
// its door facing +z. Takes the kit and returns the parts, [{ geometry, material }]. Used by the seaside
// surroundings.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { createStoneTexture } from './stone-texture.js';

// The lamp is off by day: warm glass lit by the sun (a lit lamp looked odd in daylight on the M7c device run).
const GLASS = { color: 0xfff1cc, roughness: 0.1, metalness: 0.1 };
const GREEN = 0x2f9a4a;
const ORANGE = 0xf08a2a;
const WHITE = 0xf4f0e6;
const BOTTOM_RADIUS = 3.2;
const TOP_RADIUS = 2.3;

export function buildLighthouse(kit, height) {
  const { keep } = kit;
  return [
    { geometry: keep(buildStone(height)), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: keep(createStoneTexture()), roughness: 0.85 })) },
    { geometry: keep(buildPainted(height)), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 })) },
    { geometry: keep(buildGlass(height)), material: keep(new THREE.MeshStandardMaterial(GLASS)) },
  ];
}

const radiusAt = (height, y) => BOTTOM_RADIUS + ((TOP_RADIUS - BOTTOM_RADIUS) * y) / height;

// The plinth, the tower (its texture wraps three times round it and repeats every 2.5 up it) and the corbels.
function buildStone(height) {
  const tower = new THREE.CylinderGeometry(TOP_RADIUS, BOTTOM_RADIUS, height, 24, 1, true);
  const uv = tower.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * 3, (uv.getY(index) * height) / 2.5);
  }
  const plinth = new THREE.CylinderGeometry(BOTTOM_RADIUS + 0.9, BOTTOM_RADIUS + 1.2, 1.6, 8);
  const corbels = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * 2 * Math.PI;
    const corbel = new THREE.BoxGeometry(0.45, 0.6, 0.5).translate(0, 0, TOP_RADIUS + 0.2).rotateY(angle);
    return coloured(at(corbel, 0, height - 0.5, 0), 0xe0d8c8);
  });
  return mergeShapes([coloured(at(tower, 0, height / 2, 0), 0xffffff), coloured(at(plinth, 0, 0.8, 0), 0xc8c0b0), ...corbels]);
}

function buildPainted(height) {
  const parts = [];
  // The door and its awning, on the plinth's face.
  parts.push(coloured(at(roundedBox(1.2, 2.1, 0.2, 0.08), 0, 2.1, BOTTOM_RADIUS - 0.02), 0x6a3a22));
  parts.push(coloured(at(roundedBox(1.8, 0.14, 0.9, 0.05).rotateX(0.35), 0, 3.35, BOTTOM_RADIUS + 0.3), ORANGE));
  // Windows climbing round the tower, each with a white frame.
  for (let window = 0; window < 4; window += 1) {
    const y = height * (0.3 + window * 0.17);
    const angle = window * 1.9;
    const out = radiusAt(height, y);
    const frame = coloured(roundedBox(0.9, 1.2, 0.16, 0.05).translate(0, 0, out), WHITE);
    const pane = coloured(roundedBox(0.62, 0.9, 0.12, 0.04).translate(0, 0, out + 0.05), 0x2a4050);
    parts.push(at(frame.rotateY(angle), 0, y, 0), at(pane.rotateY(angle), 0, y, 0));
  }
  // The balcony: a floor, a railing of posts with a rail round their tops.
  parts.push(coloured(at(new THREE.CylinderGeometry(TOP_RADIUS + 1.1, TOP_RADIUS + 0.9, 0.35, 24), 0, height + 0.15, 0), GREEN));
  for (let post = 0; post < 24; post += 1) {
    const angle = (post / 24) * 2 * Math.PI;
    parts.push(coloured(at(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), Math.cos(angle) * (TOP_RADIUS + 1), height + 0.8, Math.sin(angle) * (TOP_RADIUS + 1)), GREEN));
  }
  parts.push(coloured(at(new THREE.TorusGeometry(TOP_RADIUS + 1, 0.07, 6, 32).rotateX(Math.PI / 2), 0, height + 1.3, 0), GREEN));
  // The lamp room's base, its mullions and the ring under the dome.
  const lampBottom = height + 0.3;
  parts.push(coloured(at(new THREE.CylinderGeometry(1.9, 1.9, 0.6, 16), 0, lampBottom + 0.3, 0), GREEN));
  for (let mullion = 0; mullion < 8; mullion += 1) {
    const angle = (mullion / 8) * 2 * Math.PI;
    parts.push(coloured(at(new THREE.BoxGeometry(0.14, 2.4, 0.14), Math.cos(angle) * 1.72, lampBottom + 1.8, Math.sin(angle) * 1.72), GREEN));
  }
  parts.push(coloured(at(new THREE.CylinderGeometry(2.1, 2.1, 0.3, 16), 0, lampBottom + 3.1, 0), GREEN));
  // The orange dome, a ball and a spike on top.
  parts.push(coloured(at(new THREE.SphereGeometry(2, 20, 10, 0, 2 * Math.PI, 0, Math.PI / 2), 0, lampBottom + 3.2, 0), ORANGE));
  parts.push(coloured(at(new THREE.SphereGeometry(0.3, 10, 8), 0, lampBottom + 5.3, 0), ORANGE));
  parts.push(coloured(at(new THREE.ConeGeometry(0.08, 0.9, 6), 0, lampBottom + 6, 0), 0x3a3a40));
  return mergeShapes(parts);
}

// The lamp room's glass and the lamp inside it, off by day.
function buildGlass(height) {
  const lampBottom = height + 0.3;
  return mergeShapes([
    at(new THREE.CylinderGeometry(1.7, 1.7, 2.4, 16, 1, true), 0, lampBottom + 1.8, 0),
    at(new THREE.SphereGeometry(0.7, 12, 8), 0, lampBottom + 1.6, 0),
  ]);
}

// How far above the tower's foot the top of its dome's spike is.
export function lighthouseTop(height) {
  return height + 6.75;
}
