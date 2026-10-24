// Scripted karts for the M6a spike: each follows the road at its own speed and weaves across it, with no
// physics, so the spike measures drawing alone. Plain data and maths (no Three.js, no DOM), unit tested in Node.

import { roadFrame, pointBeside } from './road.js';

export const MAX_KARTS = 12;
// World units per second; a lap is about 800 units, so about 27 s.
const BASE_SPEED = 30;

// Twelve karts on a two-wide grid just before the line, each a little faster than the one behind.
export function createKarts() {
  const karts = [];
  for (let index = 0; index < MAX_KARTS; index += 1) {
    const u = 1 - 0.008 * (Math.floor(index / 2) + 1);
    const lane = index % 2 === 0 ? -0.4 : 0.4;
    karts.push({
      index,
      u,
      previousU: u,
      lane,
      previousLane: lane,
      laneCentre: lane,
      speed: BASE_SPEED * (1 + 0.012 * index),
      weavePhase: index * 1.7,
      time: 0,
    });
  }
  return karts;
}

export function stepKarts(karts, dt) {
  for (const kart of karts) {
    kart.previousU = kart.u;
    kart.previousLane = kart.lane;
    kart.time += dt;
    kart.u = (kart.u + (kart.speed * dt) / roadFrame(kart.u).unitsPerU) % 1;
    // Weaves gently, never further out than 0.8 of the half-width, so it stays on the road.
    kart.lane = kart.laneCentre + 0.4 * Math.sin(kart.time * 0.6 + kart.weavePhase);
  }
}

// Where to draw the kart, between its last two steps (`alpha` 0..1, from render): { position, forward }.
export function kartPose(kart, alpha) {
  // u wraps from 1 back to 0 at the line; take the short way between the two steps.
  let deltaU = kart.u - kart.previousU;
  if (deltaU < -0.5) {
    deltaU += 1;
  }
  const u = kart.previousU + deltaU * alpha;
  const lane = kart.previousLane + (kart.lane - kart.previousLane) * alpha;
  const frame = roadFrame(u);
  return { position: pointBeside(frame, lane), forward: frame.forward };
}
