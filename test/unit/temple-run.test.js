// Unit tests for the temple run's track, path and rules (host/games/temple-run/): endless deterministic rows,
// corners, coins and powerups, dodging with jump, slide and lanes, turning, the monster never passing a runner,
// catches, revives, and the round ending.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rowObstacles, obstaclesBetween, pickupsBetween, cornerAt, nextCornerIndex, OBSTACLE, PICKUP, LANE_COUNT, TURN_BEFORE,
} from '../../host/games/temple-run/track.js';
import { pathPoint, ARC_LENGTH, straightSegments } from '../../host/games/temple-run/path.js';
import { layoutViews } from '../../host/games/temple-run/layout.js';
import { templeIcon, TEMPLE_ICON_NAMES } from '../../shared/temple-icons.js';
import {
  createRound, stepRound, applyAction, reviveRunner, removeRoundPlayer, chaserOf, turnPrompt, REVIVE_WINDOW_SECONDS, REVIVE_COST,
} from '../../host/games/temple-run/rules.js';
import { roundView } from '../../host/games/temple-run/views.js';
import { DEFAULT_SETTINGS, SETTING_ROWS, cycleSetting, settingText } from '../../host/games/temple-run/settings.js';
import { fireIsOn, obstacleId, TILE_FALL_DELAY } from '../../host/games/temple-run/track.js';

const DT = 1 / 60;
const SEED = 7;

// A running round with a chaser 'c' and runners 'a' and 'b'.
function runningRound(settings = DEFAULT_SETTINGS, cpuIds = []) {
  const round = createRound({ playerIds: ['c', 'a', 'b'], chaserId: 'c', seed: SEED, settings, cpuIds });
  round.phase = 'run';
  return round;
}

// Puts a player at distance z with the right next corner, so nothing counts as a missed turn.
function place(round, id, z, lane) {
  const player = round.players.get(id);
  player.z = z;
  player.nextCorner = nextCornerIndex(round.seed, z);
  if (lane !== undefined) {
    player.lane = lane;
  }
  return player;
}

test('track: same seed gives the same rows, no row has more than one wall, and corners stay clear', () => {
  assert.deepEqual(rowObstacles(5, 12), rowObstacles(5, 12));
  for (let row = 0; row < 500; row += 1) {
    assert.ok(rowObstacles(9, row).filter((obstacle) => obstacle.type === OBSTACLE.WALL).length <= 1);
  }
  const corner = cornerAt(SEED, 0);
  assert.equal(obstaclesBetween(SEED, corner.z - 20, corner.z + 10).length, 0);
  assert.equal(pickupsBetween(SEED, corner.z - 20, corner.z + 10).length, 0);
});

test('track: obstaclesBetween and pickupsBetween stay inside the range', () => {
  const found = obstaclesBetween(3, 100, 300);
  assert.ok(found.length > 0);
  assert.ok(found.every((obstacle) => obstacle.z >= 100 && obstacle.z <= 300 && obstacle.lane < LANE_COUNT));
  const pickups = pickupsBetween(3, 100, 1500);
  assert.ok(pickups.some((pickup) => pickup.kind === PICKUP.COIN));
  assert.ok(pickups.some((pickup) => pickup.kind !== PICKUP.COIN));
  assert.ok(pickups.every((pickup) => pickup.z >= 100 && pickup.z <= 1500));
});

test('path: continuous, and a right turn faces right afterwards', () => {
  const first = cornerAt(SEED, 0);
  const before = pathPoint(SEED, first.z - 5);
  assert.equal(before.heading, 0);
  const after = pathPoint(SEED, first.z + ARC_LENGTH + 5);
  assert.ok(Math.abs(after.heading) > 1.5);
  assert.ok(Math.abs(Math.abs(after.heading) - Math.PI / 2) < 1e-9 || Math.abs(after.heading) > 1.5);
  let previous = pathPoint(SEED, 0);
  for (let s = 0.5; s < 600; s += 0.5) {
    const point = pathPoint(SEED, s);
    assert.ok(Math.hypot(point.x - previous.x, point.z - previous.z) < 0.75, `jump at s=${s}`);
    previous = point;
  }
});

