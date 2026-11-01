// The beach parasol (M7d4c4), shaped to the study's notes: a domed canopy of eight panels in turn, a scalloped
// fringe round its rim, ribs under it, and a wooden pole with a joint and a foot. One geometry coloured per
// vertex, standing on y = 0. Used by kit/beach-props.js.

import * as THREE from 'three';
import { extruded } from './extruded.js';
import { at, between, coloured, mergeShapes, roundedCylinder } from '../shape-utils.js';

const WHITE = 0xf6f4ee;
const WOOD = 0xb58a5a;
const PANEL_COUNT = 8;
const DOME_RADIUS = 1.62;
const DOME_HEIGHT = DOME_RADIUS * 0.45;
const TIP = [0.25, 2.6, 0];
// The dome is a sphere cap DOME_HEIGHT tall whose top is the tip; it ends at angle RIM_THETA, RIM_RADIUS from the pole.
const RIM_THETA = 1.1;
const RIM_RADIUS = DOME_RADIUS * Math.sin(RIM_THETA);
const DOME_CENTRE = TIP[1] - DOME_HEIGHT;

// A sector of the canopy's dome: a flattened sphere cap, `panel` of eight round the pole.
function domePanel(panel, scale) {
  const sphere = new THREE.SphereGeometry(DOME_RADIUS * scale, 6, 4, (panel / PANEL_COUNT) * 2 * Math.PI, (2 * Math.PI) / PANEL_COUNT, 0, RIM_THETA);
  return sphere.scale(1, 0.45, 1);
}

// The same geometry turned inside out (triangles reversed, normals flipped), so a dome seen from below shows a
// face: the material draws one side only.
function insideOut(geometry) {
  const index = geometry.index.array;
  for (let corner = 0; corner < index.length; corner += 3) {
    [index[corner + 1], index[corner + 2]] = [index[corner + 2], index[corner + 1]];
  }
  const normal = geometry.attributes.normal;
  for (let vertex = 0; vertex < normal.count; vertex += 1) {
    normal.setXYZ(vertex, -normal.getX(vertex), -normal.getY(vertex), -normal.getZ(vertex));
  }
  return geometry;
}

// A point on the dome at angle `phi` round the pole and `theta` down from its top, as Three.js's sphere places
// it, `drop` below the surface.
function domePoint(phi, theta, drop = 0) {
  const radius = DOME_RADIUS * Math.sin(theta);
  return [TIP[0] - Math.cos(phi) * radius, DOME_CENTRE + DOME_HEIGHT * Math.cos(theta) - drop, TIP[2] + Math.sin(phi) * radius];
}

// One scallop: a flat tab with a round lower edge, hung from the rim under panel `panel` and tilted out with the dome.
function scallop(panel) {
  const half = RIM_RADIUS * Math.sin(Math.PI / PANEL_COUNT) * 0.98;
  const outline = new THREE.Shape();
  outline.moveTo(-half, 0.02);
  outline.lineTo(half, 0.02);
  outline.absarc(0, 0.02, half, 0, -Math.PI, true);
  const tab = extruded(outline, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
  tab.translate(0, 0, -0.01).rotateX(-0.1);
  const phi = ((panel + 0.5) / PANEL_COUNT) * 2 * Math.PI;
  const [x, y, z] = domePoint(phi, RIM_THETA);
  return tab.rotateY(Math.atan2(x - TIP[0], z - TIP[2])).translate(x, y, z);
}

function canopy(colors) {
  const parts = [];
  for (let panel = 0; panel < PANEL_COUNT; panel += 1) {
    const color = colors[panel % 2];
    parts.push(coloured(at(domePanel(panel, 1), TIP[0], DOME_CENTRE, TIP[2]), color));
    parts.push(coloured(at(insideOut(domePanel(panel, 0.985)), TIP[0], DOME_CENTRE, TIP[2]), 0xe4dccb));
    parts.push(coloured(scallop(panel), color));
  }
  return parts;
}

// Ribs run down the dome's underside along each panel's edge in two lengths, meeting at a collar by the pole.
function ribs() {
  const struts = [];
  for (let panel = 0; panel < PANEL_COUNT; panel += 1) {
    const phi = (panel / PANEL_COUNT) * 2 * Math.PI;
    const points = [0.12, 0.6, RIM_THETA].map((theta) => domePoint(phi, theta, 0.04));
    struts.push(coloured(between(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), points[0], points[1]), WOOD));
    struts.push(coloured(between(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), points[1], points[2]), WOOD));
  }
  return [...struts, coloured(at(roundedCylinder(0.07, 0.07, 0.1, 0.02, 8), TIP[0], TIP[1] - 0.1, TIP[2]), 0x8a6a44)];
}

// A pole in two sections with a joint between, a finial on top and a round foot.
function pole() {
  const joint = [TIP[0] * 0.5, TIP[1] * 0.5, 0];
  return [
    coloured(between(new THREE.CylinderGeometry(0.04, 0.05, 1, 8), [0, 0.1, 0], joint), WHITE),
    coloured(between(new THREE.CylinderGeometry(0.03, 0.04, 1, 8), joint, TIP), WHITE),
    coloured(at(roundedCylinder(0.07, 0.07, 0.12, 0.025, 8), ...joint), 0x8a8a8e),
    coloured(at(new THREE.SphereGeometry(0.07, 8, 6), TIP[0], TIP[1] + 0.02, TIP[2]), WOOD),
    coloured(at(roundedCylinder(0.2, 0.24, 0.1, 0.04, 10), 0, 0.05, 0), 0x8a8a8e),
  ];
}

export function parasolShape(colors) {
  return mergeShapes([...canopy(colors), ...ribs(), ...pole()]);
}
