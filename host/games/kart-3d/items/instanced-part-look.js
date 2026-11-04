// One part of a kind of road object (a sandcastle's body, a kicker's plate) drawn for every object of that kind on
// the road (M8b): one instanced mesh, so a field of them is one draw call. Used by road-object-drawing.js, which
// places every instance again each frame.

import * as THREE from 'three';

// Objects of a kind the mesh holds at first; more make it again, bigger.
const FIRST_CAPACITY = 8;

// Returns { begin(count), place(index, matrix), end(), dispose() }: begin with how many objects there are this
// frame, place each, then end. Made now, visible but drawing nothing, so the renderer builds its shader while the
// game starts (renderer.js compiles every visible thing) instead of stalling when the first object appears; made
// again, bigger, when there are more objects than it holds. Disposing frees the geometry too (each part owns its
// own), not the material (which parts may share).
export function createInstancedPart(scene, geometry, material) {
  let mesh = null;
  make(FIRST_CAPACITY);

  function make(capacity) {
    if (mesh) {
      scene.remove(mesh);
      mesh.dispose();
    }
    mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // They move every frame, so a bounding sphere to cull by would always be stale.
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  function begin(count) {
    if (count > mesh.instanceMatrix.count) {
      make(Math.max(count, 2 * mesh.instanceMatrix.count));
    }
    mesh.count = count;
  }

  function place(index, matrix) {
    mesh.setMatrixAt(index, matrix);
  }

  function end() {
    mesh.visible = mesh.count > 0;
    mesh.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    scene.remove(mesh);
    mesh.dispose();
    geometry.dispose();
  }

  return { begin, place, end, dispose };
}
