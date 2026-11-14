// The kit's start gate (M7d2): two chunky posts behind the walls either side of the start line, a big sign across
// the road between them reading KARTWHEEL (kit/start-gate-sign.js) on both faces, with a stripe along its foot
// and checks at its ends, and a round mushroom badge on top, in the course's colours (M7d3): a
// yellow sign on the Test track, a sea-blue one on Seaside Skyway. Since M7d4 built up as the reference game's
// gates are (docs/kart-reference.md, "The kit's objects up close"): each post a stone plinth, a shaft of panels with
// seams between them and a bolt at each corner, a band and a capital; the sign's letters raised (its relief)
// inside a raised rim with a row of bolts along it. The start lights (kit/start-lights.js) hang under the sign's
// middle. Since M7d4b2 the posts' panels, seams and bolts are maps on one shaft
// (kit/gate-post-detail.js) rather than geometry. Used by the courses' dressings.

import * as THREE from 'three';
import { startLineIndex } from '../track.js';
import { frameAt, facingBack, edgeLateral, withShadows } from './frames.js';
import { roundedBox, at, coloured, mergeShapes } from '../shape-utils.js';
import { drawSign, drawBadge } from './start-gate-sign.js';
import { buildDetailedShafts } from './gate-post-detail.js';

const POST_WIDTH = 1.3;
// The thickest barrier (the padded wall with its fence) reaches this far out from the edge of the ground.
const BARRIER_CLEARANCE = 0.7;
const SIGN_BOTTOM = 6.6;
const SIGN_HEIGHT = 2.6;
const SIGN_DEPTH = 1;
const BADGE_RADIUS = 1.3;
// Each post's panels, [bottom, top], with the band between the first two; and the plinth and capital.
const PANELS = [[0.75, 2.45], [3.15, 4.7], [4.78, 6.28]];
const BAND = { middle: 2.8, height: 0.6 };
const PLINTH = { height: 0.7, color: 0x5a5e66 };
const BOLT_COLOR = 0xc8ccd2;
// The rim round each printed face: how thick its bars are and how far they stand out from the sign's body.
const RIM = { width: 0.16, stand: 0.08, color: 0xf4f4f0 };
const RIM_BOLT_SPACING = 1.2;

// Adds the gate over the start line; `kit` is the course's { world, track, keep } (kit/kit.js), `theme` its
// colours: { post, band, body } as hex numbers for the posts, the band round them and the sign's body, and
// { background, stripe, outline } as CSS colours for the sign's face. Returns the frame (a Matrix4) the start
// lights hang from: y up, z toward the karts on the grid.
export function buildStartGate({ world, track, keep }, theme) {
  const station = track.stations[startLineIndex(track)];
  const frame = frameAt(station, 0, 0, facingBack(station));
  // The posts stand just behind the barriers on either side, clear of their boards and fences.
  const halfSpan = Math.max(-edgeLateral(station, -1), edgeLateral(station, 1)) + BARRIER_CLEARANCE + POST_WIDTH / 2;
  const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
  const sign = drawSign(theme);
  const signMaterial = keep(new THREE.MeshStandardMaterial({ map: keep(sign.map), normalMap: keep(sign.relief), roughness: 0.45 }));
  const badgeMaterial = keep(new THREE.MeshStandardMaterial({ map: keep(drawBadge()), roughness: 0.4 }));
  const signWidth = 2 * halfSpan + POST_WIDTH;
  const signMiddle = SIGN_BOTTOM + SIGN_HEIGHT / 2;
  const badgeMiddle = SIGN_BOTTOM + SIGN_HEIGHT + BADGE_RADIUS - 0.2;
  const face = { width: signWidth - 0.5, height: SIGN_HEIGHT - 0.4, middle: signMiddle };
  // The printed faces, front (toward the grid) and back, a hair in front of the sign's body.
  const faces = mergeFaces(face.width, face.height, signMiddle, SIGN_DEPTH / 2 + 0.01);
  const badgeFaces = mergeFaces(2 * BADGE_RADIUS, 2 * BADGE_RADIUS, badgeMiddle, 0.13, new THREE.CircleGeometry(BADGE_RADIUS, 32));
  const shaft = { xs: [-halfSpan, halfSpan], width: POST_WIDTH, bottom: PLINTH.height, top: SIGN_BOTTOM - 0.3, panels: PANELS, boltColor: BOLT_COLOR };
  const parts = [
    new THREE.Mesh(keep(buildFrame(theme, halfSpan, signWidth, face, badgeMiddle)), painted),
    new THREE.Mesh(keep(faces), signMaterial),
    new THREE.Mesh(keep(badgeFaces), badgeMaterial),
    buildDetailedShafts(keep, shaft, theme.post),
  ];
  for (const part of parts) {
    part.matrixAutoUpdate = false;
    part.matrix.copy(frame);
    world.add(withShadows(part));
  }
  return frame.clone().multiply(new THREE.Matrix4().makeTranslation(0, SIGN_BOTTOM, 0));
}

