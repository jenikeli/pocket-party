// The kit's striped rail (M7d2), as at Toad Harbor: two rails painted in orange and white stripes that wind round
// them, on a low concrete kerb. Since M7d4 built as Toad Harbor's is (docs/mk8dx-reference.md, "The kit's objects
// up close"): fat rails, oval rather than round, held every few metres in a chunky white post block with rounded
// edges and two bolt heads on its face, on a kerb with a rounded top edge. In M7d4b2's trial of detail in
// textures the rails, a rod between them and the blocks are kit/striped-rail-detail.js's instead. Returns {
// add(segment, side), end(station, index, side, facing), meshes() } for kit/barriers.js: end closes the kerb and
// puts a post block where the rails start or stop, so their ends are hidden in it.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile, roundProfile, tubeProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { createCanvas, repeatingTexture } from '../canvas-texture.js';
import { at, coloured, mergeShapes, roundedBox, shaded } from '../shape-utils.js';
import { createStripedRailDetail } from './striped-rail-detail.js';

// [outward, lift] (see kit/extrude.js): the kerb, with a rounded top edge.
const BASE = roundProfile([[0, 0], [0, 0.34], [0.48, 0.34], [0.48, 0]], 0.06);
const BASE_COLOR = 0xc8c2b8;
const RAIL_OUT = 0.24;
const RAIL_LIFTS = [0.6, 0.99];
// Each rail is an oval this deep across the road and this tall.
const RAIL_HALF_DEPTH = 0.11;
const RAIL_HALF_HEIGHT = 0.15;
// A stripe winds once round a rail every this many units along it.
const STRIPE_LENGTH = 1.1;
const POST_STATIONS = 4;
// The post block: its size across the road, up and along it, standing on the kerb.
const BLOCK = { across: 0.4, height: 0.92, along: 0.32 };

export function createStripedRail({ keep, textures, drawing }) {
  const base = createStripBuilder();
  const rails = createStripBuilder();
  const rods = createStripBuilder();
  const posts = [];
  const postAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * RAIL_OUT, 0, facingAlong(station));
  const detail = drawing.textureDetail === 1 ? createStripedRailDetail(RAIL_OUT, keep) : null;
  const tubes = detail ? detail.railProfiles : RAIL_LIFTS.map((lift) => tubeProfile(RAIL_OUT, lift, RAIL_HALF_DEPTH, 12, RAIL_HALF_HEIGHT));
  // Round an oval, about.
  const circumference = Math.PI * (RAIL_HALF_DEPTH + RAIL_HALF_HEIGHT);
  const railUv = detail ? detail.railUv : (around, s) => [around / circumference, s / STRIPE_LENGTH];
  return {
    add(segment, side) {
      extrudeSegment(base, segment, side, BASE, BASE_COLOR, { smooth: true });
      for (const tube of tubes) {
        extrudeSegment(rails, segment, side, tube, 0xffffff, { uvOf: railUv, smooth: true });
      }
      if (detail) {
        extrudeSegment(rods, segment, side, detail.rodProfile, detail.rodColor, { smooth: true });
      }
      if (segment.index % POST_STATIONS === 0) {
        posts.push(postAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      capProfile(base, station, side, BASE, BASE_COLOR, facing);
      if (facing > 0 || index % POST_STATIONS !== 0) {
        posts.push(postAt(station, side));
      }
    },
    meshes() {
      const concrete = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.85 }));
      const kerb = withShadows(new THREE.Mesh(keep(base.build()), concrete));
      if (detail) {
        const steel = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.6 }));
        return [
          kerb,
          withShadows(new THREE.Mesh(keep(rails.build()), detail.railMaterial)),
          withShadows(new THREE.Mesh(keep(rods.build()), steel)),
          placeInstances(detail.blockGeometry, detail.blockMaterial, posts),
        ];
      }
      // Rough enough that the sun's glint along a rail does not bloom into a white smear (M7d3).
      const painted = keep(new THREE.MeshStandardMaterial({ map: keep(drawStripes()), roughness: 0.55 }));
      const blockPaint = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      return [kerb, withShadows(new THREE.Mesh(keep(rails.build()), painted)), placeInstances(keep(buildBlock()), blockPaint, posts)];
    },
  };
}

// The white post block the rails run through, a little darker toward its foot where it meets the kerb, with a
// dark bolt head on each face across the road (the block's frame faces along the road, so the road is toward
// -x on the right and +x on the left) beside each rail.
function buildBlock() {
  const block = coloured(at(roundedBox(BLOCK.across, BLOCK.height, BLOCK.along, 0.07), 0, 0.3 + BLOCK.height / 2, 0), 0xf2f0ea);
  shaded(block, (x, y) => 0.8 + 0.2 * Math.min(1, (y - 0.3) / 0.3));
  const bolts = RAIL_LIFTS.flatMap((lift) => [-1, 1].map((face) => coloured(at(new THREE.SphereGeometry(0.035, 6, 4).scale(0.5, 1, 1), face * (BLOCK.across / 2), lift + RAIL_HALF_HEIGHT + 0.06, 0), 0x55585e)));
  return mergeShapes([block, ...bolts]);
}

// Orange and white stripes on the diagonal, one of each per tile, so on a tube they wind round it, the white a
// little creamy and both a little worn along the stripes' edges.
function drawStripes() {
  const size = 64;
  const { canvas, context } = createCanvas(size, size);
  context.fillStyle = '#f4f0e6';
  context.fillRect(0, 0, size, size);
  for (const [color, inset] of [['#e8b48c', -1.5], ['#ff7a1a', 0]]) {
    context.fillStyle = color;
    for (const offset of [-size, 0]) {
      context.beginPath();
      context.moveTo(offset + inset, 0);
      context.lineTo(offset + size / 2 - inset, 0);
      context.lineTo(offset + size * 1.5 - inset, size);
      context.lineTo(offset + size + inset, size);
      context.fill();
    }
  }
  return repeatingTexture(canvas);
}
