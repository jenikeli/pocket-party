// The control tower's shapes (M9), after Sunshine Airport's tower in MK8DX and real ones: a round podium with a band of
// windows, a tapering clad shaft with a stair window up its front, a flare opening out under the cab, a service floor, a gallery with a railing, the round glass cab leaning out in flat
// panes, a coral sunshade roof with a dome, two antennas and a radar. It stands on y = 0 round the y axis, its
// door and stair window toward +x. Returns shapes by part, { partName: [geometry] }; the radar is its own part, as
// it turns. Used by kit/control-tower.js.

import * as THREE from 'three';
import { at, between, coloured, indexed, roundedBox, roundedCylinder } from '../shape-utils.js';
import { lathe } from './circuit-shapes.js';
import { CORAL } from './terminal-maps.js';

export const PODIUM = { radius: 7, height: 5 };
const SHAFT = { bottom: PODIUM.height, top: 25, bottomRadius: 3.3, topRadius: 2.4 };
const SERVICE = { bottom: 28.5, height: 1.6, radius: 5.4 };
const GALLERY = { bottom: SERVICE.bottom + SERVICE.height, thickness: 0.35, radius: 6.5 };
const CAB = { bottom: GALLERY.bottom + GALLERY.thickness, height: 3.8, bottomRadius: 5, topRadius: 5.9, panes: 12 };
const ROOF = { bottom: CAB.bottom + CAB.height, sunshade: 0.7, cap: 1 };
const DOME_TOP = ROOF.bottom + ROOF.sunshade + ROOF.cap + 1.6;
// The top of the warning ball on the taller antenna.
export const TOWER_TOP = ROOF.bottom + ROOF.sunshade + 5.8;
// The shaft's cladding (kit/terminal-maps.js) is a tile this many units across and up.
const CLADDING_TILE = [4, 3];
const WHITE = 0xf2f0ea;
const LIGHT_GREY = 0xd5d9de;
const STEEL = 0xb8bec6;
const WARNING_RED = 0xe03a2a;
// The glass's tints (its material is white): the cab's and the bands' dark blue, the stair window's sky blue.
const DARK_GLASS = 0x2c5778;
const SKY_GLASS = 0x7fb8e0;
// Two masts on the roof's cap, beside the dome; their tops have red warning balls.
const ANTENNAS = [{ x: -2.7, z: 2.6, top: TOWER_TOP - 0.16 }, { x: -2.7, z: -2.6, top: TOWER_TOP - 1.76 }];
// The radar stands on top of the dome (kit/control-tower.js turns it round its own axis there).
export const RADAR_HEIGHT = DOME_TOP;

const shaftRadiusAt = (y) => SHAFT.bottomRadius + ((SHAFT.topRadius - SHAFT.bottomRadius) * (y - SHAFT.bottom)) / (SHAFT.top - SHAFT.bottom);

export function buildControlTowerShapes() {
  return {
    cladding: [buildShaft()],
    painted: [...buildPodium(), ...buildStairWindowBars(), ...buildServiceAndGallery(), ...buildCabFrame(), ...buildAntennas()],
    gloss: buildRoofGloss(),
    glass: [...buildGlass()],
    radar: buildRadar(),
  };
}

// The shaft, white for the cladding's map, its texture coordinates in whole tiles round it so its seam is hidden.
function buildShaft() {
  const height = SHAFT.top - SHAFT.bottom;
  const shaft = new THREE.CylinderGeometry(SHAFT.topRadius, SHAFT.bottomRadius, height, 32, 1, true);
  const around = Math.round((Math.PI * (SHAFT.topRadius + SHAFT.bottomRadius)) / CLADDING_TILE[0]);
  const { uv } = shaft.attributes;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * around, (uv.getY(index) * height) / CLADDING_TILE[1]);
  }
  return coloured(at(shaft, 0, SHAFT.bottom + height / 2, 0), 0xffffff);
}

