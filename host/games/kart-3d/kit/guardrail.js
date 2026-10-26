// The kit's steel guardrail (M7d2), as at Mario Circuit: a galvanised W-shaped beam about half a kart high on
// short yellow posts, bolted to each post (the bolt heads since M7d3). Returns { add(segment, side), end(station,
// index, side, facing), meshes() } for kit/barriers.js: end puts a post where the beam starts or stops, so it
// never ends in the air.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes } from '../shape-utils.js';

// The beam's W, [outward, lift] (see kit/extrude.js): a thin sheet, seen from both sides.
const BEAM = [[0.02, 0.38], [0.11, 0.47], [0.03, 0.57], [0.11, 0.67], [0.02, 0.76]];
const POST_STATIONS = 2;
const POST_OUT = 0.22;
// Each bolt head sits on the beam's face toward the road, at these heights.
const BOLT_LIFTS = [0.5, 0.64];

export function createGuardrail({ keep }) {
  const beam = createStripBuilder();
  const posts = [];
  const bolts = [];
  function addPost(station, side) {
    posts.push(frameAt(station, edgeLateral(station, side) + side * POST_OUT, 0, facingAlong(station)));
    for (const lift of BOLT_LIFTS) {
      bolts.push(frameAt(station, edgeLateral(station, side) + side * 0.03, lift, facingAlong(station)));
    }
  }
  return {
    add(segment, side) {
      extrudeSegment(beam, segment, side, BEAM, 0xe4e8ee);
      if (segment.index % POST_STATIONS === 0) {
        addPost(segment.station, side);
      }
    },
    end(station, index, side, facing) {
      if (facing > 0 || index % POST_STATIONS !== 0) {
        addPost(station, side);
      }
    },
    meshes() {
      const steel = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide }));
      const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      // A flat round head, its axis across the road. Too small for a shadow worth drawing.
      const bolt = keep(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6).rotateZ(Math.PI / 2));
      const dark = keep(new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.35, metalness: 0.7 }));
      const boltHeads = placeInstances(bolt, dark, bolts);
      boltHeads.castShadow = false;
      return [withShadows(new THREE.Mesh(keep(beam.build()), steel)), placeInstances(keep(buildPost()), painted, posts), boltHeads];
    },
  };
}

// A yellow post with a dark cap, and the spacer block that holds the beam off it.
function buildPost() {
  return mergeShapes([
    coloured(at(new THREE.BoxGeometry(0.14, 0.82, 0.14), 0, 0.41, 0), 0xffc61e),
    coloured(at(new THREE.BoxGeometry(0.16, 0.04, 0.16), 0, 0.84, 0), 0x2a2a2e),
    coloured(at(new THREE.BoxGeometry(0.12, 0.3, 0.1), 0, 0.58, 0), 0x2a2a2e),
  ]);
}
