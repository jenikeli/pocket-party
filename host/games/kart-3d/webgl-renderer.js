// The 3D race's Three.js WebGL renderer, with the settings the race needs, in `container`. Used by renderer.js.

import * as THREE from 'three';

export function createWebglRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Counted over a whole frame (every view and the shadow passes) for frameStats(), not per render() call.
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Three.js redraws the shadow map on every render() call, which would be once per view. Off, it is asked for
  // in draw(), before each view (each has its own map).
  renderer.shadowMap.autoUpdate = false;
  container.append(renderer.domElement);
  return renderer;
}