test('countdown leads to run after 3 seconds', () => {
  const round = createRound({ playerIds: ['c', 'a'], chaserId: 'c', seed: 1 });
  for (let i = 0; i < 200; i += 1) {
    stepRound(round, DT);
  }
  assert.equal(round.phase, 'run');
});

test('swipes change lane (clamped), jump and slide', () => {
  const round = runningRound();
  for (let i = 0; i < 3; i += 1) {
    applyAction(round, 'a', 'left');
  }
  assert.equal(round.players.get('a').lane, 0);
  applyAction(round, 'a', 'jump');
  assert.ok(round.players.get('a').jumpT > 0);
  applyAction(round, 'a', 'slide');
  assert.equal(round.players.get('a').jumpT, 0);
  assert.ok(round.players.get('a').slideT > 0);
});

test('a swipe toward the corner turns it, and missing the turn is a crash', () => {
  const corner = cornerAt(SEED, 0);
  const round = runningRound();
  const turner = place(round, 'a', corner.z - TURN_BEFORE + 2, 1);
  assert.equal(turnPrompt(round, turner), corner.dir);
  const other = corner.dir === 'left' ? 'right' : 'left';
  applyAction(round, 'a', other);
  assert.equal(turner.nextCorner, 0, 'the wrong way is a lane change, not a turn');
  applyAction(round, 'a', corner.dir);
  assert.equal(turner.nextCorner, 1);

  const crasher = place(round, 'b', corner.z + 2.9, 1);
  crasher.nextCorner = 0;
  stepRound(round, DT);
  assert.ok(crasher.stumbleT > 0, 'no swipe: crash');
  assert.equal(crasher.nextCorner, 1);
  assert.equal(turner.stumbleT, 0);
});

test('a shield carries a player round a corner without a crash', () => {
  const corner = cornerAt(SEED, 0);
  const round = runningRound();
  const shielded = place(round, 'a', corner.z + 2.9, 1);
  shielded.nextCorner = 0;
  shielded.shieldT = 5;
  stepRound(round, DT);
  assert.equal(shielded.stumbleT, 0);
  assert.equal(shielded.nextCorner, 1);
});

test('a runner who stands still in a wall lane stumbles', () => {
  const round = runningRound();
  const wall = obstaclesBetween(SEED, 40, 2000).find((obstacle) => obstacle.type === OBSTACLE.WALL);
  const runner = place(round, 'a', wall.z - 2, wall.lane);
  for (let i = 0; i < 30 && runner.stumbleT === 0; i += 1) {
    stepRound(round, DT);
  }
  assert.ok(runner.stumbleT > 0);
});

test('jumping clears a low obstacle and sliding clears a high one', () => {
  for (const [type, action] of [[OBSTACLE.LOW, 'jump'], [OBSTACLE.HIGH, 'slide']]) {
    const round = runningRound();
    const obstacle = obstaclesBetween(SEED, 40, 5000).find((found) => found.type === type);
    const runner = place(round, 'a', obstacle.z - 6, obstacle.lane);
    let acted = false;
    for (let i = 0; i < 36; i += 1) {
      if (!acted && obstacle.z - runner.z < 4.5) {
        applyAction(round, 'a', action);
        acted = true;
      }
      stepRound(round, DT);
    }
    assert.equal(runner.stumbleT, 0, `${action} should clear ${type}`);
  }
});

test('coins add to the team purse once, and a magnet pulls coins from other lanes', () => {
  const coin = pickupsBetween(SEED, 40, 3000).find((pickup) => pickup.kind === PICKUP.COIN);
  const round = runningRound();
  const runner = place(round, 'a', coin.z - 0.3, coin.lane);
  stepRound(round, DT);
  assert.ok(runner.coins >= 1 && round.coins >= 1);
  const taken = round.coins;
  place(round, 'a', coin.z - 0.3, coin.lane);
  stepRound(round, DT);
  assert.equal(round.coins, taken, 'a coin can only be taken once');

  const other = pickupsBetween(SEED, 200, 3000).find((pickup) => pickup.kind === PICKUP.COIN && !round.collected.has(pickup.id));
  const magnetic = place(round, 'b', other.z - 4, (other.lane + 1) % LANE_COUNT);
  magnetic.magnetT = 5;
  const before = round.coins;
  stepRound(round, DT);
  assert.ok(round.coins > before);
});

