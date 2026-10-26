// Cuts the course's big meshes into one mesh per square cell of the ground (M7d4b), so Three.js can skip the
// cells out of a camera's view. Three.js culls a whole mesh by one bounding sphere: a barrier style or the road,
// built as one mesh round the whole lap, was drawn in full for every view and for the shadow pass, wherever the
// camera looked. Used by host/games/kart-3d/scenery.js once the course is built.
//
// A merged mesh's pieces share its vertex buffers and each gets only its own list of triangles (an index), so
// the GPU holds the vertices once; an instanced mesh becomes one instanced mesh per cell. Meshes no bigger than a
// cell stay whole, and so does anything marked userData.keepWhole: instanced meshes moved instance by instance
// every frame (the boats, the crowd), whose code holds on to the mesh.

import * as THREE from 'three';
import { groupByCell, boundsOf } from './cells.js';

// Splits every mesh inside `group` that reaches over more than one cell of `cellSize` units. `keep(thing)`
// registers the new geometries and instanced meshes for disposal with the course.
export function splitIntoCells(group, cellSize, keep) {
  group.updateMatrixWorld(true);
  const meshes = [];
  group.traverse((object) => {
    if (object.isMesh && !object.userData.keepWhole && !Array.isArray(object.material) && reachesBeyond(object, cellSize)) {
      meshes.push(object);
    }
  });
  for (const mesh of meshes) {
    const pieces = mesh.isInstancedMesh ? splitInstances(mesh, cellSize) : splitTriangles(mesh, cellSize);
    if (pieces.length > 1) {
      pieces.forEach((piece) => keep(mesh.isInstancedMesh ? piece : piece.geometry));
      mesh.parent.add(...pieces);
      mesh.parent.remove(mesh);
    }
  }
}

// Whether the mesh's bounding sphere, as placed in the world, is wider than a cell.
function reachesBeyond(mesh, cellSize) {
  if (mesh.isInstancedMesh) {
    mesh.computeBoundingSphere();
    return mesh.boundingSphere.radius * mesh.matrixWorld.getMaxScaleOnAxis() > cellSize / 2;
  }
  if (!mesh.geometry.boundingSphere) {
    mesh.geometry.computeBoundingSphere();
  }
  return mesh.geometry.boundingSphere.radius * mesh.matrixWorld.getMaxScaleOnAxis() > cellSize / 2;
}

// One mesh per cell for a plain mesh, sorted by each triangle's middle in the world.
function splitTriangles(mesh, cellSize) {
  const { geometry } = mesh;
  const position = geometry.attributes.position;
  const vertexOf = geometry.index ? (corner) => geometry.index.getX(corner) : (corner) => corner;
  const triangleCount = (geometry.index ? geometry.index.count : position.count) / 3;
  const point = new THREE.Vector3();
  const middle = new THREE.Vector3();
  const middleOf = (triangle) => {
    middle.set(0, 0, 0);
    for (let corner = 0; corner < 3; corner += 1) {
      middle.add(point.fromBufferAttribute(position, vertexOf(triangle * 3 + corner)));
    }
    return middle.divideScalar(3).applyMatrix4(mesh.matrixWorld);
  };
  const IndexArray = position.count > 65535 ? Uint32Array : Uint16Array;
  return groupByCell(triangleCount, middleOf, cellSize).map((triangles) => {
    const indices = new IndexArray(triangles.length * 3);
    triangles.forEach((triangle, slot) => {
      for (let corner = 0; corner < 3; corner += 1) {
        indices[slot * 3 + corner] = vertexOf(triangle * 3 + corner);
      }
    });
    const piece = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      piece.setAttribute(name, attribute);
    }
    piece.setIndex(new THREE.BufferAttribute(indices, 1));
    // Three.js would work the bounds out from every vertex in the shared buffer, so they are set here from
    // this piece's own corners.
    const { centre, radius } = boundsOf(indices.length, (slot) => point.fromBufferAttribute(position, indices[slot]));
    piece.boundingSphere = new THREE.Sphere(new THREE.Vector3(centre.x, centre.y, centre.z), radius);
    return copyPlacement(mesh, new THREE.Mesh(piece, mesh.material));
  });
}

// One instanced mesh per cell, sorted by where each instance stands in the world.
function splitInstances(mesh, cellSize) {
  const matrix = new THREE.Matrix4();
  const place = new THREE.Vector3();
  const placeOf = (instance) => {
    mesh.getMatrixAt(instance, matrix);
    return place.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);
  };
  const color = new THREE.Color();
  return groupByCell(mesh.count, placeOf, cellSize).map((instances) => {
    const piece = new THREE.InstancedMesh(mesh.geometry, mesh.material, instances.length);
    instances.forEach((instance, slot) => {
      mesh.getMatrixAt(instance, matrix);
      piece.setMatrixAt(slot, matrix);
      if (mesh.instanceColor) {
        mesh.getColorAt(instance, color);
        piece.setColorAt(slot, color);
      }
    });
    return copyPlacement(mesh, piece);
  });
}

// The piece stands where the mesh stood and draws the way it drew.
function copyPlacement(mesh, piece) {
  piece.matrix.copy(mesh.matrix);
  piece.matrix.decompose(piece.position, piece.quaternion, piece.scale);
  piece.matrixAutoUpdate = mesh.matrixAutoUpdate;
  piece.castShadow = mesh.castShadow;
  piece.receiveShadow = mesh.receiveShadow;
  piece.renderOrder = mesh.renderOrder;
  piece.frustumCulled = mesh.frustumCulled;
  piece.userData = { ...mesh.userData };
  return piece;
}
