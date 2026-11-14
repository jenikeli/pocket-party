// The kit's striped rail (M7d2), as at the reference harbour course: two rails painted in orange and white stripes that wind round
// them, on a low concrete kerb. Since M7d4 built as the reference harbour course's is (docs/kart-reference.md, "The kit's objects
// up close"): fat rails, oval rather than round, held every few metres in a chunky white post block with rounded
// edges and two bolt heads on its face, on a kerb with a rounded top edge. Since M7d4b2 the rails, a rod between
// them and the blocks are drawn with their detail in textures (kit/striped-rail-detail.js). Returns {
// add(segment, side), end(station, index, side, facing), meshes() } for kit/barriers.js: end closes the kerb and
// puts a post block where the rails start or stop, so their ends are hidden in it.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile, roundProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { createStripedRailDetail } from './striped-rail-detail.js';

// [outward, lift] (see kit/extrude.js): the kerb, with a rounded top edge.
const BASE = roundProfile([[0, 0], [0, 0.34], [0.48, 0.34], [0.48, 0]], 0.06);
const BASE_COLOR = 0xc8c2b8;
const RAIL_OUT = 0.24;
const POST_STATIONS = 4;

export function createStripedRail({ keep, textures }) {
  const base = createStripBuilder();
  const rails = createStripBuilder();
  const rods = createStripBuilder();
  const posts = [];
  const postAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * RAIL_OUT, 0, facingAlong(station));
  const detail = createStripedRailDetail(RAIL_OUT, keep);
  return {
    add(segment, side) {
      extrudeSegment(base, segment, side, BASE, BASE_COLOR, { smooth: true });
      for (const tube of detail.railProfiles) {
        extrudeSegment(rails, segment, side, tube, 0xffffff, { uvOf: detail.railUv, smooth: true });
      }
      extrudeSegment(rods, segment, side, detail.rodProfile, detail.rodColor, { smooth: true });
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
      const steel = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.6 }));
      return [
        kerb,
        withShadows(new THREE.Mesh(keep(rails.build()), detail.railMaterial)),
        withShadows(new THREE.Mesh(keep(rods.build()), steel)),
        placeInstances(detail.blockGeometry, detail.blockMaterial, posts),
      ];
    },
  };
}
