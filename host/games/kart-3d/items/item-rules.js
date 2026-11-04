// The 3D race's item rules (M8): the race's item state, and every step: boxes broken and coming back, the
// roulette, using the held item (a player's Item button, a CPU kart's cpu-items.js), and the running effects
// counting down. Plain functions on the race's plain data, no Three.js or DOM, unit tested in Node. Used by
// race.js (createRace, stepRace) and by the items in item-catalog.js (startEffect).

import { ITEM_CATALOG, BUILT_ITEMS } from './item-catalog.js';
import { drawItem } from './item-odds.js';
import { createBoxes, breakBoxesAt, countBoxesBack } from './item-boxes.js';
import { cpuWantsItem } from './cpu-items.js';
import { countDownEffect } from './kart-effect.js';
import { createRandom } from '../random.js';
import { tuning } from '../tuning.js';
// race.js calls stepItems and this file reads its phases: each only while the race runs, never while the
// modules load, so the circle is harmless.
import { RACE_PHASES } from '../race-phases.js';

// The items' own effects start with startEffect (kart-effect.js); it is exported here too, with the rest of the
// item rules.
export { startEffect } from './kart-effect.js';

// The race's random numbers start here every race, so a race with the same driving repeats exactly (the tests
// rely on it).
const ITEM_SEED = 8;
// A CPU kart waits somewhere in this many seconds after its item lands before it may use it, so a field of
// CPU karts does not use theirs all at once.
const CPU_WAIT_FROM = 0.5;
const CPU_WAIT_TO = 2;

// The race's item state: { allowed, random, boxes }. `allowedItems` lists the item ids the setup allows; with
// none, items are off: no boxes, as before M8. random is the race's own random numbers' state (see
// drawRandom); boxes are item-boxes.js's.
export function createItems(track, allowedItems) {
  const allowed = allowedItems.filter((id) => BUILT_ITEMS.includes(id));
  return { allowed, random: ITEM_SEED, boxes: allowed.length > 0 ? createBoxes(track) : [] };
}

// A kart's item state at the start: { held, rollLeft, effect, landing, landedAt, cpuWait, button, buttonBefore }.
// held is the item ready to use, or null; rollLeft the roulette's seconds left (0 when not rolling); effect the
// kart's running effect { item, left }, or null. The rest are this file's own: landing the item the roulette
// will land on (drawn at the pickup); landedAt the race time it landed and cpuWait how long a CPU kart waits
// from then; button the Item button this step (race.js sets it from the controls) and buttonBefore last step's.
export function freshItem() {
  return {
    held: null,
    rollLeft: 0,
    effect: null,
    landing: null,
    landedAt: 0,
    cpuWait: 0,
    button: false,
    buttonBefore: false,
  };
}

// One step of the items, after the karts moved and bumped. Boxes break whenever any kart drives through them,
// but only a kart still racing (not at the results, not finished) gets an item from one or uses one; running
// effects and roulettes go on regardless, so they still run out.
export function stepItems(race, track, dt) {
  countBoxesBack(race.items.boxes, dt);
  const racing = race.phase === RACE_PHASES.RACING;
  for (const kart of race.karts) {
    const pressed = kart.item.button && !kart.item.buttonBefore;
    kart.item.buttonBefore = kart.item.button;
    countDown(race, kart, dt);
    const broke = breakBoxesAt(track, race.items.boxes, kart) > 0;
    if (!racing || kart.finishTime !== null) {
      continue;
    }
    if (broke && kart.item.held === null && kart.item.rollLeft === 0) {
      startRoulette(race, kart);
    }
    if (kart.item.held !== null && wantsToUse(race, track, kart, pressed)) {
      ITEM_CATALOG[kart.item.held].use(race, track, kart);
      kart.item.held = null;
    }
  }
}

// The running effect and the roulette count down; a roulette at 0 lands its item.
function countDown(race, kart, dt) {
  countDownEffect(kart, dt);
  const item = kart.item;
  if (item.rollLeft > 0) {
    item.rollLeft = Math.max(item.rollLeft - dt, 0);
    if (item.rollLeft === 0) {
      item.held = item.landing;
      item.landing = null;
      item.landedAt = race.time;
      item.cpuWait = CPU_WAIT_FROM + (CPU_WAIT_TO - CPU_WAIT_FROM) * drawRandom(race.items);
    }
  }
}

// The item is drawn now, by the kart's place, as in MK8DX: the roulette only shows it.
function startRoulette(race, kart) {
  kart.item.rollLeft = tuning.itemRouletteSeconds;
  kart.item.landing = drawItem(race.items.allowed, kart.place, race.karts.length, drawRandom(race.items));
}

// A player uses the item on the step the Item button goes down (holding it does nothing more); a kart the CPU
// drives (a CPU kart, a stand-in) when cpu-items.js says so. Not while falling: it keeps its item for after.
function wantsToUse(race, track, kart, pressed) {
  if (kart.respawnIn !== null) {
    return false;
  }
  return kart.cpu === null ? pressed : cpuWantsItem(race, track, kart);
}

// The next of the race's random numbers, 0..1. The state is a counter in race.items, so the race stays plain
// data: each number is the first of random.js's generator seeded with the counter, which then moves on.
function drawRandom(items) {
  const value = createRandom(items.random)();
  items.random += 1;
  return value;
}
