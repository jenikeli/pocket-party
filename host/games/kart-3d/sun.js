// The 3D race's sun and its shadow map. In a race each view gets its own (M7d4b): a smaller map fitted round the
// ground ahead of that view's camera (shadow-fit.js) and drawn just before the view, so its shadows are sharper
// and the shadow pass skips casters far away (the course is cut into cells, split-meshes.js); M7d4b1's device
// runs chose it for its sharper shadows. The setup screen's overview flies round the whole course, so there one
// map covers all of it, as in M7c. Used by host/games/kart-3d/scenery.js, which adds it to the world, and
// renderer.js.

import * as THREE from 'three';
import { viewShadowCentre, snapToTexels } from './shadow-fit.js';
import { courseExtent } from './track.js';

// Where the sun is, seen from the course's middle: low enough (about 34 degrees up) to show in the sky on the
// legs that head toward it and to cast long shadows, as on MK8DX's sunny courses.
export const SUN_OFFSET = new THREE.Vector3(-90, 120, -150);
const COURSE_MAP_SIZE = 2048;
// The whole-course map reaches this far past the stations, for what stands beside the road.
const COURSE_MARGIN = 20;
// A view's square is 2 x VIEW_HALF_SIZE units across. At 1024 its texels are 0.14 units, against about 0.2 for
// Seaside Skyway's whole-course map at 2048, and four views fill as many shadow pixels as that one map.
const VIEW_MAP_SIZE = 1024;
const VIEW_HALF_SIZE = 70;
// The shadow camera sits this far back toward the sun from the middle of what it covers, and reaches this far
// past it, enough for the highest road and the sea below.
const SUN_DISTANCE = 220;
const SHADOW_FAR = 450;

// Adds the sun to `world`. `keep(thing)` registers the shadow map for disposal. Returns { light, setShadows(on),
// usePerView(perView), fitView(camera) }: shadows on or off; whether views get their own map (from the next
// shadow pass on); and, with maps per view, fitting the map round the view about to be drawn by `camera`.
export function addSun(world, track, keep) {
  const { centre, reach } = courseExtent(track);
  const courseCentre = new THREE.Vector3(centre.x, 0, centre.z);
  const courseReach = reach + COURSE_MARGIN;
  const light = new THREE.DirectionalLight(0xfff4e0, 2.6);
  light.castShadow = true;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.05;
  // The shadow map's own render target, freed with the rest when the course changes.
  keep(light.shadow);
  world.add(light, light.target);
  let perView = null;
  usePerView(false);

  // The shadow camera's box: `halfSize` units each way across the sun's view, round `centre`.
  function aim(centre, halfSize) {
    light.target.position.copy(centre);
    light.position.copy(centre).addScaledVector(SUN_OFFSET.clone().normalize(), SUN_DISTANCE);
    Object.assign(light.shadow.camera, { left: -halfSize, right: halfSize, top: halfSize, bottom: -halfSize, near: 10, far: SHADOW_FAR });
    light.shadow.camera.updateProjectionMatrix();
    light.target.updateMatrixWorld();
    light.updateMatrixWorld();
  }

  // A new map size takes a new render target: Three.js makes it at the next shadow pass when the old is gone.
  function usePerView(wanted) {
    if (wanted === perView) {
      return;
    }
    perView = wanted;
    // As Three.js frees an old shadow map itself: its depth texture first, then the target.
    light.shadow.map?.depthTexture?.dispose();
    light.shadow.map?.dispose();
    light.shadow.map = null;
    const size = perView ? VIEW_MAP_SIZE : COURSE_MAP_SIZE;
    light.shadow.mapSize.set(size, size);
    if (!perView) {
      aim(courseCentre, courseReach);
    }
  }

  function fitView(camera) {
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const centre = viewShadowCentre(camera.position, forward);
    const snapped = snapToTexels(centre, SUN_OFFSET, (2 * VIEW_HALF_SIZE) / VIEW_MAP_SIZE);
    aim(new THREE.Vector3(snapped.x, snapped.y, snapped.z), VIEW_HALF_SIZE);
  }

  return { light, setShadows: (on) => (light.castShadow = on), usePerView, fitView };
}
