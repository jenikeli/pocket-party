// The airport's padded barrier (M9 task K), after the fat yellow ones beside the reference airport course's blue
// road: one long pillow of sun-yellow padding with well rounded edges on a dark skirt, held by a navy collar every
// few metres. Returns { add(segment, side), end(station, index, side, facing), meshes() } for kit/barriers.js: the
// pillow's cross-section is closed where it starts or stops, and a collar stands at each end.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile, roundProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, roundedBox } from '../shape-utils.js';
import { SUN_YELLOW } from './hangar-maps.js';

const SKIRT_COLOR = 0x3a3d46;
const COLLAR_COLOR = 0x1e3566;
const COLLAR_STATIONS = 3;
// [outward, lift] (see kit/extrude.js). The pillow stands 0.02 to 0.7 out from the ground's edge (the ledge under
// it is 0.95 wide), 0.8 high, its top edges rounded over 0.22.
const PILLOW = roundProfile([[0.02, 0.05], [0.02, 0.8], [0.7, 0.8], [0.7, 0.05]], 0.22, 4);
// The skirt round its foot, standing 0.02 proud of the pillow.
const SKIRT = roundProfile([[0, 0.05], [0, 0.3], [0.72, 0.3], [0.72, 0.05]], 0.05, 2);
const COLLAR_OUT = 0.36;

export function createPaddedBarrier({ keep }) {
  const pillow = createStripBuilder();
  const skirt = createStripBuilder();
  const collars = [];
  const collarAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * COLLAR_OUT, 0, facingAlong(station));
  return {
    add(segment, side) {
      extrudeSegment(pillow, segment, side, PILLOW, SUN_YELLOW, { smooth: true });
      extrudeSegment(skirt, segment, side, SKIRT, SKIRT_COLOR, { smooth: true });
      if (segment.index % COLLAR_STATIONS === 0) {
        collars.push(collarAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      capProfile(pillow, station, side, PILLOW, SUN_YELLOW, facing);
      capProfile(skirt, station, side, SKIRT, SKIRT_COLOR, facing);
      if (facing > 0 || index % COLLAR_STATIONS !== 0) {
        collars.push(collarAt(station, side));
      }
    },
    meshes() {
      const vinyl = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      const collar = coloured(at(roundedBox(0.86, 0.88, 0.14, 0.05, { chamfered: true }), 0, 0.46, 0), COLLAR_COLOR);
      return [
        withShadows(new THREE.Mesh(keep(pillow.build()), vinyl)),
        withShadows(new THREE.Mesh(keep(skirt.build()), vinyl)),
        placeInstances(keep(collar), vinyl, collars),
      ];
    },
  };
}
