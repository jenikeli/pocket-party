// A pool of thin glowing rings lying on the road, for the magnet's pulses and the push's shockwaves (M8c): each
// ring is one mesh with its own material (its opacity and the road it lies on change), made the first time it is
// needed and reused after, so a frame allocates nothing once the pool has grown to the most rings shown at once.
// A ring fades out past the road's edge (in its shader, from the road's frame at the kart), so a big ring does not
// hang over the void beside the course. Only drawing. Used by magnet-look.js and push-look.js.

import * as THREE from 'three';

// The ring's inner edge as a share of its radius: thin, but thicker the bigger it is, so far rings stay visible.
const INNER_SHARE = 0.93;
const SEGMENTS = 64;
// Rings float this far over the road so they do not flicker against it.
const LIFT = 0.12;
// A ring is gone at the road's edge, and fades over this distance before it.
const EDGE_FADE = 0.6;

const FACING = new THREE.Vector3(0, 0, 1);

// The ring is unlit (it does not dim in shade) with plain blending (it keeps its colour over the sky). Its alpha
// is `opacity`, less toward the road's edge: `lateral` is how far right of the road's middle the fragment is.
const VERTEX = `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }`;
const FRAGMENT = `
  uniform vec3 color;
  uniform float opacity;
  uniform vec3 roadMiddle;
  uniform vec3 roadRight;
  uniform float roadHalfWidth;
  varying vec3 vWorld;
  void main() {
    float lateral = dot(vWorld - roadMiddle, roadRight);
    float onRoad = 1.0 - smoothstep(roadHalfWidth - ${EDGE_FADE.toFixed(2)}, roadHalfWidth, abs(lateral));
    gl_FragColor = vec4(color, opacity * onRoad);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// Returns { begin(), place(pose, kart, track, radius, opacity), end(), dispose() }: begin, place each ring shown
// this frame (`pose` the kart's pose, race-views.js kartPose, `kart` and `track` for the road under it), then end,
// which hides the rest. `hex` is the ring's colour.
export function createRingPool(scene, hex) {
  const geometry = new THREE.RingGeometry(INNER_SHARE, 1, SEGMENTS);
  // One ring is made now, visible but invisible (opacity 0), so the renderer builds the shader while the game
  // starts (renderer.js compiles every visible thing) instead of stalling when the first ring appears.
  const rings = [makeRing()];
  let used = 0;
  const upVector = new THREE.Vector3();

  function begin() {
    used = 0;
  }

  function place(pose, kart, track, radius, opacity) {
    if (used === rings.length) {
      rings.push(makeRing());
    }
    const ring = rings[used];
    used += 1;
    const { position, up } = pose;
    const uniforms = ring.material.uniforms;
    const station = track.stations[kart.trackIndex];
    ring.visible = true;
    uniforms.opacity.value = opacity;
    uniforms.roadMiddle.value.set(kart.position.x, kart.position.y, kart.position.z).addScaledVector(station.right, -kart.lateral);
    uniforms.roadRight.value.set(station.right.x, station.right.y, station.right.z);
    uniforms.roadHalfWidth.value = station.halfWidth;
    ring.position.set(position.x + up.x * LIFT, position.y + up.y * LIFT, position.z + up.z * LIFT);
    ring.quaternion.setFromUnitVectors(FACING, upVector.set(up.x, up.y, up.z));
    ring.scale.setScalar(radius);
  }

  function end() {
    for (let index = used; index < rings.length; index += 1) {
      rings[index].visible = false;
    }
  }

  function makeRing() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(hex) },
        opacity: { value: 0 },
        roadMiddle: { value: new THREE.Vector3() },
        roadRight: { value: new THREE.Vector3(1, 0, 0) },
        roadHalfWidth: { value: 1 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.frustumCulled = false;
    ring.renderOrder = 2;
    scene.add(ring);
    return ring;
  }

  function dispose() {
    rings.forEach((ring) => {
      scene.remove(ring);
      ring.material.dispose();
    });
    geometry.dispose();
  }

  return { begin, place, end, dispose };
}
