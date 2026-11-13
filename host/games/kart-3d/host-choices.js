// The 3D race's choices made on the host's setup screen, beside each phone's own (host/kart/setup.js): the
// course, the engine class, the CPU level, the drawing quality and the items. Kept from race to race until the
// game goes back to the lobby. Plain functions, unit tested in Node. Used by host/games/kart-3d/index.js, and
// read by setup-panel.js.

import { COURSES } from './courses.js';
import { ENGINE_CLASSES, DEFAULT_ENGINE_CLASS } from './race.js';
import { CPU_LEVELS, DEFAULT_CPU_LEVEL } from './cpu-levels.js';
import { QUALITY_LEVELS } from './quality.js';
import { createItemSettings } from './items/item-settings.js';

// What each choice may be. The values come from the panel's own buttons, but are checked all the same.
const VALID = {
  courseId: (value) => COURSES.some((course) => course.id === value),
  engineClass: (value) => Object.hasOwn(ENGINE_CLASSES, value),
  cpuLevel: (value) => Object.hasOwn(CPU_LEVELS, value),
  quality: (value) => Object.hasOwn(QUALITY_LEVELS, value),
};

// `quality` is the host device's saved quality (quality.js's loadQuality). Returns { courseId, engineClass,
// cpuLevel, quality, items }: the first course, the default class and level, and every item allowed
// (items/item-settings.js).
export function createHostChoices(quality) {
  return {
    courseId: COURSES[0].id,
    engineClass: DEFAULT_ENGINE_CLASS,
    cpuLevel: DEFAULT_CPU_LEVEL,
    quality,
    items: createItemSettings(),
  };
}

// Sets the choice `kind` ('courseId', 'engineClass', 'cpuLevel' or 'quality') to `value` if it is one of its
// values. Returns whether it changed.
export function setChoice(choices, kind, value) {
  if (!VALID[kind](value) || choices[kind] === value) {
    return false;
  }
  choices[kind] = value;
  return true;
}
