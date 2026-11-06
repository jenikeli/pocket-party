// Unit tests for the airport's spin posts (host/games/kart-3d/spin-posts.js) and the CPU drivers aiming at them
// (cpu-aim.js, cpu-drift.js): sliding round with no bounce, spin boost once per cooldown, anti-gravity only,
// passing over, no drifting past posts, and levels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import { createRace, stepRace } from '../../host/games/kart-3d/race.js';
import { stepSpinPosts, SPIN_POST_RADIUS, SPIN_POST_HEIGHT } from '../../host/games/kart-3d/spin-posts.js';
import { pointAt } from '../../host/games/kart-3d/track.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { addScaled, dot, subtract } from '../../host/games/kart-3d/vector.js';
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

test('in anti-gravity a kart hitting a post head-on keeps its speed, slides round it, spins and boosts, once per cooldown', () => {
  resetTuning();
  const { race, kart } = kartBeforePost(3);
  // Along the road's direction at the post, which the slide round it never changes.
  const base = pointAt(track, post.s, post.lateral);
  const speedAlong = dot(kart.velocity, base.forward);
  stepUntilHit(race, kart);
  assert.equal(kart.boost.kind, BOOST_KINDS.SPIN);
  assert.equal(kart.spinTime, 0);
  assert.equal(kart.postCooldown, tuning.postCooldown);
  // No bounce (the M9 device run): the speed along the road is kept and the grip is not loosened.
  assert.ok(Math.abs(dot(kart.velocity, base.forward) - speedAlong) < 1e-9);
  assert.equal(kart.slideLeft, 0);
  // Pushed to the post's side, clear of it, not back.
  assert.ok(Math.abs(dot(subtract(kart.position, base.position), base.right)) > SPIN_POST_RADIUS);
  // Back into the post before the cooldown ends: slid round again but no new spin.
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

test('outside anti-gravity a post only slides the kart round it', () => {
  const { race, kart } = kartBeforePost(3);
  kart.antiGravity = false;
  stepUntilHit(race, kart);
  assert.equal(race.spinPosts[0].sinceHit, 0);
  assert.equal(kart.boost, null);
  assert.equal(kart.spinTime, null);
});

test('a kart clipping a post\'s side is not turned back toward the middle of the road', () => {
  const { race, kart } = kartBeforePost(3);
  const base = pointAt(track, post.s, post.lateral);
  const side = Math.sign(-post.lateral);
  kart.position = addScaled(kart.position, base.right, side * 0.9);
  kart.velocity = addScaled(kart.velocity, base.right, -side * 4);
  stepUntilHit(race, kart);
  assert.equal(race.spinPosts[0].sinceHit, 0, 'it touched the post');
  assert.ok(dot(kart.velocity, base.right) * side > -1e-9, 'its sideways speed into the post is gone');
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

// Drives each CPU kart of a field of `level` alone (the rest of the field taken away, so no kart is bumped into a
// post) once past the posts, and counts the spins the posts gave: of 12 karts passing 4 posts.
function loneSpinsFromPosts(level) {
  const lastPost = track.spinPosts[track.spinPosts.length - 1].s;
  let spins = 0;
  for (let gridIndex = 0; gridIndex < 12; gridIndex += 1) {
    const race = createRace(track, [], 1, 150, level);
    const kart = race.karts[gridIndex];
    race.karts = [kart];
    while (race.time < 60 && kart.distance < lastPost + 10) {
      stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
      spins += kart.postCooldown === tuning.postCooldown ? 1 : 0;
    }
  }
  return spins;
}

test('CPU karts do not drift past the posts (a drift on the steep bank could not steer for them)', () => {
  resetTuning();
  const race = createRace(track, [], 1, 150, 'hard');
  const firstPost = track.spinPosts[0].s;
  const lastPost = track.spinPosts[track.spinPosts.length - 1].s;
  let driftedNearPosts = 0;
  while (race.time < 60 && !race.karts.every((kart) => kart.distance > lastPost)) {
    stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
    driftedNearPosts += race.karts.filter((kart) => kart.s > firstPost - 10 && kart.s < lastPost && kart.driftDirection !== 0).length;
  }
  assert.equal(driftedNearPosts, 0);
});

// Measured when written: Easy 0, Normal 12, Hard 19 spins of 48 passes. A kart cannot be spun again within its
// cooldown, and the posts stand closer than that, so about 24 is the most.
test('Easy CPUs steer clear of the posts, Hard ones clip them clearly more often than Normal', () => {
  resetTuning();
  const easy = loneSpinsFromPosts('easy');
  const normal = loneSpinsFromPosts('normal');
  const hard = loneSpinsFromPosts('hard');
  assert.ok(easy <= 2, `easy ${easy}`);
  assert.ok(normal > easy && hard >= normal * 1.3 && hard >= 14, `easy ${easy}, normal ${normal}, hard ${hard}`);
});
