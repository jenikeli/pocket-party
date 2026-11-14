// The kit's plainest barriers (M7d2): a concrete wall shaped like a road barrier (wide at the foot, its inner face
// leaning back), painted in blue and white panels along its top half, for any wall a course gives no other
// style; and the anti-gravity sections' wall, white metal with a glowing cyan line along it. Since M7d4 both are
// built up as the reference game's are (docs/kart-reference.md, "The kit's objects up close"): rounded edges, a coping or a
// rounded rail along the top, a darker foot, seams between panels (and rivets beside the metal wall's), and
// relief in the concrete. Each returns { add(segment, side), end(station, index, side, facing), meshes() } for
// kit/barriers.js: end closes the wall's cross-section where it starts or stops.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile, roundProfile, offsetProfile, stationBetween } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';

// [outward, lift] round the wall's cross-section (see kit/extrude.js), in parts: the dark foot where it meets
// the ledge, the bare concrete above it, the painted top half and the coping along the top.
const FOOT = [[0, 0], [0, 0.08]];
const BARE = [[0, 0.08], [0, 0.22], [0.14, 0.55]];
const PAINTED = roundProfile([[0.14, 0.55], [0.2, 1.06], [0.52, 1.06], [0.75, 0]], 0.05);
const COPING = roundProfile([[0.12, 1.02], [0.12, 1.14], [0.56, 1.14], [0.56, 1.02]], 0.04);
const OUTLINE = [[0, 0], [0, 0.22], [0.14, 0.55], [0.2, 1.06], [0.12, 1.06], [0.12, 1.14], [0.56, 1.14], [0.56, 1.06], [0.52, 1.06], [0.75, 0]];
const CONCRETE = 0xd8d4cc;
const FOOT_COLOR = 0x9a968e;
const COPING_COLOR = 0xe8e4dc;
const PANEL_STATIONS = 6;
const PANEL_COLORS = [0x2f7fe8, 0xf4f4f0];
// A seam between panels: a dark band this wide, standing a hair proud of the wall's faces.
const SEAM = { width: 0.05, raise: 0.006, color: 0x55524c };
const ANTI_GRAVITY_WALL = roundProfile([[0, 0], [0, 0.8], [0.3, 0.8], [0.3, 0]], 0.04);
const ANTI_GRAVITY_FOOT = [[-0.005, 0], [-0.005, 0.1]];
const ANTI_GRAVITY_CAP = roundProfile([[-0.04, 0.78], [-0.04, 0.92], [0.34, 0.92], [0.34, 0.78], [-0.04, 0.78]], 0.05, 2);
const ANTI_GRAVITY_LINE = [[-0.01, 0.56], [-0.01, 0.68]];
const ANTI_GRAVITY_STATIONS = 3;
const GLOW_BRIGHTNESS = 2.5;
// Rivets down the metal wall's face either side of each seam, at these heights.
const RIVET_LIFTS = [0.2, 0.4, 0.74];

export function createPlainWall({ keep, textures }) {
  const builder = createStripBuilder();
  return {
    add(segment, side) {
      extrudeSegment(builder, segment, side, FOOT, FOOT_COLOR);
      extrudeSegment(builder, segment, side, BARE, CONCRETE);
      extrudeSegment(builder, segment, side, PAINTED, PANEL_COLORS[Math.floor(segment.index / PANEL_STATIONS) % 2], { smooth: true });
      extrudeSegment(builder, segment, side, COPING, COPING_COLOR, { smooth: true });
      if (segment.index % PANEL_STATIONS === 0) {
        const span = [0, SEAM.width / segment.station.segmentLength];
        extrudeSegment(builder, segment, side, offsetProfile([...BARE, ...PAINTED.slice(1)], SEAM.raise), SEAM.color, { span });
      }
    },
    end(station, index, side, facing) {
      capProfile(builder, station, side, OUTLINE, CONCRETE, facing);
    },
    meshes() {
      const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.8 }));
      return [withShadows(new THREE.Mesh(keep(builder.build()), material))];
    },
  };
}

export function createAntiGravityWall({ keep }) {
  const wall = createStripBuilder();
  const glow = createStripBuilder(GLOW_BRIGHTNESS);
  const rivets = [];
  return {
    add(segment, side) {
      extrudeSegment(wall, segment, side, ANTI_GRAVITY_WALL, 0xeef2f8, { smooth: true });
      extrudeSegment(wall, segment, side, ANTI_GRAVITY_FOOT, 0x6c7480);
      extrudeSegment(wall, segment, side, ANTI_GRAVITY_CAP, 0xb8c2d0, { smooth: true });
      extrudeSegment(glow, segment, side, ANTI_GRAVITY_LINE, 0x3fd8ff);
      if (segment.index % ANTI_GRAVITY_STATIONS === 0) {
        const span = [0, 0.04 / segment.station.segmentLength];
        extrudeSegment(wall, segment, side, offsetProfile(ANTI_GRAVITY_WALL, 0.004), 0x8a94a2, { span });
        for (const share of [0.12, 1 - 0.12]) {
          const at = stationBetween(segment, share);
          for (const lift of RIVET_LIFTS) {
            rivets.push(frameAt(at, edgeLateral(at, side) - side * 0.005, lift, facingAlong(at)));
          }
        }
      }
    },
    end(station, index, side, facing) {
      capProfile(wall, station, side, ANTI_GRAVITY_WALL, 0xeef2f8, facing);
      capProfile(wall, station, side, ANTI_GRAVITY_CAP, 0xb8c2d0, facing);
    },
    meshes() {
      const metal = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3 }));
      const lit = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
      // A flattened ball half sunk in the wall's face, so it shows on either side: too small for a shadow worth
      // drawing.
      const rivet = keep(new THREE.SphereGeometry(0.03, 6, 4).scale(0.5, 1, 1));
      const rivetHeads = placeInstances(rivet, keep(new THREE.MeshStandardMaterial({ color: 0xa8b0bc, roughness: 0.35, metalness: 0.6 })), rivets);
      rivetHeads.castShadow = false;
      return [withShadows(new THREE.Mesh(keep(wall.build()), metal)), new THREE.Mesh(keep(glow.build()), lit), rivetHeads];
    },
  };
}
