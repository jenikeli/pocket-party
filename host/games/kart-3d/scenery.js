// The 3D race's world: a gradient sky with the sun in it, the sea far below (the road floats, so leaving it
// means falling), the sun and its shadow map (sun.js), and the course's scenery: every course names one
// (track.scenery), which draws its road and dresses it from the kit (kit/), the supports that hold the road up
// included. Built once from the track's stations, all in one group, so a different course can replace it. Since
// M7d4b the road and each part of the dressing are named groups, which the Measure tool (measure-run.js) hides
// one at a time, and their big meshes are cut into cells so views skip what they do not see (split-meshes.js).
// In the plain course (plain-course.js) the dressing is only the barriers (plain-scenery.js). Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { buildSeasideRoad, buildSeasideScenery } from './seaside-scenery.js';
import { buildTestTrackRoad, buildTestTrackScenery } from './test-track-scenery.js';
import { buildPlainDressing } from './plain-scenery.js';
import { addSun, SUN_OFFSET } from './sun.js';
import { splitIntoCells } from './split-meshes.js';

const SKY_TOP = 0x3d8bff;
const HORIZON = 0xcfe8ff;
const SEA = 0x2b7bb9;
// The flat sky light (a hemisphere light: pale blue from above, sea blue from below), turned down to this share:
// the course's own light (course-light.js, or in the plain course the sky's environment map) does most of the
// lighting.
const SKY_LIGHT = 1.3 * 0.3;
const SUN_DIRECTION = SUN_OFFSET.clone().normalize();
// The course's big meshes are cut into square cells this many units across. Chosen from M7d4b1's device runs:
// cells cost the iPad nothing, and cells of 200 were the laptop's fastest with a shadow map per view (2 ms
// faster than none with 4 views, and fewer draw calls than cells of 100).
const CELL_SIZE = 200;
// Each scenery by the name a course gives in its `scenery`: how far below the start line the sea lies;
// buildRoad(track, photoAsphalt), which returns { meshes, update(dt, race), dispose() }; and buildDressing({
// world, track, sea, keep }), which returns { update(dt, race) } for whatever it moves.
const SCENERIES = {
  seaside: { seaLevel: -14, buildRoad: buildSeasideRoad, buildDressing: buildSeasideScenery },
  'test-track': { seaLevel: -30, buildRoad: buildTestTrackRoad, buildDressing: buildTestTrackScenery },
};

// Adds everything to `scene`. `photoAsphalt` is the photo-scanned asphalt's textures (photo-asphalt.js);
// `plainCourse` true dresses the course with only its barriers (plain-scenery.js). Returns {
// group, sun, sea, update(dt, race), showParts(hidden), dispose() }: group holds it all; sun is sun.js's;
// sea the sea's mesh;
// update moves the scenery on by the real time since the last drawn frame (waves, boats, panels) and shows the
// race's state on it (the start lights; race is null on the setup screen); showParts hides the parts named in
// `hidden` ('road', 'sea' or a kit part, kit/kit.js) and shows the rest; dispose takes it all out of the scene
// again and frees what it created.
export function buildScenery(scene, track, { photoAsphalt, plainCourse }) {
  const scenery = SCENERIES[track.scenery];
  if (!scenery) {
    throw new Error(`No scenery called "${track.scenery}" in scenery.js: every course must name one`);
  }
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
  sea.name = 'sea';
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = scenery.seaLevel;
  world.add(sea);
  addSkyLight(world);
  const sun = addSun(world, track, keep);
  const road = scenery.buildRoad(track, photoAsphalt);
  const roadGroup = new THREE.Group();
  roadGroup.name = 'road';
  roadGroup.add(...road.meshes);
  world.add(roadGroup);
  const dressing = (plainCourse ? buildPlainDressing : scenery.buildDressing)({ world, track, sea, keep });
  // The road and the dressing's parts are the world's groups; the sky, sea and lights are not.
  const parts = world.children.filter((child) => child.isGroup);
  parts.forEach((part) => splitIntoCells(part, CELL_SIZE, keep));
  scene.add(world);
  function update(dt, race) {
    road.update(dt, race);
    dressing.update(dt, race);
  }
  function showParts(hidden) {
    sea.visible = !hidden.includes('sea');
    parts.forEach((part) => (part.visible = !hidden.includes(part.name)));
  }
  function dispose() {
    scene.remove(world);
    road.dispose();
    disposables.forEach((thing) => thing.dispose());
  }
  return { group: world, sun, sea, update, showParts, dispose };
}

// The sky light the race has: a hemisphere light added to `world`. Exported so the kit-shots page lights a single
// piece exactly as the race does.
export function addSkyLight(world) {
  world.add(new THREE.HemisphereLight(0xdcefff, 0x3a5a7a, SKY_LIGHT));
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
