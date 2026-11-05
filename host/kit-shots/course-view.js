// The kit-shots page's whole-course mode (?course=<id>): builds a course as the race does (buildScenery with the photo
// asphalt, the baked shade and the course light; no karts) and draws it from the chase camera's spot, from high above
// one distance, or from high above the whole course. Used by viewer.js. Its build repeats renderer.js's buildWorld
// (sky light, bake, course light), so keep the two in step. Nothing is updated, so moving pieces show their rest pose.

import * as THREE from 'three';
import { COURSES } from '../games/kart-3d/courses.js';
import { buildTrack } from '../games/kart-3d/track-builder.js';
import { buildScenery, createSkyEnvironment } from '../games/kart-3d/scenery.js';
import { bakeShade } from '../games/kart-3d/baked-shade.js';
import { createCourseLight } from '../games/kart-3d/course-light.js';
import { loadPhotoAsphalt } from '../games/kart-3d/photo-asphalt.js';
import { courseExtent, stationIndexAt } from '../games/kart-3d/track.js';
import { createBloom } from '../games/kart-3d/bloom.js';
import { tuning } from '../games/kart-3d/tuning.js';

const WIDTH = 1280;
const HEIGHT = 720;
// How high the "above" view hangs over the road, and how far ahead of the chase camera the near view looks.
const ABOVE_HEIGHT = 60;
const NEAR_LOOK_AHEAD = 20;
// The overview hangs this many times the course's reach above its middle.
const OVERVIEW_HEIGHT = 2.2;
// How much of the sky the sea mirrors (the same as renderer.js's SKY_REFLECTIONS).
const SKY_REFLECTIONS = 0.4;

const toVector = ({ x, y, z }) => new THREE.Vector3(x, y, z);

// The chase camera's spot at distance `s` (cameraBehind behind and cameraAbove above the centre line), looking
// along the road.
function nearCamera(track, s) {
  const station = track.stations[stationIndexAt(track, s)];
  const tangent = toVector(station.tangent);
  const camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 1500);
  camera.position.copy(toVector(station.point)).addScaledVector(tangent, -tuning.cameraBehind);
  camera.position.y += tuning.cameraAbove;
  camera.lookAt(toVector(station.point).addScaledVector(tangent, NEAR_LOOK_AHEAD));
  return camera;
}

// Straight down on `s` from ABOVE_HEIGHT, the road's direction up the picture.
function aboveCamera(track, s) {
  const station = track.stations[stationIndexAt(track, s)];
  const target = toVector(station.point);
  const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 1, 1500);
  camera.position.copy(target);
  camera.position.y += ABOVE_HEIGHT;
  camera.up.copy(toVector(station.tangent));
  camera.lookAt(target);
  return camera;
}

// Straight down on the course's middle from high enough to see all of it, north (-z) up the picture.
function overviewCamera(track) {
  const { centre, reach } = courseExtent(track);
  const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 1, 3000);
  camera.position.set(centre.x, reach * OVERVIEW_HEIGHT, centre.z);
  camera.up.set(0, 0, -1);
  camera.lookAt(centre.x, 0, centre.z);
  return camera;
}

// Builds the course `courseId` (an id from COURSES) and returns draw(view, s): one frame of 'near', 'above' (both
// at distance `s` along the road) or 'overview' (`s` unused). With `bloom` the frame goes through the race's bloom.
export async function buildCourseView(courseId, bloom) {
  const course = COURSES.find((candidate) => candidate.id === courseId);
  if (!course) {
    throw new Error(`Unknown course "${courseId}". Known courses: ${COURSES.map((known) => known.id).join(', ')}`);
  }
  const track = buildTrack(course);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene();
  const world = buildScenery(scene, track, { photoAsphalt: await loadPhotoAsphalt(), plainCourse: false });
  // The same order as the race's buildWorld (renderer.js): the sky's light, the shade baked, then the course light.
  const skyLight = createSkyEnvironment(renderer);
  scene.environment = skyLight.texture;
  scene.environmentIntensity = 1;
  bakeShade(renderer, world.group, track);
  world.sea.material.envMap = skyLight.texture;
  world.sea.material.envMapIntensity = SKY_REFLECTIONS;
  scene.environment = createCourseLight(renderer, scene, track, world.sun).texture;
  scene.environmentIntensity = tuning.courseLightStrength;
  const bloomPass = bloom ? createBloom(renderer) : null;
  bloomPass?.setSize(WIDTH, HEIGHT);

  return function draw(view, s) {
    renderer.toneMappingExposure = tuning.exposure;
    const camera = { near: nearCamera, above: aboveCamera, overview: overviewCamera }[view]?.(track, s);
    if (!camera) {
      throw new Error(`Unknown view "${view}": use near, above or overview`);
    }
    // The race fits the sun's shadow map round each view in turn, and the overview takes the whole course's.
    world.sun.usePerView(view !== 'overview');
    if (view !== 'overview') {
      world.sun.fitView(camera);
    }
    renderer.shadowMap.needsUpdate = true;
    if (bloomPass) {
      bloomPass.render((target) => {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
      });
    } else {
      renderer.render(scene, camera);
    }
  };
}
