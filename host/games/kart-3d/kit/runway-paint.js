// The airfield's paint (M9, Palm Bay Airport), in the worn paint of the kit's road: on the runway its edge lines,
// a bold dashed centre line (laid over the road's own middle dashes, so they read as one), threshold bars and its
// number at each end ("09" at the west end, "27" at the east), aiming and touchdown bars; yellow taxi lines on the
// apron and the taxiway's tarmac; and hold-short bars where a taxiway meets the runway (on the link from the
// taxiway, and across the road where it turns onto the runway). Lies just over the ground and the road. Used by
// airport-scenery.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { createPaintTexture } from './road-textures.js';
import { addRoadRect } from './road-rects.js';
import { middleDashes } from './road-marks.js';
import { pointAt, stationIndexAt } from '../track.js';
import { RUNWAY } from '../airport-ground.js';

const WHITE = 0xf4f4f0;
const YELLOW = 0xf2c018;
const LIFT = 0.015;
const LINE = 0.3;
// The runway's marks, in units along it (x) and across it (z, from its middle line).
const EDGE_INSET = 0.8;
const EDGE_WIDTH = 0.6;
const CENTRE_WIDTH = 0.9;
const CENTRE_PERIOD = 7;
const THRESHOLD = Object.freeze({ length: 10, width: 0.9, spacing: 1.6, count: 8, inset: 2, from: 1.8 });
// Each end: where its threshold bars start (x, at the runway's end side), which way the runway runs from it
// (+1 east), and its number (the digit on the left of a plane landing there first).
const ENDS = [
  { x: 194, way: 1, digits: [0, 9] },
  { x: 556, way: -1, digits: [2, 7] },
];
// The number's digits: each cell this wide and this long, the two digits this far apart (wide enough for the dash
// panel before the glide ramp to lie between them), starting this far from the end.
const DIGIT = Object.freeze({ cell: 1.4, row: 1.5, gap: 4.4, from: 19.5 });
// Aiming bars and touchdown bars this far from each end's threshold.
const AIMING = Object.freeze({ from: 46, length: 12, width: 2, lateral: 7 });
const TOUCHDOWN = Object.freeze({ from: 31, length: 6, width: 0.7, lateral: [5, 6.2, 7.4] });
// Digits in a 3 by 5 block font, rows from the top.
const FONT = {
  0: ['111', '101', '101', '101', '111'],
  2: ['111', '001', '111', '100', '111'],
  7: ['111', '001', '001', '001', '001'],
  9: ['111', '101', '111', '001', '111'],
};
// Taxi lines on the paving: [[x, z], ...] each, and the hold-short bars where the link from the taxiway meets the
// runway's paving ({ fromX, toX, z }: across x, the runway lying +z), and on the road where it turns onto the
// runway (at this distance along the lap).
const TAXI_LINES = [
  [[-56, -36], [264, -36]],
  ...[10, 70, 130, 190].map((x) => [[x - 14, -36], [x, -50], [x, -112]]),
  [[208, 96], [296, 96]],
  ...[236, 276].map((x) => [[x - 12, 96], [x, 84], [x, 52]]),
  [[260, 96], [260, 108]],
  [[260, 132], [260, 221]],
];
const HOLD_SHORT = Object.freeze({ fromX: 249, toX: 271, z: 212 });
const ROAD_HOLD_SHORT_S = 893;

// Adds the paint to `kit.world` (kit/kit.js).
export function buildRunwayPaint({ world, track, keep }) {
  const builder = createStripBuilder();
  const flat = (fromX, toX, fromZ, toZ, hex) => addFlat(builder, Math.min(fromX, toX), Math.max(fromX, toX), Math.min(fromZ, toZ), Math.max(fromZ, toZ), hex);
  addRunway(flat, track);
  for (const line of TAXI_LINES) {
    line.slice(1).forEach((point, index) => addLine(builder, line[index], point, YELLOW));
  }
  holdShortBars().forEach(({ from, to, solid }) => {
    const { fromX, toX, z } = HOLD_SHORT;
    const dashes = solid ? [[fromX, toX]] : dashesBetween(fromX, toX);
    dashes.forEach(([dashFrom, dashTo]) => flat(dashFrom, dashTo, z + from, z + to, YELLOW));
  });
  // Across the road between its edge lines.
  const reach = track.stations[stationIndexAt(track, ROAD_HOLD_SHORT_S)].halfWidth - 1;
  holdShortBars().forEach(({ from, to, solid }) => {
    const dashes = solid ? [[-reach, reach]] : dashesBetween(-reach, reach);
    dashes.forEach(([fromLateral, toLateral]) => addRoadRect(builder, track, { fromS: ROAD_HOLD_SHORT_S + from, toS: ROAD_HOLD_SHORT_S + to, fromLateral, toLateral }, LIFT, YELLOW));
  });
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: keep(createPaintTexture()), roughness: 0.6 }));
  Object.assign(material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(keep(builder.build()), material);
  mesh.receiveShadow = true;
  world.add(mesh);
}