// The posts, the sign's body with its rims and the badge's red rim, as one shape (the posts' shafts are
// separate, drawn as maps).
function buildFrame(theme, halfSpan, signWidth, face, badgeMiddle) {
  const rim = new THREE.TorusGeometry(BADGE_RADIUS, 0.16, 8, 32);
  return mergeShapes([
    ...[-1, 1].flatMap((side) => buildPost(theme, side * halfSpan)),
    coloured(at(roundedBox(signWidth, SIGN_HEIGHT, SIGN_DEPTH, 0.25), 0, face.middle, 0), theme.body),
    ...[-1, 1].flatMap((facing) => buildRim(face, facing)),
    coloured(at(new THREE.CylinderGeometry(BADGE_RADIUS, BADGE_RADIUS, 0.24, 32).rotateX(Math.PI / 2), 0, badgeMiddle, 0), 0xffffff),
    coloured(at(rim, 0, badgeMiddle, 0), 0xd8302a),
  ]);
}

// One post at x without its shaft: a dark stone plinth, the band round it and a capital under the sign.
function buildPost(theme, x) {
  return [
    coloured(at(roundedBox(POST_WIDTH + 0.4, PLINTH.height, POST_WIDTH + 0.4, 0.08), x, PLINTH.height / 2, 0), PLINTH.color),
    coloured(at(roundedBox(POST_WIDTH + 0.1, BAND.height, POST_WIDTH + 0.1, 0.1), x, BAND.middle, 0), theme.band),
    coloured(at(roundedBox(POST_WIDTH + 0.3, 0.36, POST_WIDTH + 0.3, 0.08), x, SIGN_BOTTOM - 0.16, 0), theme.band),
  ];
}

// The raised rim round a printed face on the `facing` side of the sign (1 toward the grid, -1 behind), with a
// row of bolt heads along its top and bottom bars.
function buildRim(face, facing) {
  const z = facing * (SIGN_DEPTH / 2 + RIM.stand / 2);
  const [halfWidth, halfHeight] = [face.width / 2 + RIM.width / 2, face.height / 2 + RIM.width / 2];
  const bar = (width, height, x, y) => coloured(at(roundedBox(width, height, RIM.stand, 0.03), x, face.middle + y, z), RIM.color);
  const bolts = [];
  const count = Math.floor(face.width / RIM_BOLT_SPACING);
  for (let index = 0; index <= count; index += 1) {
    const x = -face.width / 2 + (index * face.width) / count;
    for (const y of [-halfHeight, halfHeight]) {
      bolts.push(coloured(at(new THREE.SphereGeometry(0.04, 6, 4).scale(1, 1, 0.5), x, face.middle + y, z + (facing * RIM.stand) / 2), BOLT_COLOR));
    }
  }
  return [
    bar(face.width + 2 * RIM.width, RIM.width, 0, -halfHeight),
    bar(face.width + 2 * RIM.width, RIM.width, 0, halfHeight),
    bar(RIM.width, face.height, -halfWidth, 0),
    bar(RIM.width, face.height, halfWidth, 0),
    ...bolts,
  ];
}

// A printed face toward +z and the same turned to face -z (so it reads the right way round from behind too),
// `away` from the middle, centred at height `middle`.
function mergeFaces(width, height, middle, away, shape = new THREE.PlaneGeometry(width, height)) {
  const front = shape.clone().translate(0, middle, away);
  const back = shape.clone().rotateY(Math.PI).translate(0, middle, -away);
  shape.dispose();
  return mergeShapes([front, back]);
}