test('powerups set shield, boost and magnet timers', () => {
  const found = {};
  for (const pickup of pickupsBetween(SEED, 40, 20000)) {
    found[pickup.kind] ??= pickup;
  }
  for (const [kind, timer] of [[PICKUP.SHIELD, 'shieldT'], [PICKUP.BOOST, 'boostT'], [PICKUP.MAGNET, 'magnetT']]) {
    const round = runningRound();
    const runner = place(round, 'a', found[kind].z - 0.3, found[kind].lane);
    stepRound(round, DT);
    assert.ok(runner[timer] > 0, kind);
  }
});

test('the monster never runs past a living runner', () => {
  const round = runningRound({ ...DEFAULT_SETTINGS, immune: true });
  place(round, 'a', 100, 0);
  place(round, 'b', 100, 2);
  place(round, 'c', 99, 1);
  for (let i = 0; i < 600; i += 1) {
    stepRound(round, DT);
    const rear = Math.min(round.players.get('a').z, round.players.get('b').z);
    assert.ok(chaserOf(round).z <= rear, 'chaser behind rearmost runner');
  }
});

test('a chaser must rest between lane changes', () => {
  const round = runningRound();
  place(round, 'c', 50, 1);
  applyAction(round, 'c', 'left');
  applyAction(round, 'c', 'left');
  assert.equal(round.players.get('c').lane, 0, 'second change is refused');
  for (let i = 0; i < 25; i += 1) {
    stepRound(round, DT);
  }
  applyAction(round, 'c', 'right');
  assert.equal(round.players.get('c').lane, 1);
});

test('the chaser catches a runner in its lane; a revive costs coins', () => {
  const round = runningRound();
  const chaser = place(round, 'c', 300, 1);
  const runner = place(round, 'a', 300.5, 1);
  place(round, 'b', 330, 0);
  stepRound(round, DT);
  assert.equal(runner.status, 'down');
  assert.ok(chaser.pauseT > 0);

  assert.equal(reviveRunner(round, 'b', 'a'), false, 'no coins yet');
  round.coins = REVIVE_COST + 2;
  assert.equal(reviveRunner(round, 'b', 'a'), true);
  assert.equal(round.coins, 2);
  assert.equal(runner.status, 'alive');
  assert.ok(runner.z > chaser.z);
  assert.ok(runner.shieldT > 0);
  assert.ok(round.players.get('b').stumbleT > 0);
});

test('a downed runner who is not revived is out, and the round ends when no runner is alive', () => {
  const round = createRound({ playerIds: ['c', 'a'], chaserId: 'c', seed: SEED });
  round.phase = 'run';
  const runner = round.players.get('a');
  runner.status = 'down';
  runner.downT = REVIVE_WINDOW_SECONDS;
  round.coins = 5;
  stepRound(round, DT);
  assert.equal(round.phase, 'over');
  assert.deepEqual(Object.keys(round.result), ['meters', 'seconds', 'coins']);
});

test('nobody can revive without a living runner, and a dead round ignores swipes', () => {
  const round = runningRound();
  round.coins = 99;
  round.players.get('a').status = 'down';
  round.players.get('b').status = 'down';
  assert.equal(reviveRunner(round, 'c', 'a'), false);
  round.phase = 'over';
  applyAction(round, 'c', 'left');
  assert.equal(round.players.get('c').lane, 1);
});

test('if the chaser leaves, a living runner takes over; with no runners the round ends', () => {
  const round = runningRound();
  removeRoundPlayer(round, 'c');
  assert.equal(chaserOf(round).id, 'a');
  removeRoundPlayer(round, 'b');
  assert.equal(round.phase, 'over');
});

test('views: revive options for living runners only, coins, powerup and turn prompt', () => {
  const round = runningRound();
  round.players.get('a').status = 'down';
  round.players.get('a').downT = 5;
  round.coins = 12;
  place(round, 'b', cornerAt(SEED, 0).z - 5, 1);
  round.players.get('b').boostT = 3;
  const nameOf = (id) => id.toUpperCase();
  const view = roundView(round, 'b', nameOf);
  assert.deepEqual(view.downed, [{ id: 'a', name: 'A' }]);
  assert.equal(view.coins, 12);
  assert.deepEqual(view.power, { kind: 'boost', secs: 3 });
  assert.equal(view.turn, cornerAt(SEED, 0).dir);
  assert.deepEqual(roundView(round, 'c', nameOf).downed, []);
  assert.equal(roundView(round, 'a', nameOf).reviveLeft, 5);
});

