// The kit's plainest barriers (M7d2): a concrete wall shaped like a road barrier (wide at the foot, its inner face
// leaning back), painted in blue and white panels along its top half, for any wall a course gives no other
// style; and the anti-gravity sections' wall, white metal with a glowing cyan line along it. Each returns
// { add(segment, side), end(station, index, side, facing), meshes() } for kit/barriers.js: end closes the wall's
// cross-section where it starts or stops.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile } from './extrude.js';
import { withShadows } from './frames.js';

// [outward, lift] round the wall's cross-section (see kit/extrude.js), in two parts: the bare foot, and the
// painted top half.
const FOOT = [[0, 0], [0, 0.22], [0.14, 0.55]];
const PAINTED = [[0.14, 0.55], [0.2, 1.1], [0.5, 1.1], [0.75, 0]];
const OUTLINE = [...FOOT, ...PAINTED.slice(1)];
const CONCRETE = 0xd8d4cc;
const PANEL_STATIONS = 6;
const PANEL_COLORS = [0x2f7fe8, 0xf4f4f0];
const ANTI_GRAVITY_WALL = [[0, 0], [0, 0.9], [0.3, 0.9], [0.3, 0]];
const ANTI_GRAVITY_LINE = [[-0.01, 0.6], [-0.01, 0.72]];
const GLOW_BRIGHTNESS = 2.5;

export function createPlainWall({ keep, textures }) {
  const builder = createStripBuilder();
  return {
    add(segment, side) {
      extrudeSegment(builder, segment, side, FOOT, CONCRETE);
      extrudeSegment(builder, segment, side, PAINTED, PANEL_COLORS[Math.floor(segment.index / PANEL_STATIONS) % 2]);
    },
    end(station, index, side, facing) {
      capProfile(builder, station, side, OUTLINE, CONCRETE, facing);
    },
    meshes() {
      const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, roughness: 0.8 }));
      return [withShadows(new THREE.Mesh(keep(builder.build()), material))];
    },
  };
}

export function createAntiGravityWall({ keep }) {
  const wall = createStripBuilder();
  const glow = createStripBuilder(GLOW_BRIGHTNESS);
  return {
    add(segment, side) {
      extrudeSegment(wall, segment, side, ANTI_GRAVITY_WALL, 0xeef2f8);
      extrudeSegment(glow, segment, side, ANTI_GRAVITY_LINE, 0x3fd8ff);
    },
    end(station, index, side, facing) {
      capProfile(wall, station, side, ANTI_GRAVITY_WALL, 0xeef2f8, facing);
    },
    meshes() {
      const metal = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3 }));
      const lit = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
      return [withShadows(new THREE.Mesh(keep(wall.build()), metal)), new THREE.Mesh(keep(glow.build()), lit)];
    },
  };
}
