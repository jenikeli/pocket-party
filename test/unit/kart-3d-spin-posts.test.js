// Unit tests for the airport's spin posts (host/games/kart-3d/spin-posts.js) and the CPU drivers aiming at them
// (cpu-aim.js): bounce, spin boost once per cooldown, anti-gravity only, passing over, and levels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import { createRace, stepRace } from '../../host/games/kart-3d/race.js';
import { stepSpinPosts, SPIN_POST_RADIUS, SPIN_POST_HEIGHT } from '../../host/games/kart-3d/spin-posts.js';
import { pointAt } from '../../host/games/kart-3d/track.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { addScaled } from '../../host/games/kart-3d/vector.js';
import { tuning, resetTuning } from '../../host/games/kart-3d/tuning.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';

const STEP = 1 / 60;
const track = buildTrack(PALM_BAY_AIRPORT);
const post = track.spinPosts[0];

// A one-kart race with the kart `gap` units before the first post's middle (along the road), at the post's lateral.
function kartBeforePost(gap, speed = 20) {
  const race = createRace(track, ['p1'], 3, 150, 'easy');
  const kart = race.karts.find((each) => each.playerId === 'p1');
  const spot = pointAt(track, post.s - gap, post.lateral);
  Object.assign(kart, { position: spot.position, forward: spot.forward, up: spot.normal, antiGravity: true });
  kart.velocity = addScaled(kart.velocity, spot.forward, speed);
  race.karts = [kart];
  return { race, kart };
}

function stepUntilHit(race, kart) {
  for (let step = 0; step < 120 && race.spinPosts[0].sinceHit !== 0; step += 1) {
    stepSpinPosts(race, track, STEP);
    kart.position = addScaled(kart.position, kart.forward, 20 * STEP);
  }
}

test('a race has one { sinceHit } per post, counting up from a hit', () => {
  const { race, kart } = kartBeforePost(3);
  assert.deepEqual(race.spinPosts, track.spinPosts.map(() => ({ sinceHit: null })));
  stepUntilHit(race, kart);
  assert.equal(race.spinPosts[0].sinceHit, 0);
  kart.position = addScaled(kart.position, kart.forward, 10);
  stepSpinPosts(race, track, 0.5);
  assert.ok(Math.abs(race.spinPosts[0].sinceHit - 0.5) < 1e-9);
});

test('in anti-gravity a kart hitting a post bounces, spins and boosts, once per cooldown', () => {
  resetTuning();
  const { race, kart } = kartBeforePost(3);
  stepUntilHit(race, kart);
  assert.equal(kart.boost.kind, BOOST_KINDS.SPIN);
  assert.equal(kart.spinTime, 0);
  assert.equal(kart.postCooldown, tuning.postCooldown);
  assert.ok(kart.slideLeft > 0);
  assert.ok(kart.velocity.x * kart.forward.x + kart.velocity.y * kart.forward.y + kart.velocity.z * kart.forward.z < 0);
  // Back into the post before the cooldown ends: it bounces but does not spin again.
  kart.spinTime = null;
  kart.position = addScaled(kart.position, kart.forward, 1.5);
  stepSpinPosts(race, track, STEP);
  assert.equal(kart.spinTime, null);
  // After the cooldown it spins again.
  stepSpinPosts(race, track, tuning.postCooldown);
  kart.position = addScaled(kart.position, kart.forward, 1.5);
  stepSpinPosts(race, track, STEP);
  assert.equal(kart.spinTime, 0);
});

test('outside anti-gravity a post only bounces', () => {
  const { race, kart } = kartBeforePost(3);
  kart.antiGravity = false;
  stepUntilHit(race, kart);
  assert.equal(race.spinPosts[0].sinceHit, 0);
  assert.equal(kart.boost, null);
  assert.equal(kart.spinTime, null);
  assert.ok(kart.slideLeft > 0);
});

test('a kart above the post\'s top passes over it, and a falling kart is left out', () => {
  const { race, kart } = kartBeforePost(0);
  const base = pointAt(track, post.s, post.lateral);
  kart.position = addScaled(base.position, base.normal, SPIN_POST_HEIGHT + 0.1);
  stepSpinPosts(race, track, STEP);
  assert.equal(race.spinPosts[0].sinceHit, null);
  kart.position = addScaled(base.position, base.right, SPIN_POST_RADIUS);
  kart.respawnIn = 0.5;
  stepSpinPosts(race, track, STEP);
  assert.equal(race.spinPosts[0].sinceHit, null);
});

// Drives a field of CPU karts of `level` until they have all passed the posts; counts the spins the posts gave.
// Some happen to every level: in the pack, karts are pushed into posts by each other.
function spinsFromPosts(level) {
  const race = createRace(track, [], 1, 150, level);
  const lastPost = track.spinPosts[track.spinPosts.length - 1].s;
  let spins = 0;
  while (race.time < 120 && !race.karts.every((kart) => kart.distance > lastPost + 10)) {
    stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
    spins += race.karts.filter((kart) => kart.postCooldown === tuning.postCooldown).length;
  }
  return spins;
}

test('Hard CPUs get spun by the posts more often than Easy ones over a lap of the airport', () => {
  resetTuning();
  const easy = spinsFromPosts('easy');
  const hard = spinsFromPosts('hard');
  assert.ok(hard > easy * 1.5, `hard ${hard}, easy ${easy}`);
});
