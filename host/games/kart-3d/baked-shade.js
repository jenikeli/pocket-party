// M7d4b2's trial of baked light: shade (ambient occlusion) baked into the vertex colours of the stretch round the
// start line once the course is built, as MK8DX's "pre-baked shadows that take occluded edges into account" are:
// the road darker along the foot of its barriers, a ledge's face under its coping, a deck where a wall stands on
// it, the ground under the gate. How: the course is drawn into a depth map from each of many directions spread
// over the sphere, as a shadow map is drawn from the sun; a vertex that something stands in front of, seen from a
// direction, gets no sky from there. Done a stretch of the road at a time, so the depth maps stay fine. Only
// meshes coloured per vertex take it (the road, the barriers' and ledges' long runs, the decks, the gate);
// instanced parts (posts, props) share one shape, so they cannot. Used by host/games/kart-3d/renderer.js while
// the tuning panel's "Baked shade" is on.

import * as THREE from 'three';
import { startLineIndex } from './track.js';
import { sphereDirections, unpackDepth, shadeFor } from './occlusion.js';

// The stretch: this many stations (1 unit apart) behind the start line (the grid) and ahead of it, in pieces of
// this many stations each.
const STRETCH_BEHIND = 50;
const STRETCH_AHEAD = 70;
const PIECE_STATIONS = 40;
// A piece's box reaches this far round its stations' points, enough for the decks and the grandstand, and what
// can shade it this much farther.
const PIECE_REACH = 14;
const SHADE_REACH = 6;
const DIRECTION_COUNT = 32;
const MAP_SIZE = 512;
// So a surface does not shade itself (as a shadow map's bias does): a vertex looks from this many of the depth
// map's texels off its surface, and something must stand nearer the sky than it by this many texels, more the
// more slanting the direction is to the surface (a slanting surface's depth changes fast across a texel).
// Directions this slanting or more are left out: they bring little light and cannot be told from the surface.
const LIFT_TEXELS = 1.5;
const SLACK_TEXELS = 1;
const LEAST_FACING = 0.15;
// The colour where a vertex sees no sky at all keeps this share: full shade would read as a hole.
const DARKEST = 0.45;

// Bakes the shade into `world` (scenery.js's group, in the scene and built) for `track`.
export function bakeShade(renderer, world, track) {
  const scene = world.parent;
  const bakeScene = new THREE.Scene();
  bakeScene.overrideMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  bakeScene.add(world);
  world.updateMatrixWorld(true);
  const seeThrough = hideSeeThrough(world);
  const pieces = stretchPieces(track);
  const vertices = collectVertices(world, pieces);
  const target = new THREE.WebGLRenderTarget(MAP_SIZE, MAP_SIZE);
  const pixels = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
  const directions = sphereDirections(DIRECTION_COUNT).map(({ x, y, z }) => new THREE.Vector3(x, y, z));
  // Cleared to white, which reads back as the far plane: where nothing is drawn, nothing stands in the way.
  const clearColor = renderer.getClearColor(new THREE.Color());
  const clearAlpha = renderer.getClearAlpha();
  renderer.setClearColor(0xffffff, 1);
  pieces.forEach((piece, pieceIndex) => {
    const sphere = piece.clone().expandByScalar(SHADE_REACH).getBoundingSphere(new THREE.Sphere());
    for (const direction of directions) {
      const camera = depthCamera(sphere, direction);
      renderer.setRenderTarget(target);
      renderer.render(bakeScene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, MAP_SIZE, MAP_SIZE, pixels);
      look(vertices, pieceIndex, direction, camera, pixels);
    }
  });
  renderer.setRenderTarget(null);
  renderer.setClearColor(clearColor, clearAlpha);
  applyShade(vertices);
  seeThrough.forEach((mesh) => (mesh.visible = true));
  scene.add(world);
  target.dispose();
  bakeScene.overrideMaterial.dispose();
}

// The stretch as boxes round its stations' points, one per piece of the road.
function stretchPieces(track) {
  const start = startLineIndex(track);
  const count = track.stations.length;
  const pieces = [];
  for (let first = -STRETCH_BEHIND; first < STRETCH_AHEAD; first += PIECE_STATIONS) {
    const box = new THREE.Box3();
    for (let offset = first; offset < Math.min(first + PIECE_STATIONS, STRETCH_AHEAD); offset += 1) {
      const { point } = track.stations[(((start + offset) % count) + count) % count];
      box.expandByPoint(new THREE.Vector3(point.x, point.y, point.z));
    }
    pieces.push(box.expandByScalar(PIECE_REACH));
  }
  return pieces;
}

