// The kit's steel trusses (M7d3), as under MK8DX's sky roads (Mario Circuit, Cloudtop Cruise): lattice towers from
// the sea up to the road, four legs tied by rings and crossed braces, and lattice girders (a Warren truss) under
// both edges of the road between them. Each comes out as one merged geometry of thin beams, coloured per vertex.
// Used by kit/supports.js.

import * as THREE from 'three';
import { between, coloured, mergeShapes } from '../shape-utils.js';
import { addScaled } from '../vector.js';
import { ROAD_THICKNESS } from './road.js';

const LEG = 0.32;
const BRACE = 0.16;
const LEG_COLOR = 0xf0f2f4;
const BRACE_COLOR = 0xc9ced6;
// A tower's legs stand this share of the road's half width out, and this far before and after the station.
const LEG_REACH = 0.7;
const LEG_DEPTH = 1.2;
// Rings tie the legs about this far apart, up from the sea.
const RING_SPACING = 4;
// A girder is this deep, and its diagonals cross it every this many stations.
const GIRDER_DEPTH = 1.8;
const GIRDER_STEP = 3;
// It runs under the road this far in from the edge of the ground.
const GIRDER_INSET = 0.4;

// A thin square beam from `from` to `to` ({ x, y, z } each).
function beam(from, to, width, hex) {
  return coloured(between(new THREE.BoxGeometry(width, 1, width), [from.x, from.y, from.z], [to.x, to.y, to.z]), hex);
}

// One geometry holding a tower under each of `stations`, from the sea (`seaLevel`) to the road's underside.
export function buildTrussTowers(stations, seaLevel) {
  const beams = stations.flatMap((station) => towerBeams(station, seaLevel));
  return mergeShapes(beams);
}

function towerBeams(station, seaLevel) {
  const lateral = station.halfWidth * LEG_REACH;
  // The four legs' tops, round the tower in order, under the road.
  const tops = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([side, along]) => {
    const onRoad = addScaled(addScaled(station.point, station.right, side * lateral), station.tangent, along * LEG_DEPTH);
    return addScaled(onRoad, station.normal, -ROAD_THICKNESS);
  });
  const lowestTop = Math.min(...tops.map((top) => top.y));
  const rings = Math.max(1, Math.floor((lowestTop - seaLevel) / RING_SPACING));
  const heights = Array.from({ length: rings + 1 }, (_, ring) => seaLevel + ((lowestTop - 0.3 - seaLevel) * ring) / rings);
  const beams = tops.map((top) => beam({ x: top.x, y: seaLevel, z: top.z }, top, LEG, LEG_COLOR));
  const legAt = (leg, y) => ({ x: tops[leg].x, y, z: tops[leg].z });
  heights.forEach((y, ring) => {
    for (let leg = 0; leg < 4; leg += 1) {
      const next = (leg + 1) % 4;
      if (ring > 0) {
        beams.push(beam(legAt(leg, y), legAt(next, y), BRACE, BRACE_COLOR));
        // Crossed braces on each face, between this ring and the one below.
        const below = heights[ring - 1];
        beams.push(beam(legAt(leg, below), legAt(next, y), BRACE, BRACE_COLOR), beam(legAt(next, below), legAt(leg, y), BRACE, BRACE_COLOR));
      }
    }
  });
  return beams;
}

// One geometry holding a girder under each edge of the road along each of `runs` ([{ fromS, toS }]): top and
// bottom chords, a post at every step and a diagonal across each, zigzagging, and a tie across the road under it.
export function buildGirders(track, runs) {
  const beams = [];
  for (const run of runs) {
    const stations = track.stations.filter((station, index) => station.s >= run.fromS && station.s < run.toS && index % GIRDER_STEP === 0);
    stations.forEach((station, step) => {
      const next = stations[step + 1];
      const corners = (at) => [-1, 1].map((side) => girderCorners(at, side));
      if (station.gap) {
        return;
      }
      const here = corners(station);
      here.forEach(({ top, bottom }) => beams.push(beam(top, bottom, BRACE, BRACE_COLOR)));
      if (step % 2 === 0) {
        beams.push(beam(here[0].bottom, here[1].bottom, BRACE, BRACE_COLOR));
      }
      if (!next || next.gap) {
        return;
      }
      corners(next).forEach(({ top, bottom }, sideIndex) => {
        const from = here[sideIndex];
        beams.push(beam(from.top, top, LEG * 0.8, LEG_COLOR), beam(from.bottom, bottom, LEG * 0.8, LEG_COLOR));
        beams.push(step % 2 === 0 ? beam(from.top, bottom, BRACE, BRACE_COLOR) : beam(from.bottom, top, BRACE, BRACE_COLOR));
      });
    });
  }
  return mergeShapes(beams);
}

// A girder's top (under the road's edge) and bottom corners at `station` on `side`.
function girderCorners(station, side) {
  const edge = station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft) - GIRDER_INSET;
  const top = addScaled(addScaled(station.point, station.right, side * edge), station.normal, -ROAD_THICKNESS);
  return { top, bottom: addScaled(top, station.normal, -GIRDER_DEPTH) };
}
