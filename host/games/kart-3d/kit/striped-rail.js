// The kit's striped rail (M7d2), as at Toad Harbor: two round rails painted in orange and white stripes that wind
// round them, on posts set in a low concrete base, each post with a flange at its foot and a ball on top (M7d3).
// Returns { add(segment, side), end(station, index, side, facing), meshes() } for kit/barriers.js: end closes the
// base, puts a post where the rails start or stop and rounds off the rails' ends.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { createCanvas, repeatingTexture } from '../canvas-texture.js';
import { at, mergeShapes } from '../shape-utils.js';

// [outward, lift] (see kit/extrude.js): the base, and a rail as an eight-sided tube round its middle.
const BASE = [[0, 0], [0, 0.42], [0.08, 0.48], [0.4, 0.48], [0.48, 0.42], [0.48, 0]];
const RAIL_RADIUS = 0.11;
const RAIL_OUT = 0.24;
const RAIL_LIFTS = [0.72, 1.02];
// A stripe winds once round a rail every this many units along it.
const STRIPE_LENGTH = 0.9;
const POST_STATIONS = 3;

export function createStripedRail({ keep, textures }) {
  const base = createStripBuilder();
  const rails = createStripBuilder();
  const posts = [];
  const railEnds = [];
  const postAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * RAIL_OUT, 0, facingAlong(station));
  const tubes = RAIL_LIFTS.map((lift) => tubeProfile(RAIL_OUT, lift));
  const circumference = 2 * Math.PI * RAIL_RADIUS;
  return {
    add(segment, side) {
      extrudeSegment(base, segment, side, BASE, 0xc8c2b8);
      for (const tube of tubes) {
        extrudeSegment(rails, segment, side, tube, 0xffffff, (around, s) => [around / circumference, s / STRIPE_LENGTH]);
      }
      if (segment.index % POST_STATIONS === 0) {
        posts.push(postAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      capProfile(base, station, side, BASE, 0xc8c2b8, facing);
      if (facing > 0 || index % POST_STATIONS !== 0) {
        posts.push(postAt(station, side));
      }
      for (const lift of RAIL_LIFTS) {
        railEnds.push(frameAt(station, edgeLateral(station, side) + side * RAIL_OUT, lift, facingAlong(station)));
      }
    },
    meshes() {
      const concrete = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, roughness: 0.85 }));
      const painted = keep(new THREE.MeshStandardMaterial({ map: keep(drawStripes()), roughness: 0.55 }));
      const postShape = keep(
        mergeShapes([
          at(new THREE.CylinderGeometry(0.05, 0.05, 0.66, 8), 0, 0.81, 0),
          at(new THREE.CylinderGeometry(0.09, 0.1, 0.05, 8), 0, 0.5, 0),
          at(new THREE.SphereGeometry(0.075, 8, 6), 0, 1.16, 0),
        ]),
      );
      const steel = keep(new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.4, metalness: 0.6 }));
      const railEnd = keep(new THREE.SphereGeometry(RAIL_RADIUS * 1.15, 10, 8));
      return [
        withShadows(new THREE.Mesh(keep(base.build()), concrete)),
        withShadows(new THREE.Mesh(keep(rails.build()), painted)),
        placeInstances(postShape, steel, posts),
        placeInstances(railEnd, steel, railEnds),
      ];
    },
  };
}

// An eight-sided ring round (out, lift), closed, listed so its faces point out of it.
function tubeProfile(out, lift) {
  return Array.from({ length: 9 }, (_, index) => {
    const angle = Math.PI + (-index * 2 * Math.PI) / 8;
    return [out + Math.cos(angle) * RAIL_RADIUS, lift + Math.sin(angle) * RAIL_RADIUS];
  });
}

// Orange and white stripes on the diagonal, one of each per tile, so on a tube they wind round it.
function drawStripes() {
  const size = 64;
  const { canvas, context } = createCanvas(size, size);
  context.fillStyle = '#f4f2ec';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#ff7a1a';
  for (const offset of [-size, 0]) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + size / 2, 0);
    context.lineTo(offset + size * 1.5, size);
    context.lineTo(offset + size, size);
    context.fill();
  }
  return repeatingTexture(canvas);
}
