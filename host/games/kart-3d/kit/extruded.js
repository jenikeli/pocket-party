// A flat outline pushed out into a slab, as an indexed geometry so it merges with Three.js's own shapes (an
// ExtrudeGeometry alone is not indexed). Used by the beach props' parasol scallops and surfboards.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function extruded(shape, options) {
  const slab = new THREE.ExtrudeGeometry(shape, options);
  const indexed = mergeVertices(slab);
  slab.dispose();
  return indexed;
}