// The podium, its coral cap ring, mullions round its window band, two grey rings up the shaft, and the door.
function buildPodium() {
  const parts = [
    coloured(at(roundedCylinder(PODIUM.radius, PODIUM.radius, PODIUM.height, 0.3, 40), 0, PODIUM.height / 2, 0), WHITE),
    coloured(at(roundedCylinder(PODIUM.radius + 0.3, PODIUM.radius + 0.3, 0.5, 0.15, 40), 0, PODIUM.height, 0), CORAL),
    coloured(at(roundedBox(0.6, 3.2, 2.8, 0.15), PODIUM.radius + 0.1, 1.6, 0), CORAL),
    coloured(at(roundedBox(0.4, 2.6, 2, 0.08), PODIUM.radius + 0.25, 1.3, 0), 0x2a3440),
  ];
  for (let pane = 0; pane < 24; pane += 1) {
    const angle = (pane / 24) * 2 * Math.PI;
    parts.push(coloured(at(roundedBox(0.18, 1.9, 0.18, 0.05, { chamfered: true }), Math.sin(angle) * (PODIUM.radius + 0.12), 2.9, Math.cos(angle) * (PODIUM.radius + 0.12)), WHITE));
  }
  for (const y of [12, 19]) {
    const radius = shaftRadiusAt(y) + 0.12;
    parts.push(coloured(at(roundedCylinder(radius, radius, 0.35, 0.1, 32), 0, y, 0), LIGHT_GREY));
  }
  return parts;
}

// White bars across the stair window up the shaft's front, every 1.5 units.
function buildStairWindowBars() {
  const bars = [];
  for (let y = 7; y <= 23; y += 1.5) {
    bars.push(coloured(at(roundedBox(0.4, 0.14, 1.2, 0.05, { chamfered: true }), shaftRadiusAt(y) + 0.12, y, 0), WHITE));
  }
  return bars;
}

// The flare under the cab, the service floor, the gallery's floor and its railing.
function buildServiceAndGallery() {
  const flare = lathe([[SHAFT.topRadius - 0.05, SHAFT.top - 0.2], [2.6, SHAFT.top + 0.6], [3.7, 27], [5.1, 28.1], [SERVICE.radius, SERVICE.bottom]], 32);
  const parts = [
    coloured(flare, LIGHT_GREY),
    coloured(at(roundedCylinder(SERVICE.radius, SERVICE.radius, SERVICE.height, 0.15, 32), 0, SERVICE.bottom + SERVICE.height / 2, 0), WHITE),
    coloured(at(roundedCylinder(GALLERY.radius, GALLERY.radius - 0.2, GALLERY.thickness, 0.1, 40), 0, GALLERY.bottom + GALLERY.thickness / 2, 0), LIGHT_GREY),
  ];
  const railRadius = GALLERY.radius - 0.15;
  for (const [y, tube] of [[CAB.bottom + 1.05, 0.06], [CAB.bottom + 0.55, 0.04]]) {
    parts.push(coloured(at(new THREE.TorusGeometry(railRadius, tube, 6, 64).rotateX(Math.PI / 2), 0, y, 0), WHITE));
  }
  for (let post = 0; post < 40; post += 1) {
    const angle = (post / 40) * 2 * Math.PI;
    parts.push(coloured(at(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 5), Math.sin(angle) * railRadius, CAB.bottom + 0.52, Math.cos(angle) * railRadius), WHITE));
  }
  return parts;
}

// Where corner `pane` of the cab's glass is at its foot (share 0) or top (share 1), a little proud of the glass.
function cabCorner(pane, share) {
  const angle = (pane / CAB.panes) * 2 * Math.PI;
  const radius = (CAB.bottomRadius + (CAB.topRadius - CAB.bottomRadius) * share) * 1.012;
  return [Math.sin(angle) * radius, CAB.bottom + CAB.height * share, Math.cos(angle) * radius];
}

