// The M6a spike's kart models, built from simple shapes: a body, a nose, a seat and engine, four wheels and a
// driver. Each comes in two levels of detail (a few hundred and about 10,000 triangles), so the panel can
// measure the cost of detailed models. Used by spike-renderer.js.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAX_KARTS } from './kart-paths.js';

// Where the wheels sit (x, z): front and back, left and right.
const WHEEL_SPOTS = [[-0.65, 0.7], [0.65, 0.7], [-0.68, -0.75], [0.68, -0.75]];

// Parts are merged by material, so a kart is 4 draw calls whatever its detail, as a real model would be. Then
// the detail switch changes only the triangle count, not the number of draw calls. `look` null means the kart's
// own colour. A part is [low geometry, high geometry, x, y, z]; karts face +z.
const PART_GROUPS = [
  {
    look: null,
    parts: () => [
      [new THREE.BoxGeometry(1.3, 0.35, 2), stretched(new THREE.CapsuleGeometry(0.3, 1.4, 12, 32, 4), 2.2, 1, 1), 0, 0.45, 0],
      [new THREE.BoxGeometry(1, 0.25, 0.4), stretched(new THREE.SphereGeometry(0.3, 32, 16), 1.7, 0.8, 1.2), 0, 0.4, 1.05],
      [new THREE.SphereGeometry(0.29, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.3, -0.35],
    ],
  },
  {
    look: 'kartTrim',
    parts: () => [
      [new THREE.BoxGeometry(0.7, 0.5, 0.4), new THREE.CapsuleGeometry(0.25, 0.4, 8, 24, 2), 0, 0.8, -0.5],
      [new THREE.BoxGeometry(0.8, 0.4, 0.4), new THREE.CylinderGeometry(0.25, 0.25, 0.8, 32).rotateZ(Math.PI / 2), 0, 0.55, -1.0],
      [new THREE.BoxGeometry(0.5, 0.5, 0.35), new THREE.CapsuleGeometry(0.22, 0.3, 8, 24, 2), 0, 0.95, -0.3],
      ...WHEEL_SPOTS.map(([x, z]) => [hub(6), hub(32), x, 0.32, z]),
    ],
  },
  {
    look: 'tyre',
    parts: () => WHEEL_SPOTS.map(([x, z]) => [
      new THREE.CylinderGeometry(0.32, 0.32, 0.3, 10).rotateZ(Math.PI / 2),
      new THREE.TorusGeometry(0.22, 0.12, 14, 32).rotateY(Math.PI / 2),
      x, 0.32, z,
    ]),
  },
  {
    look: 'skin',
    parts: () => [[new THREE.SphereGeometry(0.25, 8, 6), new THREE.SphereGeometry(0.25, 32, 20), 0, 1.25, -0.3]],
  },
];

function stretched(geometry, x, y, z) {
  return geometry.rotateX(Math.PI / 2).scale(x, y, z);
}

function hub(segments) {
  return new THREE.CylinderGeometry(0.14, 0.14, 0.32, segments).rotateZ(Math.PI / 2);
}

// Returns { karts, setDetailed(detailed), triangles(detailed), dispose() }: karts is MAX_KARTS groups, each
// with its 4 meshes, ready to add to the scene. `materials` is from materials.js.
export function createKartModels(materials) {
  const merged = PART_GROUPS.map((group) => mergeGroup(group.parts()));
  const karts = [];
  for (let index = 0; index < MAX_KARTS; index += 1) {
    const kart = new THREE.Group();
    PART_GROUPS.forEach((group, groupIndex) => {
      const mesh = materials.forMesh(new THREE.Mesh(merged[groupIndex].low), group.look ?? `kart${index}`);
      mesh.userData.groupIndex = groupIndex;
      mesh.castShadow = true;
      kart.add(mesh);
    });
    karts.push(kart);
  }

  function setDetailed(detailed) {
    for (const kart of karts) {
      for (const mesh of kart.children) {
        mesh.geometry = merged[mesh.userData.groupIndex][detailed ? 'high' : 'low'];
      }
    }
  }

  // Per kart.
  function triangles(detailed) {
    return merged.reduce((sum, group) => sum + countTriangles(group[detailed ? 'high' : 'low']), 0);
  }

  function dispose() {
    for (const group of merged) {
      group.low.dispose();
      group.high.dispose();
    }
  }

  return { karts, setDetailed, triangles, dispose };
}

// Moves each part to its place and merges the low and the high versions into one geometry each.
function mergeGroup(parts) {
  const low = parts.map(([geometry, , x, y, z]) => geometry.translate(x, y, z));
  const high = parts.map(([, geometry, x, y, z]) => geometry.translate(x, y, z));
  return { low: mergeAll(low), high: mergeAll(high) };
}

// Three.js's own shapes are all indexed with the same attributes, which is what mergeGeometries needs.
function mergeAll(geometries) {
  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) {
    geometry.dispose();
  }
  return merged;
}

function countTriangles(geometry) {
  return geometry.index.count / 3;
}
