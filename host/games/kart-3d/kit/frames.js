// Placing the kit's pieces on and beside the road: a frame (a position and three axes) at a station, from which
// a piece's matrix is made. A piece is modelled standing on y = 0 and facing +z; its frame stands it on the road
// (y along the road's normal) facing the way it is told. Used by the kit's pieces.

import * as THREE from 'three';

// A frame at a station: x = y cross z, y up the road's normal, z `facing` (made square to y), at (lateral,
// lift) on the road. Returns a Matrix4.
export function frameAt(station, lateral, lift, facing) {
  const y = new THREE.Vector3(station.normal.x, station.normal.y, station.normal.z);
  const z = facing.clone().addScaledVector(y, -facing.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const position = new THREE.Vector3(station.point.x, station.point.y, station.point.z)
    .addScaledVector(new THREE.Vector3(station.right.x, station.right.y, station.right.z), lateral)
    .addScaledVector(y, lift);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(position);
}

// Facing back down the road, toward the karts coming.
export function facingBack(station) {
  return new THREE.Vector3(-station.tangent.x, -station.tangent.y, -station.tangent.z);
}

// Facing across the road toward its middle, from `side` (-1 left, 1 right).
export function facingRoad(station, side) {
  return new THREE.Vector3(station.right.x, station.right.y, station.right.z).multiplyScalar(-side);
}

// Facing along the road, the way karts drive.
export function facingAlong(station) {
  return new THREE.Vector3(station.tangent.x, station.tangent.y, station.tangent.z);
}

// How far out from the road's middle the ground ends on `side` (-1 left, 1 right) at `station`: the road plus
// that side's grass. Walls, barriers and the decks beside the road stand from here outward.
export function edgeLateral(station, side) {
  return side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft));
}

// One instanced mesh of `geometry` at each of `matrices` (one draw call for them all), casting and receiving
// shadows. `colors` (optional) gives each instance's colour as a hex, multiplied with the material's.
export function placeInstances(geometry, material, matrices, colors = null) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  colors?.forEach((hex, index) => mesh.setColorAt(index, new THREE.Color(hex)));
  return withShadows(mesh);
}

// Makes `mesh` cast shadows and receive them, and returns it.
export function withShadows(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
