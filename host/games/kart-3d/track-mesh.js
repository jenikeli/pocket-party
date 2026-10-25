// The 3D race's road as meshes, built from the same stations the kart rules drive on, so what is drawn is
// exactly where karts drive: asphalt with red and white curbs (blue and white in anti-gravity sections), the
// checkered start line, grass shoulders, walls, and the road's underside and edges; unlit and brighter than
// white so they glow on the High quality setting, blue lines along anti-gravity sections; and the dash panels,
// unlit too, as bright as the Dash panel glow slider says (renderer.js sets it every frame).
// Gaps are left empty. A dressed course (one with scenery, M7c) also gets asphalt grain, mown stripes in the
// grass and walls in coloured panels; the Test track keeps its plain look.
// Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { progressBetween } from './track.js';
import { DASH_PANEL_LENGTH, DASH_PANEL_WIDTH } from './kart-boosts.js';
import { createStripBuilder } from './strip-builder.js';
import { createGrainTexture } from './textures.js';

const CURB_WIDTH = 1;
const WALL_HEIGHT = 1.2;
const THICKNESS = 0.6;
// Curb stripes about this many stations long, mown grass stripes and wall panels these many.
const STRIPE_STATIONS = 2;
const MOWN_STATIONS = 4;
const PANEL_STATIONS = 6;
const START_LINE_CELLS = 16;
// Dash panels and glowing lines sit just above the asphalt, so the two never fight over which is drawn in
// front.
const GLOW_LIFT = 0.03;
const GLOW_BRIGHTNESS = 2.5;
const ANTI_GRAVITY_LINE_WIDTH = 0.3;
const COLORS = {
  asphalt: 0x4a4e57,
  antiGravityAsphalt: 0x3b4a6b,
  curbRed: 0xd8302a,
  curbWhite: 0xf2f2f2,
  curbBlue: 0x26c6f2,
  grass: 0x6fbf3a,
  grassMown: 0x5fae30,
  wall: 0xe8e8ee,
  wallPanel: 0x3f8ee8,
  antiGravityWall: 0x7fe3ff,
  antiGravityLine: 0x3fd8ff,
  underside: 0x6b6156,
  black: 0x1a1a1a,
  dashOrange: 0xff8c1a,
  dashYellow: 0xffe14a,
};