// An orthographic camera on the `direction` side of `sphere`, looking back through it, its view just holding it.
function depthCamera(sphere, direction) {
  const { radius, center } = sphere;
  const camera = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0, 2 * radius);
  camera.position.copy(center).addScaledVector(direction, radius);
  camera.up.set(0, 1, 0);
  if (Math.abs(direction.y) > 0.99) {
    camera.up.set(0, 0, 1);
  }
  camera.lookAt(center);
  camera.updateMatrixWorld();
  return camera;
}

// What the vertices of piece `pieceIndex` see from `direction`: nothing in the depth map nearer the camera than
// a vertex (beyond the slack) means sky.
function look(vertices, pieceIndex, direction, camera, pixels) {
  const { right, top, near, far } = camera;
  const texel = (2 * right) / MAP_SIZE;
  const seen = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let vertex = 0; vertex < vertices.count; vertex += 1) {
    if (vertices.piece[vertex] !== pieceIndex) {
      continue;
    }
    const facing = normal.fromArray(vertices.normals, vertex * 3).dot(direction);
    if (facing < LEAST_FACING) {
      continue;
    }
    const slant = Math.sqrt(1 - facing * facing) / facing;
    seen.fromArray(vertices.points, vertex * 3).addScaledVector(normal, LIFT_TEXELS * texel).applyMatrix4(camera.matrixWorldInverse);
    const column = Math.min(Math.max(Math.floor((seen.x / right / 2 + 0.5) * MAP_SIZE), 0), MAP_SIZE - 1);
    const row = Math.min(Math.max(Math.floor((seen.y / top / 2 + 0.5) * MAP_SIZE), 0), MAP_SIZE - 1);
    const depth = (-seen.z - near) / (far - near);
    const offset = (row * MAP_SIZE + column) * 4;
    const nearest = unpackDepth(pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]);
    vertices.total[vertex] += facing;
    if ((depth - nearest) * (far - near) <= SLACK_TEXELS * texel * (1 + slant)) {
      vertices.open[vertex] += facing;
    }
  }
}

// The vertices inside the stretch's pieces, of every mesh coloured per vertex, in the world, as flat arrays: {
// count, points, normals (x, y, z each), piece (the index of the piece each is in), open, total (what it saw,
// see occlusion.js's shadeFor), colors and indices (where its colour is) }. The pieces split-meshes.js cut from
// one mesh share its vertices, so each colour buffer is taken once.
function collectVertices(world, pieces) {
  const found = { points: [], normals: [], piece: [], colors: [], indices: [] };
  const taken = new Set();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  world.traverse((object) => {
    const { geometry, material } = object;
    if (!object.isMesh || object.isInstancedMesh || Array.isArray(material) || !material.vertexColors) {
      return;
    }
    const { position, normal: normals, color } = geometry.attributes;
    if (!color || taken.has(color)) {
      return;
    }
    taken.add(color);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
      const pieceIndex = pieces.findIndex((piece) => piece.containsPoint(point));
      if (pieceIndex >= 0) {
        normal.fromBufferAttribute(normals, index).applyMatrix3(normalMatrix).normalize();
        found.points.push(point.x, point.y, point.z);
        found.normals.push(normal.x, normal.y, normal.z);
        found.piece.push(pieceIndex);
        found.colors.push(color);
        found.indices.push(index);
      }
    }
  });
  const count = found.piece.length;
  return {
    ...found,
    count,
    points: new Float32Array(found.points),
    normals: new Float32Array(found.normals),
    open: new Float32Array(count),
    total: new Float32Array(count),
  };
}

// Multiplies each vertex's colour by its shade.
function applyShade(vertices) {
  for (let vertex = 0; vertex < vertices.count; vertex += 1) {
    const shade = shadeFor(vertices.open[vertex], vertices.total[vertex], DARKEST);
    const color = vertices.colors[vertex];
    const index = vertices.indices[vertex];
    color.setXYZ(index, color.getX(index) * shade, color.getY(index) * shade, color.getZ(index) * shade);
    color.needsUpdate = true;
  }
}

// Hides what is drawn see-through or cut out of its texture (the chain-link fence, fronds, bunting), which the
// depth material would draw solid, and returns those meshes.
function hideSeeThrough(world) {
  const hidden = [];
  world.traverse((object) => {
    if (object.isMesh && object.visible && (object.material.transparent || object.material.alphaTest > 0)) {
      object.visible = false;
      hidden.push(object);
    }
  });
  return hidden;
}
