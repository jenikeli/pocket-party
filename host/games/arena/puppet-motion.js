// The animation curves of a puppet (docs/arena-plan.md section 3.5, "Hand-drawn feel from parts"): idle breathing,
// the walk and run cycle tied to distance, wind-up and strike read from the unit's own timers, hit flash, deploy
// drop-in. Plain functions over a small state object, no Phaser. Used by puppet.js.

import { TUNING } from './tuning.js';
import { TILE } from './arena-view.js';

const STRIKE_SECONDS = 0.09;
const FLASH_SECONDS = 0.08;
const BREATH_SECONDS = 1.2;
const DEGREE = Math.PI / 180;
const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

export function createMotion(seed) {
  return { seed, time: seed % 5, phase: 0, amp: 0, wheel: 0, armRot: 0, strike: 0, flash: 0, landPulse: 0, deploying: false, lastAttackTimer: null, lastHp: null, lastShield: null };
}

// Moves the state on by `dt` seconds. `moved` is how many tiles the unit travelled since the last frame.
export function advance(state, unit, gait, dt, moved) {
  const fast = unit.def.speed >= 1.5;
  state.time += dt;
  state.amp += ((moved > 0.0004 ? 1 : 0) - state.amp) * Math.min(1, dt * 12);
  if (gait === 'walk') {
    state.phase += (moved / (fast ? 0.4 : 0.55)) * Math.PI;
  } else if (gait === 'roll') {
    state.wheel += (moved * TILE) / 7;
  } else {
    state.phase += dt * (gait === 'hover' ? (state.amp > 0.5 ? 26 : 16) : 3);
  }
  // The strike is the moment the attack timer jumps back up after reaching zero.
  if (unit.engaged && state.lastAttackTimer !== null && unit.attackTimer > state.lastAttackTimer + 0.02) {
    state.strike = STRIKE_SECONDS;
  }
  state.lastAttackTimer = unit.attackTimer;
  state.strike = Math.max(0, state.strike - dt);
  if ((state.lastHp !== null && unit.hp < state.lastHp - 0.5) || (state.lastShield !== null && unit.shield < state.lastShield - 0.5)) {
    state.flash = FLASH_SECONDS;
  }
  state.lastHp = unit.hp;
  state.lastShield = unit.shield;
  state.flash = Math.max(0, state.flash - dt);
  if (unit.deployLeft > 0) {
    state.deploying = true;
  } else if (state.deploying) {
    state.deploying = false;
    state.landPulse = 0.35;
  }
  state.landPulse = Math.max(0, state.landPulse - dt);
  const attacking = unit.engaged && unit.def.damage > 0;
  const windup = unit.def.hit * TUNING.windupShare;
  const pull = attacking && unit.attackTimer < windup ? clamp(1 - unit.attackTimer / windup, 0, 1) : 0;
  const target = state.strike > 0 ? 0.9 : -1.4 * pull;
  state.armRot += (target - state.armRot) * Math.min(1, dt * (state.strike > 0 ? 40 : 14));
  state.pull = pull;
}

// How far down the deploy the unit is, 0 to 1 (1 when landed).
export const deployProgress = (unit) => clamp(1 - unit.deployLeft / TUNING.deploySeconds, 0, 1);

// The offsets to apply this frame: everything in pixels (1x art) and radians.
export function poseOf(state, unit, gait) {
  const fast = unit.def.speed >= 1.5 && gait === 'walk';
  const sway = Math.sin(state.phase);
  const breathe = (lag) => 1 + 0.015 * (1 + Math.sin((2 * Math.PI * (state.time - lag)) / BREATH_SECONDS)) * (1 - state.amp);
  const pose = {
    bob: 0, lean: 0, bodyRot: 0, scaleX: 1, scaleY: breathe(0), headScale: 1, dropY: 0, alpha: 1,
    feet: [{ dy: 0 }, { dy: 0 }], wheel: state.wheel, armBack: 0, armFront: state.armRot, propSway: 2 * DEGREE * Math.sin((2 * Math.PI * state.time) / BREATH_SECONDS + 1), propScale: 1,
    lunge: 0, knock: state.flash > 0 ? 3 : 0, flash: state.flash > 0,
  };
  if (gait === 'walk') {
    pose.bob = Math.abs(sway) * (fast ? 5 : 3) * state.amp;
    pose.lean = state.amp * (fast ? 12 : 6) * DEGREE;
    pose.feet = [{ dy: -Math.max(0, sway) * 4 * state.amp + sway * state.amp }, { dy: -Math.max(0, -sway) * 4 * state.amp - sway * state.amp }];
    pose.armBack = -sway * 0.4 * state.amp;
    pose.armFront += sway * 0.4 * state.amp;
  } else if (gait === 'hover') {
    pose.bob = Math.sin(state.time * 3.4 + state.seed) * 2.5;
    pose.armBack = Math.sin(state.phase) * 0.6;
    pose.armFront = -pose.armBack;
  } else if (gait === 'glide') {
    pose.bob = Math.sin(state.time * 3) * 2;
    pose.bodyRot = sway * 0.04;
    pose.lean = state.amp * 4 * DEGREE;
  } else if (gait === 'roll') {
    pose.bob = Math.sin(state.time * 45) * 0.9 * state.amp;
    pose.propSway += Math.sin(state.time * 30) * 0.05 * state.amp;
  }
  pose.scaleY *= 1 - 0.06 * state.pull;
  pose.scaleX *= 1 + 0.06 * state.pull;
  if (state.strike > 0) {
    const progress = 1 - state.strike / STRIKE_SECONDS;
    pose.lunge = (unit.def.ranged ? 2 : 8) * Math.sin(Math.PI * progress);
    pose.scaleY *= 1.08;
    pose.scaleX *= 0.95;
    pose.propScale = 1.2;
  }
  if (unit.deployLeft > 0) {
    applyDeploy(pose, unit, gait);
  }
  // The head sits on the body's top edge, a beat behind its breathing.
  pose.headScale = (pose.scaleY / breathe(0)) * breathe(0.04);
  return pose;
}

// Mobile units drop in from 80 px up and squash on landing; buildings rise out of the ground.
function applyDeploy(pose, unit, gait) {
  const progress = deployProgress(unit);
  pose.alpha = 0.55 + 0.45 * progress;
  if (gait === 'still') {
    pose.scaleY *= 0.05 + 0.95 * Math.sin((progress * Math.PI) / 2);
    return;
  }
  pose.dropY = -80 * (1 - Math.min(progress / 0.75, 1)) ** 2;
  if (progress > 0.75) {
    const squash = 0.15 * Math.sin(((progress - 0.75) / 0.25) * Math.PI);
    pose.scaleY *= 1 - squash;
    pose.scaleX *= 1 + squash;
  }
}
