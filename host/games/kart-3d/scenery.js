// The 3D race's world: a gradient sky with the sun in it, the sea far below (the road floats, so leaving it
// means falling), pillars holding the road up, the sun with one shadow map over the whole track, and the road.
// A course that names a scenery (track.scenery) gets that scenery's road and dressing round it; without one it
// has M7c's plain road (track-mesh.js) and nothing more. Built once from the track's stations, all in one
// group, so a different course can replace it. Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { buildTrackMesh } from './track-mesh.js';
import { buildSeasideScenery } from './seaside-scenery.js';
import { buildTestTrackRoad, buildTestTrackScenery } from './test-track-scenery.js';

const SEA_LEVEL = -30;
const SKY_TOP = 0x3d8bff;
const HORIZON = 0xcfe8ff;
const SEA = 0x2b7bb9;
// A pillar every this many stations, where the road is flat enough to stand on one.
const PILLAR_SPACING = 24;
const ROAD_THICKNESS = 0.6;
// Where the sun is, seen from the course's middle: low enough (about 34 degrees up) to show in the sky on the
// legs that head toward it and to cast long shadows, as on MK8DX's sunny courses.
const SUN_OFFSET = new THREE.Vector3(-90, 120, -150);
const SUN_DIRECTION = SUN_OFFSET.clone().normalize();
// What each scenery draws, by the name a course gives in its `scenery`: buildRoad(track) returns { meshes,
// update(dt, race), dispose() }; buildDressing gets { world, track, sea, keep } and returns { update(dt, race) }
// for whatever it moves. Seaside Skyway keeps M7c's road until M7d3 rebuilds it from the kit; the Test track
// shows the kit's pieces (M7d2).
const SCENERIES = {
  seaside: { buildRoad: buildTrackMesh, buildDressing: buildSeasideScenery },
  'test-track': { buildRoad: buildTestTrackRoad, buildDressing: buildTestTrackScenery },
};
const PLAIN = { buildRoad: buildTrackMesh, buildDressing: null };

// Adds everything to `scene`. Returns { update(dt, race), dispose() }: update moves the scenery on by the real
// time since the last drawn frame (waves, boats, panels) and shows the race's state on it (the start lights;
// race is null on the setup screen); dispose takes it out of the scene again and frees what it created.
export function buildScenery(scene, track) {
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };
  scene.fog = new THREE.Fog(HORIZON, 150, 600);
  const world = new THREE.Group();
  const sky = createSky();
  keep(sky.geometry);
  keep(sky.material);
  world.add(sky);
  const sea = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3000, 3000)),
    keep(new THREE.MeshStandardMaterial({ color: SEA, roughness: 0.35 })),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  world.add(sea, createPillars(track, keep));
  addLights(world, track, keep);
  const { buildRoad, buildDressing } = track.scenery === null ? PLAIN : SCENERIES[track.scenery];
  const road = buildRoad(track);
  world.add(...road.meshes);
  const dressing = buildDressing?.({ world, track, sea, keep });
  scene.add(world);
  function update(dt, race) {
    road.update(dt, race);
    dressing?.update(dt, race);
  }
  function dispose() {
    scene.remove(world);
    road.dispose();
    disposables.forEach((thing) => thing.dispose());
  }
  return { update, dispose };
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
  sun.position.copy(centre).add(SUN_OFFSET);
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

// What glossy surfaces (the karts' paint and chrome) reflect, the same for every course: the sky dome below,
// blurred by Three.js's PMREM into an environment map. Our own sky, not a studio scene, so the karts mirror blue
// sky and sea and glint only where the sun is. Returns the map's render target; dispose it when done.
export function createSkyEnvironment(renderer) {
  const sky = createSky();
  const skyScene = new THREE.Scene().add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  // The far plane must reach the dome.
  const environment = pmrem.fromScene(skyScene, 0, 1, 1000);
  pmrem.dispose();
  sky.geometry.dispose();
  sky.material.dispose();
  return environment;
}

// A gradient dome, drawn without lighting or fog: blue overhead fading to haze at the horizon and sea blue below
// it (hidden by the sea in the race, seen in reflections), with the sun in it: a small disc far brighter than
// white (it glows on the High quality setting) in a soft halo. The caller disposes its geometry and material.
function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(SKY_TOP) },
      horizon: { value: new THREE.Color(HORIZON) },
      sea: { value: new THREE.Color(SEA) },
      sunDirection: { value: SUN_DIRECTION },
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 sea;
      uniform vec3 sunDirection;
      varying vec3 direction;
      void main() {
        float height = normalize(direction).y;
        vec3 sky = height >= 0.0 ? mix(horizon, top, clamp(height * 2.0, 0.0, 1.0)) : mix(horizon, sea, clamp(-height * 4.0, 0.0, 1.0));
        float towardSun = max(dot(normalize(direction), sunDirection), 0.0);
        vec3 sun = vec3(1.0, 0.95, 0.85) * (pow(towardSun, 2000.0) * 8.0 + pow(towardSun, 16.0) * 0.4);
        gl_FragColor = vec4(sky + sun, 1.0);
        // Three.js's own output steps, so the sky matches the lit materials.
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), material);
}