// A hazard of `type` in the track and the lane/z of it, for the hazard tests.
function findObstacle(type) {
  return obstaclesBetween(SEED, 40, 8000).find((found) => found.type === type);
}

test('lives: an obstacle costs a life and the runner is out at zero', () => {
  const round = runningRound({ ...DEFAULT_SETTINGS, lives: 2 });
  const wall = findObstacle(OBSTACLE.WALL);
  const runner = place(round, 'a', wall.z - 2, wall.lane);
  for (let i = 0; i < 40 && runner.invulnT === 0; i += 1) {
    stepRound(round, DT);
  }
  assert.equal(runner.lives, 1);
  assert.equal(runner.status, 'alive');
  runner.invulnT = 0;
  runner.stumbleT = 0;
  place(round, 'a', wall.z - 1, wall.lane);
  for (let i = 0; i < 10; i += 1) {
    stepRound(round, DT);
  }
  assert.equal(runner.lives, 0);
  assert.equal(runner.status, 'out');
});

test('lives: the monster is not hurt by obstacles, and the view shows runner lives', () => {
  const round = runningRound({ ...DEFAULT_SETTINGS, lives: 3 });
  assert.equal(roundView(round, 'a', String).lives, 3);
  assert.equal(roundView(round, 'a', String).maxLives, 3);
  assert.equal(roundView(round, 'c', String).maxLives, 0);
});

test('immunity: obstacles cannot hurt, but a missed corner still stumbles without costing a life', () => {
  const round = runningRound({ ...DEFAULT_SETTINGS, immune: true });
  const wall = findObstacle(OBSTACLE.WALL);
  const runner = place(round, 'a', wall.z - 2, wall.lane);
  for (let i = 0; i < 40; i += 1) {
    stepRound(round, DT);
  }
  assert.equal(runner.stumbleT, 0);
  assert.equal(runner.lives, 1);
  const corner = cornerAt(SEED, 0);
  const crasher = place(round, 'b', corner.z + 2.9, 1);
  crasher.nextCorner = 0;
  stepRound(round, DT);
  assert.ok(crasher.stumbleT > 0);
  assert.equal(crasher.lives, 1);
});

test('fire hurts only while it burns, and a jump clears it', () => {
  const fire = findObstacle(OBSTACLE.FIRE);
  const round = runningRound({ ...DEFAULT_SETTINGS, lives: 5 });
  let burning = 0;
  while (!fireIsOn(burning, fire.z)) {
    burning += 0.05;
  }
  round.time = burning;
  const walker = place(round, 'a', fire.z - 0.05, fire.lane);
  walker.nextCorner = nextCornerIndex(SEED, walker.z);
  stepRound(round, DT);
  assert.ok(walker.stumbleT > 0, 'burning fire hurts');

  const calm = runningRound({ ...DEFAULT_SETTINGS, lives: 5 });
  let quiet = 0;
  while (fireIsOn(quiet, fire.z)) {
    quiet += 0.05;
  }
  calm.time = quiet;
  const safe = place(calm, 'a', fire.z - 0.05, fire.lane);
  stepRound(calm, DT);
  assert.equal(safe.stumbleT, 0, 'fire that is out is harmless');
});

test('a gap hurts on the ground and not in the air', () => {
  const gap = findObstacle(OBSTACLE.GAP);
  const grounded = runningRound({ ...DEFAULT_SETTINGS, lives: 5 });
  const walker = place(grounded, 'a', gap.z - 0.05, gap.lane);
  stepRound(grounded, DT);
  assert.ok(walker.stumbleT > 0);
  const flying = runningRound({ ...DEFAULT_SETTINGS, lives: 5 });
  const jumper = place(flying, 'a', gap.z - 0.05, gap.lane);
  jumper.jumpT = 0.35;
  stepRound(flying, DT);
  assert.equal(jumper.stumbleT, 0);
});

