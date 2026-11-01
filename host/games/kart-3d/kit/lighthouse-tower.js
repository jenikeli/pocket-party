// The lighthouse's tower (M7d4d), from its foot to just below the balcony: the stone shaft, the smooth tan plinth
// it stands on, the corbels under the balcony, the arched door with its awning and the arched white windows
// climbing round it. Used by kit/lighthouse.js, which gives each list its material.

import * as THREE from 'three';
import { at, coloured, roundedBox, roundedCylinder, shaded } from '../shape-utils.js';
import { archGeometry } from './lighthouse-shapes.js';

export const BOTTOM_RADIUS = 3.2;
export const TOP_RADIUS = 2.3;
export const PLINTH_HEIGHT = 1.6;
const TAN = 0xd9c79f;
const WHITE = 0xf4f0e6;
const ORANGE = 0xf08a2a;
const DOOR_BROWN = 0x6a3a22;
const PANE = 0x2a4050;
// The shaft wraps the stone tile (kit/stone-texture.js) round it this many times.
const TILE_WRAPS = 3;

export const radiusAt = (height, y) => BOTTOM_RADIUS + ((TOP_RADIUS - BOTTOM_RADIUS) * y) / height;

// The shaft, in white vertex colours for the stone material, darker toward its foot where the sea has stained it.
// Its texture coordinates give square stones: the tile is as tall as it is wide.
export function buildShaft(height) {
  const shaft = new THREE.CylinderGeometry(TOP_RADIUS, BOTTOM_RADIUS, height, 32, 8, true);
  const tileHeight = (2 * Math.PI * ((TOP_RADIUS + BOTTOM_RADIUS) / 2)) / TILE_WRAPS;
  const { uv } = shaft.attributes;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * TILE_WRAPS, (uv.getY(index) * height) / tileHeight);
  }
  return shaded(coloured(at(shaft, 0, height / 2, 0), 0xffffff), (x, y) => 0.8 + 0.2 * Math.min(y / (height * 0.5), 1));
}

// Painted parts (white, tan): the plinth with a cap ring, the corbels, the door and the windows' frames and sills.
export function buildTowerPainted(height) {
  return [
    coloured(at(roundedCylinder(BOTTOM_RADIUS + 0.9, BOTTOM_RADIUS + 1.2, PLINTH_HEIGHT, 0.22, 32), 0, PLINTH_HEIGHT / 2, 0), TAN),
    coloured(at(roundedCylinder(BOTTOM_RADIUS + 0.3, BOTTOM_RADIUS + 0.3, 0.3, 0.1, 32), 0, PLINTH_HEIGHT + 0.1, 0), TAN),
    ...buildCorbels(height),
    ...buildDoor(),
    ...buildWindows(height, 'frames'),
  ];
}

// The windows' dark panes, set back in their frames (painted dark).
export function buildTowerPanes(height) {
  return buildWindows(height, 'panes');
}

// The door's awning, glossy orange.
export function buildTowerGloss() {
  return [coloured(at(roundedBox(2, 0.16, 1, 0.06).rotateX(0.35), 0, 4.75, BOTTOM_RADIUS + 0.35), ORANGE)];
}

function buildCorbels(height) {
  return Array.from({ length: 16 }, (_, index) => {
    const corbel = roundedBox(0.5, 0.7, 0.6, 0.1, { chamfered: true }).translate(0, 0, TOP_RADIUS + 0.2).rotateY((index / 16) * 2 * Math.PI);
    return coloured(at(corbel, 0, height - 0.55, 0), TAN);
  });
}

// The door on the tower's +z side above the plinth: a brown arched door in a white arched frame.
function buildDoor() {
  const out = BOTTOM_RADIUS - 0.3;
  const frame = archGeometry({ width: 1.7, height: 2.5, depth: 0.35, bevel: 0.05, border: 0.2 }).translate(0, PLINTH_HEIGHT + 0.25, out);
  const door = archGeometry({ width: 1.3, height: 2.3, depth: 0.2, bevel: 0.04 }).translate(0, PLINTH_HEIGHT + 0.25, out + 0.12);
  return [coloured(frame, WHITE), coloured(door, DOOR_BROWN)];
}

// Five windows climbing round the tower, each a white arched frame on a sill (kind 'frames') round a dark pane
// (kind 'panes'): built facing +z at the tower's wall, then turned to its angle and lifted.
function buildWindows(height, kind) {
  return Array.from({ length: 5 }, (_, window) => {
    const y = height * (0.22 + window * 0.14);
    const out = radiusAt(height, y);
    const turn = (geometry, hex) => at(coloured(geometry, hex).rotateY(1.1 + window * 1.9), 0, y, 0);
    if (kind === 'panes') {
      return turn(archGeometry({ width: 0.9, height: 1.5, depth: 0.1, bevel: 0.02 }).translate(0, 0, out - 0.04), PANE);
    }
    const frame = archGeometry({ width: 1.0, height: 1.6, depth: 0.3, bevel: 0.04, border: 0.16 }).translate(0, 0, out - 0.12);
    const sill = roundedBox(1.3, 0.16, 0.5, 0.05, { chamfered: true }).translate(0, -0.08, out + 0.05);
    return [turn(frame, WHITE), turn(sill, WHITE)];
  }).flat();
}
