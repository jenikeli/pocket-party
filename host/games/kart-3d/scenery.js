// The 3D race's world around the road: a gradient sky, the sea far below (the road floats, so leaving it means
// falling), pillars holding the road up, and the sun with one shadow map over the whole track. Built once from
// the track's stations, all in one group, so a different course can replace it. Used by
// host/games/kart-3d/renderer.js.

import * as THREE from 'three';

const SEA_LEVEL = -30;
const SKY_TOP = 0x3d8bff;
const HORIZON = 0xcfe8ff;
// A pillar every this many stations, where the road is flat enough to stand on one.
const PILLAR_SPACING = 24;
const ROAD_THICKNESS = 0.6;

// Adds everything to `scene`. Returns { dispose() }, which takes it out of the scene again and frees what it
// created.
export function buildScenery(scene, track) {
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };
  scene.fog = new THREE.Fog(HORIZON, 150, 600);
  const world = new THREE.Group();
  world.add(createSky(keep));
  const sea = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3000, 3000)),
    keep(new THREE.MeshStandardMaterial({ color: 0x2b7bb9, roughness: 0.35 })),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  world.add(sea, createPillars(track, keep));
  addLights(world, track, keep);
  scene.add(world);
  function dispose() {
    scene.remove(world);
    disposables.forEach((thing) => thing.dispose());
  }
  return { dispose };
}

// One instanced mesh for every pillar: one draw call per view.
function createPillars(track, keep) {
  const spots = track.stations.filter((station, index) => index % PILLAR_SPACING === 0 && !station.gap && station.normal.y > 0.95);
  const pillars = new THREE.InstancedMesh(
    keep(new THREE.CylinderGeometry(1.2, 1.6, 1, 10)),
    keep(new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: 0.7 })),
    spots.length,
  );
  const matrix = new THREE.Matrix4();
  spots.forEach((station, index) => {
    const top = station.point.y - ROAD_THICKNESS;
    matrix.makeScale(1, top - SEA_LEVEL, 1).setPosition(station.point.x, (top + SEA_LEVEL) / 2, station.point.z);
    pillars.setMatrixAt(index, matrix);
  });
  pillars.castShadow = true;
  pillars.receiveShadow = true;
  return pillars;
}

// The sun's shadow map covers the whole track, so it is drawn once per frame and shared by every view.
function addLights(world, track, keep) {
  world.add(new THREE.HemisphereLight(0xdcefff, 0x3a5a7a, 1.3));
  const xs = track.stations.map((station) => station.point.x);
  const zs = track.stations.map((station) => station.point.z);
  const centre = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
  const reach = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2 + 20;
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.copy(centre).add(new THREE.Vector3(80, 200, 60));
  sun.target.position.copy(centre);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 10, far: 450 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  // The shadow map's own render target, freed with the rest when the course changes.
  keep(sun.shadow);
  world.add(sun, sun.target);
}

// A gradient dome, drawn without lighting or fog: blue overhead fading to haze at the horizon.
function createSky(keep) {
  const material = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(SKY_TOP) }, horizon: { value: new THREE.Color(HORIZON) } },
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
        // Three.js's own output steps, so the sky matches the lit materials.
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  return new THREE.Mesh(keep(new THREE.SphereGeometry(900, 32, 16)), material);
}