test('a tile starts to fall when a player is near and is a hole after the delay', () => {
  const tile = findObstacle(OBSTACLE.TILE);
  const round = runningRound({ ...DEFAULT_SETTINGS, lives: 5 });
  place(round, 'a', tile.z - 8, (tile.lane + 1) % 3);
  stepRound(round, DT);
  assert.ok(round.fallen.has(obstacleId(tile)), 'near player triggers it');
  const early = place(round, 'b', tile.z - 0.05, tile.lane);
  stepRound(round, DT);
  assert.equal(early.stumbleT, 0, 'still solid before it has fallen');
  round.time = round.fallen.get(obstacleId(tile)) + TILE_FALL_DELAY + 0.1;
  const late = place(round, 'b', tile.z - 0.05, tile.lane);
  late.invulnT = 0;
  stepRound(round, DT);
  assert.ok(late.stumbleT > 0, 'a hole once fallen');
});

test('hazards off leaves only logs, beams and walls', () => {
  const found = new Set(obstaclesBetween(SEED, 40, 8000, false).map((obstacle) => obstacle.type));
  assert.deepEqual([...found].sort(), ['high', 'low', 'wall']);
  assert.ok(new Set(obstaclesBetween(SEED, 40, 8000, true).map((obstacle) => obstacle.type)).size > 3);
});

test('settings cycle through their options and wrap round', () => {
  assert.equal(cycleSetting(DEFAULT_SETTINGS, 'lives').lives, 2);
  let settings = DEFAULT_SETTINGS;
  for (let i = 0; i < SETTING_ROWS.find((row) => row.key === 'skill').options.length; i += 1) {
    settings = cycleSetting(settings, 'skill');
  }
  assert.equal(settings.skill, DEFAULT_SETTINGS.skill);
  assert.equal(cycleSetting(DEFAULT_SETTINGS, 'immune').immune, true);
  assert.equal(settingText(true), 'On');
  assert.equal(settingText('monster'), 'Monster');
  assert.equal(cycleSetting(DEFAULT_SETTINGS, 'nothing'), DEFAULT_SETTINGS);
});

// Runs a round of only CPUs plus one idle person for `seconds`.
function playCpuRound({ cpuIds, chaserId, settings, seconds }) {
  const round = createRound({ playerIds: ['person', ...cpuIds], chaserId, seed: SEED, settings, cpuIds });
  const person = round.players.get('person');
  if (person.role === 'chaser') {
    person.ai = false;
  }
  round.phase = 'run';
  for (let i = 0; i < seconds * 60 && round.phase === 'run'; i += 1) {
    stepRound(round, DT);
  }
  return round;
}

test('a CPU runner on hard dodges obstacles and turns corners for a good distance', () => {
  const round = playCpuRound({
    cpuIds: ['cpu-1'], chaserId: 'person', seconds: 40,
    settings: { ...DEFAULT_SETTINGS, lives: 5, skill: 'hard' },
  });
  const runner = round.players.get('cpu-1');
  assert.ok(runner.z > 250, `CPU runner reached ${runner.z}`);
  assert.ok(runner.coins >= 0);
});

test('a CPU monkey chases and catches an idle runner', () => {
  const round = createRound({
    playerIds: ['me', 'cpu-monkey'], chaserId: 'cpu-monkey', seed: SEED, cpuIds: ['cpu-monkey'],
    settings: { ...DEFAULT_SETTINGS, immune: true },
  });
  round.phase = 'run';
  for (let i = 0; i < 60 * 40 && round.phase === 'run' && round.players.get('me').status === 'alive'; i += 1) {
    stepRound(round, DT);
  }
  assert.notEqual(round.players.get('me').status, 'alive', 'the CPU monkey catches a player who does nothing');
});

test('easy CPUs make more mistakes than hard ones', () => {
  const lives = (skill) => {
    const round = playCpuRound({ cpuIds: ['cpu-1'], chaserId: 'person', seconds: 60, settings: { ...DEFAULT_SETTINGS, lives: 99, skill } });
    return round.players.get('cpu-1').lives;
  };
  assert.ok(lives('hard') > lives('easy'));
});

test('a round with a person running ends when they are out, even if CPU runners live', () => {
  const round = createRound({
    playerIds: ['me', 'cpu-1', 'cpu-monkey'], chaserId: 'cpu-monkey', seed: SEED, cpuIds: ['cpu-1', 'cpu-monkey'],
    settings: DEFAULT_SETTINGS,
  });
  round.phase = 'run';
  round.players.get('me').status = 'out';
  stepRound(round, DT);
  assert.equal(round.phase, 'over');
});