// White mullions up the cab's corners, its sill and the ring under its roof.
function buildCabFrame() {
  const parts = Array.from({ length: CAB.panes }, (_, pane) =>
    coloured(between(roundedBox(0.22, 1, 0.22, 0.06, { chamfered: true }), cabCorner(pane, 0), cabCorner(pane, 1)), WHITE));
  parts.push(coloured(at(roundedCylinder(CAB.bottomRadius + 0.15, CAB.bottomRadius + 0.15, 0.4, 0.1, 36), 0, CAB.bottom + 0.2, 0), WHITE));
  parts.push(coloured(at(roundedCylinder(CAB.topRadius + 0.1, CAB.topRadius + 0.1, 0.3, 0.1, 36), 0, ROOF.bottom - 0.1, 0), WHITE));
  parts.push(coloured(at(roundedCylinder(4.3, 4.6, ROOF.cap, 0.2, 32), 0, ROOF.bottom + ROOF.sunshade + ROOF.cap / 2, 0), WHITE));
  return parts;
}

// The coral sunshade over the cab and the coral dome on its cap, with the antennas' red tips.
function buildRoofGloss() {
  const capTop = ROOF.bottom + ROOF.sunshade + ROOF.cap;
  const dome = new THREE.SphereGeometry(3.2, 28, 8, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.5, 1);
  return [
    coloured(at(roundedCylinder(GALLERY.radius + 0.3, GALLERY.radius + 0.1, ROOF.sunshade, 0.25, 48), 0, ROOF.bottom + ROOF.sunshade / 2, 0), CORAL),
    coloured(at(dome, 0, capTop, 0), CORAL),
    ...ANTENNAS.map(({ x, z, top }) => coloured(at(new THREE.SphereGeometry(0.16, 10, 8), x, top, z), WARNING_RED)),
  ];
}

// The antennas' masts, each with crossbars.
function buildAntennas() {
  const capTop = ROOF.bottom + ROOF.sunshade + ROOF.cap;
  return ANTENNAS.flatMap(({ x, z, top }) => [
    coloured(at(roundedCylinder(0.07, 0.1, top - capTop, 0.03, 6), x, (top + capTop) / 2, z), STEEL),
    coloured(at(roundedBox(0.08, 0.08, 1.3, 0.03, { chamfered: true }), x, top - 1.2, z), STEEL),
    coloured(at(roundedBox(1.0, 0.08, 0.08, 0.03, { chamfered: true }), x, top - 2, z), STEEL),
  ]);
}

// The cab's glass in flat panes, the stair window, and the window bands round the podium and the service floor.
function buildGlass() {
  const cab = new THREE.CylinderGeometry(CAB.topRadius, CAB.bottomRadius, CAB.height, CAB.panes, 1, true).toNonIndexed();
  cab.computeVertexNormals();
  const stairWindow = between(roundedBox(0.3, 1, 1.0, 0.08, { chamfered: true }), [shaftRadiusAt(6.5), 6.5, 0], [shaftRadiusAt(23.5), 23.5, 0]);
  return [
    coloured(at(indexed(cab), 0, CAB.bottom + CAB.height / 2, 0), DARK_GLASS),
    coloured(stairWindow, SKY_GLASS),
    coloured(at(new THREE.CylinderGeometry(PODIUM.radius + 0.04, PODIUM.radius + 0.04, 1.8, 40, 1, true), 0, 2.9, 0), DARK_GLASS),
    coloured(at(new THREE.CylinderGeometry(SERVICE.radius + 0.02, SERVICE.radius + 0.02, 0.6, 32, 1, true), 0, SERVICE.bottom + 0.85, 0), DARK_GLASS),
  ];
}

// The radar round its own turning axis: a white bar on a grey housing, on a post.
function buildRadar() {
  return [
    coloured(at(roundedCylinder(0.25, 0.3, 0.9, 0.06, 10), 0, 0.45, 0), STEEL),
    coloured(at(roundedCylinder(0.45, 0.45, 0.4, 0.1, 12), 0, 1.05, 0), LIGHT_GREY),
    coloured(at(roundedBox(3.6, 0.55, 0.4, 0.15), 0, 1.5, 0.2), WHITE),
  ];
}
