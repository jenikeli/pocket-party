// The course in the 3D race's scene: builds one as a list of stages the renderer runs a frame apart (its road and
// scenery, its shade baked round the lap, its light taken from itself, then the scene's lighting set from it),
// replaces it with another course in the same scene, and frees it. Since M10 nothing is built until a race, Watch
// or Measure needs it. Used by host/games/kart-3d/renderer.js.

import { buildScenery } from './scenery.js';
import { createCourseLight } from './course-light.js';
import { bakeShade } from './baked-shade.js';
import { tuning } from './tuning.js';

// How much of the loading bar each stage fills: its rough share of the time in software (M9: about 14 s of
// Seaside Skyway's build is the scenery's drawn maps, 21 s the shade baked round the lap).
const STAGE_WEIGHTS = { scenery: 4, shade: 4, light: 1 };
// How much the sea mirrors the sky: at the course light's strength it would reflect so much pale horizon that it
// turns whitish.
const SKY_REFLECTIONS = 0.4;

// `environment` is the sky's environment map (scenery.js's createSkyEnvironment), `photoAsphalt` the
// photo-scanned asphalt's textures, `plainCourse` true for the plain course (plain-course.js), which skips the bake
// and the course light. Returns { buildStages(track), lightScene(), world(), track(), dispose() }: lightScene()
// lights the scene from the course once its stages have run; world() is scenery.js's world of the course built
// last (null before the first), track() its track.
export function createCourseWorld(renderer, scene, environment, { photoAsphalt, plainCourse }) {
  let world = null;
  let courseLight = null;
  let builtTrack = null;
  // Each course's baked shade, by track, once baked: baking the whole lap takes seconds, so a course built again
  // (another raced, then this one again) takes its shade from here.
  const bakedShades = new Map();

  // The stages ([{ label, weight, run() }], staged-build.js) that build `track` in place of the course built
  // before. Nothing may be drawn until the last has run.
  function buildStages(track) {
    const stages = [{ label: 'Building the course', weight: STAGE_WEIGHTS.scenery, run: () => buildRoadAndScenery(track) }];
    if (!plainCourse) {
      stages.push(
        { label: 'Baking the shade', weight: STAGE_WEIGHTS.shade, run: () => bakeCourseShade(track) },
        { label: 'Lighting the course', weight: STAGE_WEIGHTS.light, run: () => (courseLight = createCourseLight(renderer, scene, track, world.sun)) },
      );
    }
    return stages;
  }

  // The old course goes first, so two never take memory at once. The course's light is taken with the course lit
  // by the sky's reflections in full, as the sky would light it.
  function buildRoadAndScenery(track) {
    dispose();
    builtTrack = track;
    world = buildScenery(scene, track, { photoAsphalt, plainCourse });
    scene.environment = environment.texture;
    scene.environmentIntensity = 1;
  }

  function bakeCourseShade(track) {
    bakedShades.set(track, bakeShade(renderer, world.group, track, bakedShades.get(track)));
  }

  // Called once the stages have run. The plain course has no course light and is lit by the sky's environment
  // map at the same strength, so there is one lighting rule. The sea keeps the sky's reflections either way.
  function lightScene() {
    world.sea.material.envMap = environment.texture;
    world.sea.material.envMapIntensity = SKY_REFLECTIONS;
    scene.environment = courseLight ? courseLight.texture : environment.texture;
    scene.environmentIntensity = tuning.courseLightStrength;
  }

  function dispose() {
    world?.dispose();
    courseLight?.dispose();
    world = null;
    courseLight = null;
    builtTrack = null;
  }

  return { buildStages, lightScene, world: () => world, track: () => builtTrack, dispose };
}
