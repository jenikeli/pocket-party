// The kit road's paint (M7d2): the edge lines, raised red and white curbs on the inside of corners, the dashed
// middle line on straights, the grid's brackets and the start line's checks, all in worn paint that shows the
// asphalt through it; and in anti-gravity sections, glowing cyan lines along the edges and down the middle
// instead. Where each goes comes from kit/road-marks.js; the colours from the course's theme. Used by
// kit/road.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { addRoadRect } from './road-rects.js';
import { curbSpots, middleDashes, gridBrackets, startLineChecks, EDGE_LINE_INSET, EDGE_LINE_WIDTH, CURB_WIDTH } from './road-marks.js';
import { createPaintTexture } from './road-textures.js';

// How high a curb stands, and how far its sloped inner edge reaches across it.
const CURB_HEIGHT = 0.06;
const CURB_SLOPE = 0.2;
// Curb stripes and the anti-gravity middle line's dashes, this many stations each.
const STRIPE_STATIONS = 2;
const GLOW_DASH_STATIONS = 3;
const GLOW_LIFT = 0.02;
const GLOW_BRIGHTNESS = 2.5;
const GLOW_LINE_WIDTH = 0.3;
const ANTI_GRAVITY_LINE = 0x3fd8ff;
// No edge lines this close to the start line, where its checks are.
const START_LINE_CLEARANCE = 1.5;

// `theme` is the course's { edgeLine, curb: [first, second], checks: [light, dark] } colours. Returns
// { meshes, dispose() }: the paint (lit, in worn paint) and the anti-gravity lines (unlit, brighter than white,
// so they glow on the High quality setting).
export function buildRoadPaint(track, theme) {
  const paint = createStripBuilder();
  const glow = createStripBuilder(GLOW_BRIGHTNESS);
  const curbs = new Map(curbSpots(track).map((spot) => [spot.index, spot.side]));
  track.stations.forEach((station, index) => {
    if (station.gap) {
      return;
    }
    const segment = { station, next: track.stations[(index + 1) % track.stations.length], index };
    if (station.antiGravity) {
      addGlowLines(glow, segment);
      return;
    }
    // The start line's checks run across the whole road, over where the edge lines would be.
    if (Math.abs(station.s - track.startLine) > START_LINE_CLEARANCE) {
      addEdgeLines(paint, segment, theme.edgeLine);
    }
    if (curbs.has(index)) {
      addCurb(paint, segment, curbs.get(index), theme.curb[Math.floor(index / STRIPE_STATIONS) % 2]);
    }
  });
  for (const rect of [...middleDashes(track), ...gridBrackets(track)]) {
    addRoadRect(paint, track, rect, 0, 0xf4f4f0);
  }
  for (const check of startLineChecks(track)) {
    addRoadRect(paint, track, check, 0, check.dark ? theme.checks[1] : theme.checks[0]);
  }
  const texture = createPaintTexture();
  const paintMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: texture, roughness: 0.6 });
  // Paint lies on the asphalt (the curbs stand on it), so it is pulled toward the camera a little to win where
  // the two meet.
  Object.assign(paintMaterial, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const paintMesh = new THREE.Mesh(paint.build(), paintMaterial);
  paintMesh.receiveShadow = true;
  const glowMesh = new THREE.Mesh(glow.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  function dispose() {
    for (const mesh of [paintMesh, glowMesh]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    texture.dispose();
  }
  return { meshes: [paintMesh, glowMesh], dispose };
}

const up = (station) => station.normal;

// A solid line EDGE_LINE_INSET in from each edge. Each strip runs from its left edge to its right one, so it
// faces up.
function addEdgeLines(builder, segment, hex) {
  const inner = (station) => station.halfWidth - EDGE_LINE_INSET - EDGE_LINE_WIDTH;
  const outer = (station) => station.halfWidth - EDGE_LINE_INSET;
  builder.strip(segment, (station) => -outer(station), 0, (station) => -inner(station), 0, up, hex);
  builder.strip(segment, inner, 0, outer, 0, up, hex);
}

// A curb on `side` (-1 left, 1 right) filling the road outside the edge line: a slope up from the road, a flat
// top, and a face down to the road's level at the outer edge.
function addCurb(builder, segment, side, hex) {
  const at = (inward) => (station) => side * (station.halfWidth - inward);
  const outward = (station) => ({ x: station.right.x * side, y: station.right.y * side, z: station.right.z * side });
  const [inner, top, edge] = [at(CURB_WIDTH), at(CURB_WIDTH - CURB_SLOPE), at(0)];
  if (side > 0) {
    builder.strip(segment, inner, 0, top, CURB_HEIGHT, up, hex);
    builder.strip(segment, top, CURB_HEIGHT, edge, CURB_HEIGHT, up, hex);
    builder.strip(segment, edge, CURB_HEIGHT, edge, 0, outward, hex);
  } else {
    builder.strip(segment, top, CURB_HEIGHT, inner, 0, up, hex);
    builder.strip(segment, edge, CURB_HEIGHT, top, CURB_HEIGHT, up, hex);
    builder.strip(segment, edge, 0, edge, CURB_HEIGHT, outward, hex);
  }
}

// Anti-gravity road: a glowing line where each edge line would be, and dashes down the middle.
function addGlowLines(builder, segment) {
  const inner = (station) => station.halfWidth - EDGE_LINE_INSET - GLOW_LINE_WIDTH;
  const outer = (station) => station.halfWidth - EDGE_LINE_INSET;
  builder.strip(segment, (station) => -outer(station), GLOW_LIFT, (station) => -inner(station), GLOW_LIFT, up, ANTI_GRAVITY_LINE);
  builder.strip(segment, inner, GLOW_LIFT, outer, GLOW_LIFT, up, ANTI_GRAVITY_LINE);
  if (Math.floor(segment.index / GLOW_DASH_STATIONS) % 2 === 0) {
    builder.strip(segment, () => -GLOW_LINE_WIDTH / 2, GLOW_LIFT, () => GLOW_LINE_WIDTH / 2, GLOW_LIFT, up, ANTI_GRAVITY_LINE);
  }
}
