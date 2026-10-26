// The kit's steel guardrail (M7d2), as at Mario Circuit: a galvanised W-shaped beam about half a kart high on
// short yellow posts, bolted to each post (the bolt heads since M7d3). Since M7d4 built up further
// (docs/mk8dx-reference.md, "The kit's objects up close"): a deeper, rounded W, a splice plate with a row of
// bolts where one beam meets the next, rounded posts with a cap and a foot plate, and a small amber reflector on
// every few posts. Returns { add(segment, side), end(station, index, side, facing), meshes() } for
// kit/barriers.js: end puts a post where the beam starts or stops, so it never ends in the air.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, roundProfile, offsetProfile, stationBetween } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes, roundedBox, shaded } from '../shape-utils.js';

// The beam's W, [outward, lift] (see kit/extrude.js): a thin sheet, seen from both sides.
const BEAM = roundProfile([[0.02, 0.36], [0.14, 0.46], [0.03, 0.56], [0.14, 0.66], [0.02, 0.76]], 0.03, 2);
const BEAM_COLOR = 0xe4e8ee;
const POST_STATIONS = 2;
const POST_OUT = 0.24;
// One beam is this many stations long; where two meet, a plate this long laps over them.
const BEAM_STATIONS = 4;
const SPLICE_LENGTH = 0.36;
// Each bolt head sits on the W's middle ridge, nearest the road, at this height: at every post, and in a row
// across each splice.
const BOLT_LIFT = 0.56;
const SPLICE_BOLTS = [0.15, 0.5, 0.85];
const REFLECTOR_POSTS = 4;

export function createGuardrail({ keep }) {
  const beam = createStripBuilder();
  const posts = [];
  const bolts = [];
  const reflectors = [];
  // Bolt heads at `share` of the way along `segment`.
  function addBolts(segment, side, share) {
    const at = stationBetween(segment, share);
    bolts.push(frameAt(at, edgeLateral(at, side) + side * 0.02, BOLT_LIFT, facingAlong(at)));
  }
  function addPost(station, side, withReflector) {
    const frame = frameAt(station, edgeLateral(station, side) + side * POST_OUT, 0, facingAlong(station));
    posts.push(frame);
    if (withReflector) {
      reflectors.push(frame);
    }
  }
  return {
    add(segment, side) {
      extrudeSegment(beam, segment, side, BEAM, BEAM_COLOR, { smooth: true });
      if (segment.index % POST_STATIONS === 0) {
        addPost(segment.station, side, segment.index % (POST_STATIONS * REFLECTOR_POSTS) === 0);
        addBolts(segment, side, 0);
      }
      if (segment.index % BEAM_STATIONS === 1) {
        const span = SPLICE_LENGTH / segment.station.segmentLength;
        extrudeSegment(beam, segment, side, offsetProfile(BEAM, 0.012), 0xc4c8ce, { span: [0, span], smooth: true });
        SPLICE_BOLTS.forEach((share) => addBolts(segment, side, share * span));
      }
    },
    end(station, index, side, facing) {
      if (facing > 0 || index % POST_STATIONS !== 0) {
        addPost(station, side, false);
      }
    },
    meshes() {
      const steel = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide }));
      const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      // A flattened ball half through the beam, so it shows from either side; too small for a shadow worth drawing.
      const bolt = keep(new THREE.SphereGeometry(0.03, 6, 3).scale(0.6, 1, 1));
      const dark = keep(new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.35, metalness: 0.7 }));
      const boltHeads = placeInstances(bolt, dark, bolts);
      boltHeads.castShadow = false;
      // The reflector faces back down the road, toward the karts coming, on top of the post's cap.
      const reflector = keep(roundedBox(0.1, 0.07, 0.03, 0.012).translate(0, 0.86, -0.03));
      const amber = keep(new THREE.MeshStandardMaterial({ color: 0xffa21a, emissive: 0x6a3000, roughness: 0.2 }));
      const lights = placeInstances(reflector, amber, reflectors);
      lights.castShadow = false;
      return [withShadows(new THREE.Mesh(keep(beam.build()), steel)), placeInstances(keep(buildPost()), painted, posts), boltHeads, lights];
    },
  };
}

// A yellow post with rounded edges, darker toward its foot, on a steel foot plate, with a dark cap and the
// spacer block that holds the beam off it.
function buildPost() {
  // Hundreds stand round a course, so the post's edges are chamfered rather than rounded, and its small
  // fittings are plain boxes.
  const post = shaded(coloured(at(roundedBox(0.14, 0.8, 0.14, 0.025, { chamfered: true }), 0, 0.42, 0), 0xffc61e), (x, y) => 0.72 + 0.28 * Math.min(1, y / 0.35));
  return mergeShapes([
    post,
    coloured(at(new THREE.BoxGeometry(0.26, 0.03, 0.26), 0, 0.015, 0), 0x6c7078),
    coloured(at(new THREE.BoxGeometry(0.17, 0.05, 0.17), 0, 0.83, 0), 0x2a2a2e),
    coloured(at(new THREE.BoxGeometry(0.12, 0.32, 0.1), 0, 0.56, 0), 0x2a2a2e),
  ]);
}
