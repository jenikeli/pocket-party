// What the 3D test drive shows, worked out from the setup and drive state: each phone's view (sent with
// setControllerView), which kart each split-screen view follows, each kart's pose for drawing between two
// steps, and the host's readout lines. Plain functions, unit tested in Node. Used by host/games/kart-3d/index.js
// and the renderer.

import { lerp, normalize, length, rotate } from './vector.js';
import { forwardSpeed } from './kart-physics.js';
import { SURFACES } from './track.js';
import { sparkLevel, SPARK_COLORS } from './kart-techniques.js';
import { countdownNumber, GO_AT } from './rocket-start.js';
import { playerSetup } from '../../kart/setup.js';
import { playersInSlotOrder } from '../../roster.js';
import { playerKart } from './drive.js';

// The phases a phone's view has: the setup screen (the shared kart controls know it by this name), then the
// countdown and driving.
export const DRIVE_PHASES = Object.freeze({ SETUP: 'setup', COUNTDOWN: 'countdown', DRIVING: 'driving' });
// How long after GO the phone says how the start went.
const START_SHOWN_FOR = 2;
// A kart is 2 units long; the readout gives speeds in kart lengths too, to compare with MK8DX footage.
const KART_LENGTH = 2;

// The setup view for one player's phone: { phase: 'setup', laps: null, steering, autoAccelerate, ready }. The
// test drive has no laps, so the phone leaves that line empty.
export function setupView(setup, playerId) {
  const { steering, autoAccelerate, ready } = playerSetup(setup, playerId);
  return { phase: DRIVE_PHASES.SETUP, laps: null, steering, autoAccelerate, ready };
}

// The view during the countdown and while driving, or null if the player has no kart (they joined after the
// drive started): { phase, steering, autoAccelerate, countdown, spark, start }. It carries the control style
// so a phone that reloads shows the right controls again. countdown is countdownNumber's (3, 2, 1, 0 for GO, or
// null); spark the drift's spark colour (SPARK_COLORS) or null, shown on the Drift button; start the start's
// outcome (START_OUTCOMES) for a moment after GO, null otherwise.
export function drivingView(drive, setup, playerId) {
  const kart = playerKart(drive, playerId);
  if (!kart) {
    return null;
  }
  const { steering, autoAccelerate } = playerSetup(setup, playerId);
  const showStart = drive.started && drive.time < GO_AT + START_SHOWN_FOR;
  return {
    phase: drive.started ? DRIVE_PHASES.DRIVING : DRIVE_PHASES.COUNTDOWN,
    steering,
    autoAccelerate,
    countdown: countdownNumber(drive.time),
    spark: SPARK_COLORS[sparkLevel(kart)],
    start: showStart ? kart.startResult.outcome : null,
  };
}

// The split-screen views while driving, in order (top left first): [{ kart, player }]. One per player with a
// kart, in slot order. 3 players get quarters with a dummy in the fourth, as MK8DX fills its empty quarter;
// with no player kart left, the view follows a dummy. player is null for a dummy's view.
export function viewTargets(drive, players) {
  const targets = playersInSlotOrder(players)
    .map((player) => ({ kart: playerKart(drive, player.playerId), player }))
    .filter((target) => target.kart !== null);
  if (targets.length === 0 || targets.length === 3) {
    targets.push({ kart: drive.karts.find((kart) => kart.playerId === null), player: null });
  }
  return targets;
}

// Where to draw `kart` a share `alpha` (0..1) of the way from its last step to its current one:
// { position, forward, up, bodyForward, bodyUp }. forward and up are the kart's travel, which the chase camera
// follows; the body ones add its lean into a drift, its spin and its trick roll, for the model.
export function kartPose(kart, alpha) {
  const forward = normalize(lerp(kart.previousForward, kart.forward, alpha));
  const up = normalize(lerp(kart.previousUp, kart.up, alpha));
  // A right lean turns the nose clockwise seen from above: a negative angle about up (as in kart-physics.js).
  const bodyForward = rotate(forward, up, -lerpAngle(kart.previousBodyYaw, kart.bodyYaw, alpha));
  const bodyUp = rotate(up, bodyForward, lerpAngle(kart.previousBodyRoll, kart.bodyRoll, alpha));
  return { position: lerp(kart.previousPosition, kart.position, alpha), forward, up, bodyForward, bodyUp };
}

// Part of the way between two angles, the short way round, so a spin ending at a full turn (drawn as 0 the
// next step) does not swing back.
function lerpAngle(from, to, alpha) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * alpha;
}

// One line about a kart for the host's readout: its speed, what it is on, and how far round the lap it is.
export function describeKart(kart, track) {
  const speed = kart.grounded ? forwardSpeed(kart) : length(kart.velocity);
  const lengths = (speed / KART_LENGTH).toFixed(1);
  const round = Math.round((kart.s / track.length) * 100);
  const parts = [`${speed.toFixed(1)} units/s (${lengths} kart lengths/s)`, describeSurface(kart), `${round}% round`];
  if (kart.driftDirection !== 0) {
    parts.push(`drifting ${kart.driftDirection > 0 ? 'right' : 'left'} (${SPARK_COLORS[sparkLevel(kart)] ?? 'no'} sparks)`);
  }
  if (kart.boost) {
    parts.push(`${kart.boost.kind} boost`);
  }
  return parts.join(', ');
}

function describeSurface(kart) {
  if (kart.respawnIn !== null) {
    return 'fell off';
  }
  if (!kart.grounded) {
    return 'in the air';
  }
  const ground = kart.surface === SURFACES.OFF_ROAD ? 'off-road' : 'road';
  return kart.antiGravity ? `${ground}, anti-gravity` : ground;
}
