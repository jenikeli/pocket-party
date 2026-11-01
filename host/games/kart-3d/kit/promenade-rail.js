// The kit's promenade railing (M7d4), as along MK8DX's Daisy Circuit seafront (docs/mk8dx-reference.md, "The
// kit's objects up close"), in toy proportions since M7d4c3: fat blue iron posts, each with a flared foot, a
// collar and a ball on top twice its width, two fat round rails between them, and every few metres a big square
// stone pillar (dressed blocks, a plinth, an overhanging cap, a round plaque with Daisy's flower), every other
// one carrying a lantern. Returns { add(segment, side), end(station, index, side, facing), meshes() } for
// kit/barriers.js: end stands a pillar where the railing starts or stops, so the rails end in stone, as Daisy
// Circuit's do. The shapes are in kit/promenade-shapes.js, the maps in kit/promenade-detail.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, tubeProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { createPromenadeDetail } from './promenade-detail.js';
import { IRON, PILLAR_REACH, buildPost, buildPillarShaft, buildPillarTrim, buildPlaqueDiscs, buildPlaqueRims, buildLanternIron, buildLanternGlass } from './promenade-shapes.js';

// The railing's line is this far out from the edge of the ground: far enough that the pillars' cap slabs stand
// clear of the road's edge (by 0.06), and the ledge under the barrier (0.95 wide, kit/barriers.js) holds them.
export const RAIL_OUT = PILLAR_REACH + 0.06;
const RAIL_LIFTS = [0.5, 0.9];
const RAIL_RADIUS = 0.05;
const POST_STATIONS = 2;
// A pillar instead of a post every this many stations (Daisy Circuit's stand about every 6 posts).
const PILLAR_STATIONS = 12;
// The same warm glass as the props' lamps, not glowing: lamps are off by day.
const GLASS = { color: 0xfff4dc, roughness: 0.15, metalness: 0.1 };

export function createPromenadeRail({ keep }) {
  const rails = createStripBuilder();
  const posts = [];
  const pillars = [];
  const placeAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * RAIL_OUT, 0, facingAlong(station));
  // A pillar's frame, and whether it carries a lantern: every other pillar along the road, the same on both sides
  // (counting pillars as they are added would alternate between the two sides' instead).
  const pillarAt = (station, index, side) => ({ frame: placeAt(station, side), lantern: Math.round(index / PILLAR_STATIONS) % 2 === 0 });
  return {
    add(segment, side) {
      for (const lift of RAIL_LIFTS) {
        extrudeSegment(rails, segment, side, tubeProfile(RAIL_OUT, lift, RAIL_RADIUS), IRON, { smooth: true });
      }
      if (segment.index % PILLAR_STATIONS === 0) {
        pillars.push(pillarAt(segment.station, segment.index, side));
      } else if (segment.index % POST_STATIONS === 0) {
        posts.push(placeAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      if (facing > 0 || index % PILLAR_STATIONS !== 0) {
        pillars.push(pillarAt(station, index, side));
      }
    },
    meshes() {
      const detail = createPromenadeDetail(keep);
      const iron = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 }));
      const trim = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
      const brass = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.7 }));
      const glass = keep(new THREE.MeshStandardMaterial(GLASS));
      const frames = pillars.map((pillar) => pillar.frame);
      const lanternFrames = pillars.filter((pillar) => pillar.lantern).map((pillar) => pillar.frame);
      return [
        withShadows(new THREE.Mesh(keep(rails.build()), iron)),
        placeInstances(keep(buildPost()), iron, posts),
        placeInstances(keep(buildPillarShaft()), detail.stone, frames),
        placeInstances(keep(buildPillarTrim()), trim, frames),
        placeInstances(keep(buildPlaqueDiscs()), detail.plaque, frames),
        placeInstances(keep(buildPlaqueRims()), brass, frames),
        placeInstances(keep(buildLanternIron()), iron, lanternFrames),
        placeInstances(keep(buildLanternGlass()), glass, lanternFrames),
      ];
    },
  };
}