test('a round with only CPUs left ends', () => {
  const round = createRound({ playerIds: ['me', 'cpu-1', 'cpu-monkey'], chaserId: 'cpu-monkey', seed: SEED, cpuIds: ['cpu-1', 'cpu-monkey'], settings: DEFAULT_SETTINGS });
  round.phase = 'run';
  removeRoundPlayer(round, 'me');
  assert.equal(round.phase, 'over');
});

test('split screen: one to four views tile the screen without overlap', () => {
  for (let count = 1; count <= 4; count += 1) {
    const views = layoutViews(count);
    assert.equal(views.length, count);
    const area = views.reduce((sum, view) => sum + view.w * view.h, 0);
    assert.ok(Math.abs(area - 1) < 1e-9, `${count} views cover the whole screen`);
    views.forEach((view, index) => views.slice(index + 1).forEach((other) => {
      const overlaps = view.x < other.x + other.w && other.x < view.x + view.w && view.y < other.y + other.h && other.y < view.y + view.h;
      assert.equal(overlaps, false);
    }));
  }
  assert.equal(layoutViews(9).length, 4);
  assert.equal(layoutViews(0).length, 1);
});

test('causeway: stretches join at sharp corners and every player position stays on stone', () => {
  const half = 4.4;
  const segments = straightSegments(SEED, 1500);
  segments.slice(1).forEach((segment, index) => {
    const before = segments[index];
    assert.ok(Math.hypot(segment.startX - before.endX, segment.startZ - before.endZ) < 1e-6, 'a stretch starts where the last ended');
    const turned = segment.heading - before.heading;
    assert.ok(Math.abs(Math.abs(turned) - Math.PI / 2) < 1e-9, 'corners are right angles');
  });
  const onStone = (x, z) => segments.some((segment) => {
    const along = (x - segment.startX) * Math.sin(segment.heading) - (z - segment.startZ) * Math.cos(segment.heading);
    const across = (x - segment.startX) * Math.cos(segment.heading) + (z - segment.startZ) * Math.sin(segment.heading);
    const length = Math.hypot(segment.endX - segment.startX, segment.endZ - segment.startZ);
    return along > -0.01 && along < length + half && Math.abs(across) <= half;
  });
  for (let distance = 0; distance < 1000; distance += 0.5) {
    for (const offset of [-2.2, 0, 2.2]) {
      const point = pathPoint(SEED, distance, offset);
      assert.ok(onStone(point.x, point.z), `off the causeway at ${distance}, lane offset ${offset}`);
    }
  }
});

test('a turn swiped just before the window opens is remembered and made when it opens', () => {
  const corner = cornerAt(SEED, 0);
  const round = runningRound();
  const runner = place(round, 'a', corner.z - TURN_BEFORE - 5, 1);
  applyAction(round, 'a', corner.dir);
  assert.equal(runner.nextCorner, 0);
  assert.equal(runner.lane, 1, 'a buffered turn does not change lane');
  for (let i = 0; i < 40 && runner.nextCorner === 0; i += 1) {
    stepRound(round, DT);
  }
  assert.equal(runner.nextCorner, 1, 'the corner was turned by the remembered swipe');
  assert.ok(runner.turnBoostT > 0, 'a turn in time gives a burst of speed');
  assert.equal(runner.stumbleT, 0);
});

test('a swipe too early to buffer changes lane as before', () => {
  const corner = cornerAt(SEED, 0);
  const round = runningRound();
  const runner = place(round, 'a', corner.z - TURN_BEFORE - 40, 1);
  applyAction(round, 'a', corner.dir);
  assert.equal(runner.lane, corner.dir === 'left' ? 0 : 2);
  assert.equal(runner.turnBufferT, 0);
});

test('temple icons: every icon is svg and an unknown name throws', () => {
  for (const name of TEMPLE_ICON_NAMES) {
    assert.match(templeIcon(name), /^<svg /);
  }
  assert.throws(() => templeIcon('nope'));
  for (const name of ['heart', 'coin', 'magnet', 'shield', 'bolt', 'monkey', 'runner', 'turn-left', 'turn-right']) {
    assert.ok(TEMPLE_ICON_NAMES.includes(name), name);
  }
});