// The runway's marks; `flat(fromX, toX, fromZ, toZ, hex)` lays a rectangle.
function addRunway(flat, track) {
  const { fromX, toX, z, halfWidth } = RUNWAY;
  for (const side of [-1, 1]) {
    flat(fromX + 2, toX - 2, z + side * (halfWidth - EDGE_INSET), z + side * (halfWidth - EDGE_INSET - EDGE_WIDTH), WHITE);
  }
  const centreDashes = runwayRoadDashes(track);
  const eastmost = Math.max(...centreDashes.map(([, dashTo]) => dashTo));
  for (let x = eastmost + CENTRE_PERIOD - 4.5; x < ENDS[1].x - THRESHOLD.length - 30; x += CENTRE_PERIOD) {
    centreDashes.push([x, x + 4.5]);
  }
  centreDashes.forEach(([dashFrom, dashTo]) => flat(dashFrom, dashTo, z - CENTRE_WIDTH / 2, z + CENTRE_WIDTH / 2, WHITE));
  for (const end of ENDS) {
    const along = (distance) => end.x + end.way * distance;
    for (let bar = 0; bar < THRESHOLD.count; bar += 1) {
      for (const side of [-1, 1]) {
        const lateral = THRESHOLD.from + bar * THRESHOLD.spacing;
        flat(along(0), along(THRESHOLD.length), z + side * lateral, z + side * (lateral + THRESHOLD.width), WHITE);
      }
    }
    addNumber(flat, end, along(DIGIT.from));
    for (const side of [-1, 1]) {
      flat(along(AIMING.from), along(AIMING.from + AIMING.length), z + side * AIMING.lateral, z + side * (AIMING.lateral + AIMING.width), WHITE);
      for (const lateral of TOUCHDOWN.lateral) {
        flat(along(TOUCHDOWN.from), along(TOUCHDOWN.from + TOUCHDOWN.length), z + side * lateral, z + side * (lateral + TOUCHDOWN.width), WHITE);
      }
    }
  }
}

// The road's own middle dashes along the runway, as x ranges each made a little longer, so the runway's bolder
// dashes cover them.
function runwayRoadDashes(track) {
  const xAt = (s) => pointAt(track, s).position.x;
  const onRunway = (s) => Math.abs(pointAt(track, s).position.z - RUNWAY.z) < 0.5 && xAt(s) > ENDS[0].x + THRESHOLD.length;
  return middleDashes(track)
    .filter((dash) => onRunway(dash.fromS) && onRunway(dash.toS))
    .map((dash) => [Math.min(xAt(dash.fromS), xAt(dash.toS)) - 0.75, Math.max(xAt(dash.fromS), xAt(dash.toS)) + 0.75]);
}

// The end's number, its digits' bottoms toward the end, read by a plane landing there: its first digit on that
// plane's left. Starts `at` (x) and runs on along the runway.
function addNumber(flat, end, at) {
  const { cell, row, gap } = DIGIT;
  // Facing along +x a plane's left is -z; facing along -x it is +z.
  const leftward = -end.way;
  end.digits.forEach((digit, place) => {
    // The digit's left edge, across, from the middle line.
    const leftEdge = place === 0 ? leftward * (gap / 2 + 3 * cell) : leftward * -(gap / 2);
    FONT[digit].forEach((cells, fromTop) => {
      [...cells].forEach((lit, column) => {
        if (lit === '1') {
          const across = leftEdge - leftward * column * cell;
          const bottom = at + end.way * (4 - fromTop) * row;
          flat(bottom, bottom + end.way * row, RUNWAY.z + across, RUNWAY.z + across - leftward * cell, WHITE);
        }
      });
    });
  });
}

// A hold-short marking's four lines, across the way in: two solid on the taxiway's side, two dashed on the
// runway's. { from, to } are distances toward the runway, solid true or false.
function holdShortBars() {
  return [0, 0.6, 1.5, 2.1].map((from, index) => ({ from, to: from + LINE, solid: index < 2 }));
}

// Dashes 1 long with 1 between them from `from` to `to`, as [from, to] pairs.
function dashesBetween(from, to) {
  const dashes = [];
  for (let at = from; at + 1 <= to; at += 2) {
    dashes.push([at, at + 1]);
  }
  return dashes;
}

// A line LINE wide on the ground from `from` to `to` ([x, z] each).
function addLine(builder, from, to, hex) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const across = [((to[1] - from[1]) / length) * (LINE / 2), (-(to[0] - from[0]) / length) * (LINE / 2)];
  const corners = [[from, 1], [from, -1], [to, 1], [to, -1]].map(([[x, z], side]) => flatCorner(x + across[0] * side, z + across[1] * side));
  builder.quad(corners, hex);
}

// A rectangle on the ground between fromX and toX, fromZ and toZ.
function addFlat(builder, fromX, toX, fromZ, toZ, hex) {
  builder.quad([flatCorner(fromX, fromZ), flatCorner(fromX, toZ), flatCorner(toX, fromZ), flatCorner(toX, toZ)], hex);
}

function flatCorner(x, z) {
  return { point: { x, y: LIFT, z }, normal: { x: 0, y: 1, z: 0 }, uv: [x / 8, z / 8] };
}
