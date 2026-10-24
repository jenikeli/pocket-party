// The M6a spike's world: sky, ground, the road (asphalt, red and white curbs, banks under the hill), trees, and
// the sun with its shadow. Built once from road.js; the karts are added by kart-models.js. Used by
// spike-renderer.js.

import * as THREE from 'three';
import { roadFrame, pointBeside, distanceFromCentreLine, ROAD_HALF_WIDTH } from './road.js';

const ROAD_SEGMENTS = 600;
// Above the ground, so the two never fight over the same pixels. Karts ride at this height too.
export const ROAD_LIFT = 0.08;
const CURB_OUTER = 1.15;
const TREE_COUNT = 160;

// Adds everything to `scene`. `materials` is from materials.js. Returns the sun, whose shadow the renderer
// switches on and off.
export function buildWorld(scene, materials) {
  scene.add(createSky());
  scene.fog = new THREE.Fog(0xcfe8ff, 250, 800);

  const ground = materials.forMesh(new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200)), 'ground');
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const at = (offset) => (u) => liftPoint(pointBeside(roadFrame(u), offset), ROAD_LIFT);
  addStrip(scene, materials, 'road', stripGeometry(at(-1), at(1)));
  // Stripes about 4 units long, as on a racing curb.
  const stripes = (segment) => (Math.floor(segment / 3) % 2 === 0 ? [0.85, 0.1, 0.1] : [1, 1, 1]);
  addStrip(scene, materials, 'curb', stripGeometry(at(-CURB_OUTER), at(-1), stripes));
  addStrip(scene, materials, 'curb', stripGeometry(at(1), at(CURB_OUTER), stripes));
  addStrip(scene, materials, 'bank', stripGeometry(bankFoot(-1), at(-CURB_OUTER)));
  addStrip(scene, materials, 'bank', stripGeometry(at(CURB_OUTER), bankFoot(1)));

  addTrees(scene, materials);
  return addSun(scene);
}

function liftPoint(point, lift) {
  return { x: point.x, y: point.y + lift, z: point.z };
}

// Where the bank under a raised road meets the ground: further out the higher the road, for a slope of
// about 35 degrees. On flat road it sits just outside the curb, so the bank has no height.
function bankFoot(side) {
  return (u) => {
    const frame = roadFrame(u);
    const offset = side * (CURB_OUTER + 0.05 + (frame.point.y * 1.4) / ROAD_HALF_WIDTH);
    return { ...pointBeside(frame, offset), y: 0 };
  };
}

function addStrip(scene, materials, look, geometry) {
  const mesh = materials.forMesh(new THREE.Mesh(geometry), look);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// A ribbon all the way round the loop between two edges (functions of u; `left` is on the driver's left, so
// the faces point up). `segmentColor(segment)` gives an optional [r, g, b] per segment.
function stripGeometry(left, right, segmentColor = null) {
  const positions = [];
  const colors = [];
  for (let segment = 0; segment < ROAD_SEGMENTS; segment += 1) {
    const u0 = segment / ROAD_SEGMENTS;
    const u1 = (segment + 1) / ROAD_SEGMENTS;
    const corners = [left(u0), right(u0), left(u1), right(u0), right(u1), left(u1)];
    for (const corner of corners) {
      positions.push(corner.x, corner.y, corner.z);
      if (segmentColor) {
        colors.push(...segmentColor(segment));
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (segmentColor) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  geometry.computeVertexNormals();
  return geometry;
}

// One instanced mesh for all trunks and one for all crowns: two draw calls per view for 160 trees.
function addTrees(scene, materials) {
  const spots = treeSpots();
  const trunks = materials.forMesh(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), null, spots.length), 'trunk');
  const crowns = materials.forMesh(new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 6, 8), null, spots.length), 'leaves');
  const matrix = new THREE.Matrix4();
  spots.forEach((spot, index) => {
    trunks.setMatrixAt(index, matrix.makeTranslation(spot.x, 1.5, spot.z));
    crowns.setMatrixAt(index, matrix.compose(
      new THREE.Vector3(spot.x, 3 + 3 * spot.size, spot.z),
      new THREE.Quaternion(),
      new THREE.Vector3(spot.size, spot.size, spot.size),
    ));
  });
  for (const mesh of [trunks, crowns]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

// The same spots every run (a fixed pseudo-random sequence), well clear of the road and its banks.
function treeSpots() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const spots = [];
  while (spots.length < TREE_COUNT) {
    const x = (random() - 0.5) * 560;
    const z = (random() - 0.5) * 420;
    const size = 0.7 + random() * 0.6;
    if (distanceFromCentreLine(x, z) > 32) {
      spots.push({ x, z, size });
    }
  }
  return spots;
}

// The sun's shadow map covers the whole loop, so it is drawn once per frame and shared by every view.
function addSun(scene) {
  scene.add(new THREE.HemisphereLight(0xdcefff, 0x5a7a3a, 1.2));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(120, 200, 80);
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -210, right: 210, top: 210, bottom: -210, near: 10, far: 500 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  return sun;
}

// A gradient dome, drawn without lighting or fog: blue overhead fading to haze at the horizon.
function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x3d8bff) }, horizon: { value: new THREE.Color(0xcfe8ff) } },
    vertexShader: `
      varying float height;
      void main() {
        height = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 horizon;
      varying float height;
      void main() {
        gl_FragColor = vec4(mix(horizon, top, clamp(height * 2.0, 0.0, 1.0)), 1.0);
        // Three.js's own output steps, so the sky matches the lit materials whether it is drawn straight to
        // the screen or into the bloom's buffer (which converts later, in its output pass).
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), material);
}
