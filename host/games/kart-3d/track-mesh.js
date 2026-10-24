// The 3D race's road as meshes, built from the same stations the kart rules drive on, so what is drawn is
// exactly where karts drive: asphalt with red and white curbs (blue and white in anti-gravity sections), the
// checkered start line, grass shoulders, walls, and the road's underside and edges. Gaps are left empty.
// Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { addScaled } from './vector.js';

const CURB_WIDTH = 1;
const WALL_HEIGHT = 1.2;
const THICKNESS = 0.6;
// Curb stripes about this many stations long.
const STRIPE_STATIONS = 2;
const START_LINE_CELLS = 16;
const COLORS = {
  asphalt: 0x4a4e57,
  antiGravityAsphalt: 0x3b4a6b,
  curbRed: 0xd8302a,
  curbWhite: 0xf2f2f2,
  curbBlue: 0x26c6f2,
  grass: 0x6fbf3a,
  wall: 0xe8e8ee,
  antiGravityWall: 0x7fe3ff,
  underside: 0x6b6156,
  black: 0x1a1a1a,
};

// Returns { road, walls, dispose() }: two meshes ready to add to the scene (the walls are seen from both sides).
export function buildTrackMesh(track) {
  const surfaces = createGeometryBuilder();
  const walls = createGeometryBuilder();
  const startIndex = track.stations.findIndex((station) => station.s + station.segmentLength > track.startLine);
  track.stations.forEach((station, index) => {
    if (station.gap) {
      return;
    }
    const next = track.stations[(index + 1) % track.stations.length];
    const segment = { station, next, index };
    addRoadTop(surfaces, track, segment, index === startIndex || index === startIndex + 1);
    addShoulders(surfaces, track, segment);
    addUnderside(surfaces, track, segment);
    addEdges(surfaces, walls, track, segment);
  });
  const road = new THREE.Mesh(surfaces.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  road.receiveShadow = true;
  const wallMesh = new THREE.Mesh(
    walls.build(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, side: THREE.DoubleSide }),
  );
  wallMesh.receiveShadow = true;
  wallMesh.castShadow = true;
  function dispose() {
    for (const mesh of [road, wallMesh]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
  return { road, walls: wallMesh, dispose };
}

// The asphalt between the curbs, the two curbs, or the start line's checks across the whole width.
function addRoadTop(builder, track, segment, onStartLine) {
  const edge = track.halfWidth;
  const up = (station) => station.normal;
  if (onStartLine) {
    const cell = (2 * edge) / START_LINE_CELLS;
    for (let column = 0; column < START_LINE_CELLS; column += 1) {
      const color = (column + segment.index) % 2 === 0 ? COLORS.curbWhite : COLORS.black;
      builder.strip(segment, -edge + column * cell, 0, -edge + (column + 1) * cell, 0, up, color);
    }
    return;
  }
  const antiGravity = segment.station.antiGravity;
  const stripe = Math.floor(segment.index / STRIPE_STATIONS) % 2 === 0;
  const curb = stripe ? COLORS.curbWhite : antiGravity ? COLORS.curbBlue : COLORS.curbRed;
  builder.strip(segment, -edge, 0, -edge + CURB_WIDTH, 0, up, curb);
  builder.strip(segment, -edge + CURB_WIDTH, 0, edge - CURB_WIDTH, 0, up, antiGravity ? COLORS.antiGravityAsphalt : COLORS.asphalt);
  builder.strip(segment, edge - CURB_WIDTH, 0, edge, 0, up, curb);
}

function addShoulders(builder, track, segment) {
  const shoulder = segment.station.shoulder;
  if (shoulder > 0) {
    const up = (station) => station.normal;
    builder.strip(segment, -track.halfWidth - shoulder, 0, -track.halfWidth, 0, up, COLORS.grass);
    builder.strip(segment, track.halfWidth, 0, track.halfWidth + shoulder, 0, up, COLORS.grass);
  }
}

// The bottom of the road, facing down: drawn right to left so its front faces away from the top.
function addUnderside(builder, track, segment) {
  const edge = track.halfWidth + segment.station.shoulder;
  const down = (station) => ({ x: -station.normal.x, y: -station.normal.y, z: -station.normal.z });
  builder.strip(segment, edge, -THICKNESS, -edge, -THICKNESS, down, COLORS.underside);
}

// At each outer edge: a wall (from the road up) if it has one, and the road's side face (down to the
// underside) either way.
function addEdges(surfaces, walls, track, segment) {
  const edge = track.halfWidth + segment.station.shoulder;
  const wallColor = segment.station.antiGravity ? COLORS.antiGravityWall : COLORS.wall;
  for (const side of [-1, 1]) {
    const outward = (station) => ({ x: station.right.x * side, y: station.right.y * side, z: station.right.z * side });
    const hasWall = side > 0 ? segment.station.wallRight : segment.station.wallLeft;
    // Drawn so the front faces outward: top first on the right edge, bottom first on the left.
    const [first, second] = side > 0 ? [0, -THICKNESS] : [-THICKNESS, 0];
    surfaces.strip(segment, edge * side, first, edge * side, second, outward, COLORS.underside);
    if (hasWall) {
      walls.strip(segment, edge * side, side > 0 ? WALL_HEIGHT : 0, edge * side, side > 0 ? 0 : WALL_HEIGHT, outward, wallColor);
    }
  }
}

// Collects triangles with their normals and colours. strip() adds one quad between a segment's two stations:
// from (lateral, lift) `from` to `to` across the road at each station, where lift is along the road's normal.
// Its front face is the side from which `from` is on the left, seen looking along the road.
function createGeometryBuilder() {
  const positions = [];
  const normals = [];
  const colors = [];
  const color = new THREE.Color();

  function strip({ station, next }, fromLateral, fromLift, toLateral, toLift, normalAt, hex) {
    const corner = (at, lateral, lift) => addScaled(addScaled(at.point, at.right, lateral), at.normal, lift);
    const a0 = corner(station, fromLateral, fromLift);
    const a1 = corner(station, toLateral, toLift);
    const b0 = corner(next, fromLateral, fromLift);
    const b1 = corner(next, toLateral, toLift);
    const normalA = normalAt(station);
    const normalB = normalAt(next);
    color.setHex(hex);
    for (const [point, normal] of [[a0, normalA], [a1, normalA], [b0, normalB], [a1, normalA], [b1, normalB], [b0, normalB]]) {
      positions.push(point.x, point.y, point.z);
      normals.push(normal.x, normal.y, normal.z);
      colors.push(color.r, color.g, color.b);
    }
  }

  function build() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }

  return { strip, build };
}
