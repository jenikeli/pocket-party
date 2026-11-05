// The 3D race's item rules (M8): the race's item state, and every step: boxes broken and coming back, the
// roulette, using the held item (a player's Item button, a CPU kart's cpu-items.js), the running effects
// counting down, and stepping what the items started (road objects, the teleport, magnets and pushes, sticky
// walls; each in its own file). Plain functions on the race's plain data, no Three.js or DOM, unit tested in
// Node. Used by race.js (createRace, stepRace) and by the items in item-catalog.js (startEffect).

import { ITEM_CATALOG, BUILT_ITEMS } from './item-catalog.js';
import { createBoxes, breakBoxesAt, countBoxesBack } from './item-boxes.js';
import { stepObjects, standingBlockers } from './road-objects.js';
import { stepTeleport } from './teleport.js';
import { applyFieldForces } from './field-forces.js';
import { stepStickyWalls } from './sticky-walls.js';
import { cpuWantsItem } from './cpu-items.js';
import { countDownEffect } from './kart-effect.js';
import { createRandom } from '../random.js';
import { tuning } from '../tuning.js';
import { RACE_PHASES } from '../race-phases.js';

// The item draws' seed for a race that does not pass one, so the tests' races repeat exactly.
export const DEFAULT_ITEM_SEED = 8;

// A new seed for the game to start each race with. Without it every race would start from the same random
// numbers, and so draw the same items at the first pickups.
export function freshItemSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

// The items' own effects start with startEffect (kart-effect.js); it is exported here too, with the rest of the
// item rules.
export { startEffect } from './kart-effect.js';

// A CPU kart waits somewhere in this many seconds after its item lands before it may use it, so a field of
// CPU karts does not use theirs all at once.
const CPU_WAIT_FROM = 0.5;
const CPU_WAIT_TO = 2;

// The race's item state: { allowed, random, boxes, objects, nextObjectId, teleport, stickyLeft }. `allowedItems`
// lists the item ids the setup allows; with none, items are off: no boxes, as before M8. random is the race's
// own random numbers' state (see drawRandom), which starts from `seed`: the game passes a fresh one each race,
// so the items differ from race to race, and the tests a fixed one, so a race with the same driving repeats;
// boxes are item-boxes.js's; objects what items left on the road (road-objects.js's) and nextObjectId the id the next one gets; teleport the running teleport (teleport.js's,
// null when none) and stickyLeft the seconds the walls stay sticky (sticky-walls.js's, 0 when they are not).
export function createItems(track, allowedItems, seed) {
  const allowed = allowedItems.filter((id) => BUILT_ITEMS.includes(id));
  return {
    allowed,
    random: seed,
    boxes: allowed.length > 0 ? createBoxes(track) : [],
    objects: [],
    nextObjectId: 1,
    teleport: null,
    stickyLeft: 0,
  };
}

// A kart's item state at the start: { held, rollLeft, effect, stuckLeft, landedAt, cpuWait, jumpedAt,
// stickAgainIn, stickyWalls, button, buttonBefore }.
// held is the item ready to use, or null; rollLeft the roulette's seconds left (0 when not rolling); effect the
// kart's running effect { item, left }, or null; stuckLeft the seconds it is still held on a sticky wall (0 when
// free; stickAgainIn and stickyWalls are sticky-walls.js's too). The rest are this file's own: landedAt the race
// time the roulette landed its item and cpuWait how long a CPU kart waits from then; jumpedAt the race
// time it last used a jump, or null (jump.js);
// button the Item button this step (race.js sets it from the controls) and buttonBefore last step's.
export function freshItem() {
  return {
    held: null,
    rollLeft: 0,
    effect: null,
    stuckLeft: 0,
    landedAt: 0,
    cpuWait: 0,
    jumpedAt: null,
    stickAgainIn: 0,
    stickyWalls: false,
    button: false,
    buttonBefore: false,
  };
}

// One step of the items, after the karts moved and bumped. Boxes break whenever any kart drives through them,
// but only a kart still racing (not at the results, not finished) gets an item from one or uses one; running
// effects and roulettes go on regardless, so they still run out. Then the running magnets and pushes act, and
// the sticky walls hold and let go.
export function stepItems(race, track, dt) {
  countBoxesBack(race.items.boxes, dt);
  stepObjects(race, track, dt);
  stepTeleport(race, track, dt, () => drawRandom(race.items));
  tellCpusOfBlockers(race, track);
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
      startRoulette(kart);
    }
    if (kart.item.held !== null && wantsToUse(race, track, kart, pressed)) {
      ITEM_CATALOG[kart.item.held].use(race, track, kart);
      kart.item.held = null;
    }
  }
  applyFieldForces(race, dt);
  stepStickyWalls(race, track, dt);
}

// The CPU drivers pass a standing blocker as they pass a slow kart (cpu-aim.js), so each gets the list.
function tellCpusOfBlockers(race, track) {
  const blockers = standingBlockers(track, race.items.objects);
  for (const kart of race.karts.filter((each) => each.cpu !== null)) {
    kart.cpu.obstacles = blockers;
  }
}

// The running effect and the roulette count down; a roulette at 0 lands its item.
function countDown(race, kart, dt) {
  countDownEffect(kart, dt);
  const item = kart.item;
  if (item.rollLeft > 0) {
    item.rollLeft = Math.max(item.rollLeft - dt, 0);
    if (item.rollLeft === 0) {
      item.held = drawItem(race.items.allowed, drawRandom(race.items));
      item.landedAt = race.time;
      item.cpuWait = CPU_WAIT_FROM + (CPU_WAIT_TO - CPU_WAIT_FROM) * drawRandom(race.items);
    }
  }
}

// The roulette starts; its item is drawn when it stops (countDown), every allowed item equally likely.
function startRoulette(kart) {
  kart.item.rollLeft = tuning.itemRouletteSeconds;
}

// One of the `allowed` item ids (a non-empty list), the same chance for each. `random` is a number in 0..1
// from the race's own random numbers.
export function drawItem(allowed, random) {
  return allowed[Math.floor(random * allowed.length)];
}

// A player uses the item on the step the Item button goes down (holding it does nothing more); a kart the CPU
// drives (a CPU kart, a stand-in) when cpu-items.js says so. Not while respawning, and an item that needs the
// ground (the jump) keeps waiting in the slot while the kart is in the air or held on a sticky wall (whose hold
// would stop the launch).
function wantsToUse(race, track, kart, pressed) {
  if (kart.respawnIn !== null) {
    return false;
  }
  if (ITEM_CATALOG[kart.item.held].needsGround && (!kart.grounded || kart.item.stuckLeft > 0)) {
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