// Returns { road, walls, glow, dashPanels, dispose() }: four meshes ready to add to the scene (the walls are seen
// from both sides). The dash panels have their own mesh so that their brightness can change live: an unlit
// material's colour multiplies the vertex colours.
export function buildTrackMesh(track) {
  const dressed = track.scenery !== null;
  const surfaces = createStripBuilder();
  const walls = createStripBuilder();
  const glow = createStripBuilder(GLOW_BRIGHTNESS);
  const dashPanels = createStripBuilder();
  const startIndex = track.stations.findIndex((station) => station.s + station.segmentLength > track.startLine);
  track.stations.forEach((station, index) => {
    if (station.gap) {
      return;
    }
    const next = track.stations[(index + 1) % track.stations.length];
    const segment = { station, next, index };
    addRoadTop(surfaces, segment, index === startIndex || index === startIndex + 1);
    addDashPanels(dashPanels, track, segment);
    addAntiGravityLines(glow, segment);
    addShoulders(surfaces, segment, dressed);
    addUnderside(surfaces, segment);
    addEdges(surfaces, walls, segment, dressed);
  });
  const grain = dressed ? createGrainTexture() : null;
  const road = new THREE.Mesh(surfaces.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, map: grain }));
  road.receiveShadow = true;
  const wallMesh = new THREE.Mesh(
    walls.build(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, side: THREE.DoubleSide }),
  );
  wallMesh.receiveShadow = true;
  wallMesh.castShadow = true;
  const glowMesh = new THREE.Mesh(glow.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  const dashPanelMesh = new THREE.Mesh(dashPanels.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  function dispose() {
    for (const mesh of [road, wallMesh, glowMesh, dashPanelMesh]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    grain?.dispose();
  }
  return { road, walls: wallMesh, glow: glowMesh, dashPanels: dashPanelMesh, dispose };
}

// The asphalt between the curbs, the two curbs, or the start line's checks across the whole width. Laterals are
// given per station (see the geometry builder), so the road follows its width as it changes.
function addRoadTop(builder, segment, onStartLine) {
  const up = (station) => station.normal;
  const at = (share, offset = 0) => (station) => station.halfWidth * share + offset;
  if (onStartLine) {
    for (let column = 0; column < START_LINE_CELLS; column += 1) {
      const color = (column + segment.index) % 2 === 0 ? COLORS.curbWhite : COLORS.black;
      const from = -1 + (2 * column) / START_LINE_CELLS;
      const to = -1 + (2 * (column + 1)) / START_LINE_CELLS;
      builder.strip(segment, at(from), 0, at(to), 0, up, color);
    }
    return;
  }
  const antiGravity = segment.station.antiGravity;
  const stripe = Math.floor(segment.index / STRIPE_STATIONS) % 2 === 0;
  const curb = stripe ? COLORS.curbWhite : antiGravity ? COLORS.curbBlue : COLORS.curbRed;
  builder.strip(segment, at(-1), 0, at(-1, CURB_WIDTH), 0, up, curb);
  builder.strip(segment, at(-1, CURB_WIDTH), 0, at(1, -CURB_WIDTH), 0, up, antiGravity ? COLORS.antiGravityAsphalt : COLORS.asphalt);
  builder.strip(segment, at(1, -CURB_WIDTH), 0, at(1), 0, up, curb);
}

// Stripes, one per station, across each dash panel where kart-boosts.js finds it.
function addDashPanels(builder, track, segment) {
  const up = (station) => station.normal;
  for (const panel of track.dashPanels) {
    if (Math.abs(progressBetween(track, panel.s, segment.station.s)) < DASH_PANEL_LENGTH / 2) {
      const color = segment.index % 2 === 0 ? COLORS.dashOrange : COLORS.dashYellow;
      const from = panel.lateral - DASH_PANEL_WIDTH / 2;
      builder.strip(segment, () => from, GLOW_LIFT, () => from + DASH_PANEL_WIDTH, GLOW_LIFT, up, color);
    }
  }
}

// In anti-gravity sections, a bright line along each edge between the curb and the asphalt.
function addAntiGravityLines(builder, segment) {
  const up = (station) => station.normal;
  if (segment.station.antiGravity) {
    for (const side of [-1, 1]) {
      const byCurb = (station) => side * (station.halfWidth - CURB_WIDTH);
      const inside = (station) => side * (station.halfWidth - CURB_WIDTH - ANTI_GRAVITY_LINE_WIDTH);
      // The left edge first, so the strip faces up.
      const [from, to] = side < 0 ? [byCurb, inside] : [inside, byCurb];
      builder.strip(segment, from, GLOW_LIFT, to, GLOW_LIFT, up, COLORS.antiGravityLine);
    }
  }
}

// Each side's shoulder is the segment's own (they change from piece to piece), so it is drawn from the
// segment's first station at both ends.
function addShoulders(builder, segment, dressed) {
  const up = (station) => station.normal;
  const { shoulderLeft, shoulderRight } = segment.station;
  const mown = dressed && Math.floor(segment.index / MOWN_STATIONS) % 2 === 0;
  const grass = mown ? COLORS.grassMown : COLORS.grass;
  if (shoulderLeft > 0) {
    builder.strip(segment, (station) => -station.halfWidth - shoulderLeft, 0, (station) => -station.halfWidth, 0, up, grass);
  }
  if (shoulderRight > 0) {
    builder.strip(segment, (station) => station.halfWidth, 0, (station) => station.halfWidth + shoulderRight, 0, up, grass);
  }
}

// How far out the ground ends on `side` (-1 left, 1 right) at a station of this segment.
function outerEdgeAt(segment, side) {
  const shoulder = side > 0 ? segment.station.shoulderRight : segment.station.shoulderLeft;
  return (station) => side * (station.halfWidth + shoulder);
}

// The bottom of the road, facing down: drawn right to left so its front faces away from the top.
function addUnderside(builder, segment) {
  const down = (station) => ({ x: -station.normal.x, y: -station.normal.y, z: -station.normal.z });
  builder.strip(segment, outerEdgeAt(segment, 1), -THICKNESS, outerEdgeAt(segment, -1), -THICKNESS, down, COLORS.underside);
}

// At each outer edge: a wall (from the road up) if it has one, and the road's side face (down to the
// underside) either way.
function addEdges(surfaces, walls, segment, dressed) {
  const panel = dressed && Math.floor(segment.index / PANEL_STATIONS) % 2 === 0;
  const wallColor = segment.station.antiGravity ? COLORS.antiGravityWall : panel ? COLORS.wallPanel : COLORS.wall;
  for (const side of [-1, 1]) {
    const outward = (station) => ({ x: station.right.x * side, y: station.right.y * side, z: station.right.z * side });
    const edge = outerEdgeAt(segment, side);
    const hasWall = side > 0 ? segment.station.wallRight : segment.station.wallLeft;
    // Drawn so the front faces outward: top first on the right edge, bottom first on the left.
    const [first, second] = side > 0 ? [0, -THICKNESS] : [-THICKNESS, 0];
    surfaces.strip(segment, edge, first, edge, second, outward, COLORS.underside);
    if (hasWall) {
      walls.strip(segment, edge, side > 0 ? WALL_HEIGHT : 0, edge, side > 0 ? 0 : WALL_HEIGHT, outward, wallColor);
    }
  }
}
