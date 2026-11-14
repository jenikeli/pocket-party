// Every boost a 3D kart can get (mini-turbos, the jump boost after a trick, dash panels, the rocket start,
// slipstream and the anti-gravity spin boost), the stall after a rocket start pressed too early, and the dash
// panels on the road. Numbers from docs/kart-reference.md (level 10) where it has them, guesses otherwise;
// each boost's speed is tuned (tuning.js).
// Plain functions on plain kart objects, unit tested in Node. Used by kart-physics.js, kart-techniques.js,
// kart-bumps.js, slipstream.js and race.js.

import { fromReferenceAcceleration, kartTopSpeed } from './kart-driving.js';
import { tuning } from './tuning.js';
import { progressBetween } from './track.js';

export const BOOST_KINDS = Object.freeze({
  MINI_TURBO: 'miniTurbo',
  JUMP: 'jump',
  DASH_PANEL: 'dashPanel',
  ROCKET_START: 'rocketStart',
  SLIPSTREAM: 'slipstream',
  SPIN: 'spin',
});

const FRAME = 1 / 60;
// The reference game's mini-turbo boosts at level 10: blue, orange and purple, in frames. Every level boosts to the same
// speed; they differ only in how long they last.
const MINI_TURBO_FRAMES = [30, 90, 150];

// seconds: how long it lasts (a mini-turbo's and a rocket start's are worked out when they start); speedKey: the
// tuning.js number for the speed it pushes to, as a share of the kart's top speed; referenceAcceleration: how fast it gets
// there, in the reference game's units. The reference game's boost accelerations
// (0.12-0.14 for mini-turbos, 0.2 for the jump boost) have no unit in the reference; they are read like its
// acceleration limit, units per frame added each frame, and turned into ours when the boost starts, so they
// follow the kart's top speed.
const BOOSTS = Object.freeze({
  [BOOST_KINDS.MINI_TURBO]: { seconds: null, speedKey: 'miniTurboSpeed', referenceAcceleration: 0.13 },
  [BOOST_KINDS.JUMP]: { seconds: 25 * FRAME, speedKey: 'jumpBoostSpeed', referenceAcceleration: 0.2 },
  // No lengths found for these: guesses. A dash panel is "like a mushroom", a full second; slipstream is
  // "modest, about 3 s"; the spin boost is taken to be about a blue mini-turbo.
  [BOOST_KINDS.DASH_PANEL]: { seconds: 1, speedKey: 'dashPanelSpeed', referenceAcceleration: 0.2 },
  [BOOST_KINDS.ROCKET_START]: { seconds: null, speedKey: 'rocketStartSpeed', referenceAcceleration: 0.2 },
  [BOOST_KINDS.SLIPSTREAM]: { seconds: 3, speedKey: 'slipstreamSpeed', referenceAcceleration: 0.13 },
  [BOOST_KINDS.SPIN]: { seconds: 30 * FRAME, speedKey: 'spinBoostSpeed', referenceAcceleration: 0.13 },
});

// A dash panel covers this much road, centred on its spot (units).
export const DASH_PANEL_LENGTH = 3;
export const DASH_PANEL_WIDTH = 4;

// The boost fields of a fresh kart (also after it is put back on the road): boost is null or { kind,
// timeLeft, speedShare, acceleration }; stallLeft counts down the seconds of a stalled start; slipstreamCharge
// is how long it has been close behind another kart (slipstream.js).
export function freshBoosts() {
  return { boost: null, stallLeft: 0, slipstreamCharge: 0 };
}

// How long a mini-turbo of `level` (1 blue, 2 orange, 3 purple) lasts, in seconds.
export function miniTurboSeconds(level) {
  return MINI_TURBO_FRAMES[level - 1] * FRAME;
}

// Starts a boost of `kind`. Boosts do not stack: a kart already boosting keeps the longer time and the faster
// speed of the two, and the newer kind (so a mini-turbo during a slipstream is no longer ended by a wall).
export function startBoost(kart, kind, seconds = BOOSTS[kind].seconds) {
  const { speedKey, referenceAcceleration } = BOOSTS[kind];
  const speedShare = tuning[speedKey];
  const acceleration = fromReferenceAcceleration(referenceAcceleration, kartTopSpeed(kart));
  const current = kart.boost;
  kart.boost = {
    kind,
    timeLeft: Math.max(seconds, current?.timeLeft ?? 0),
    speedShare: Math.max(speedShare, current?.speedShare ?? 0),
    acceleration: Math.max(acceleration, current?.acceleration ?? 0),
  };
}

// Ends the kart's boost if it is of `kind` (slipstream ends on hitting a wall or a kart).
export function endBoost(kart, kind) {
  if (kart.boost?.kind === kind) {
    kart.boost = null;
  }
}

// Once per step after the kart moved: boosts and stalls run down, and a kart on a dash panel is boosted.
export function stepBoosts(track, kart, dt) {
  if (kart.boost) {
    kart.boost.timeLeft -= dt;
    if (kart.boost.timeLeft <= 0) {
      kart.boost = null;
    }
  }
  kart.stallLeft = Math.max(kart.stallLeft - dt, 0);
  if (kart.grounded && onDashPanel(track, kart)) {
    startBoost(kart, BOOST_KINDS.DASH_PANEL);
  }
}

// track.dashPanels is a list of { s, lateral }: where each panel's centre is along and across the road.
function onDashPanel(track, kart) {
  return track.dashPanels.some(
    (panel) =>
      Math.abs(progressBetween(track, panel.s, kart.s)) <= DASH_PANEL_LENGTH / 2 &&
      Math.abs(kart.lateral - panel.lateral) <= DASH_PANEL_WIDTH / 2,
  );
}
