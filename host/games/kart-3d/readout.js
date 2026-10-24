// The text of the 3D test drive's readout at the top of the host screen: physics step time, frame rate, and
// for each player their kart (speed, surface, drift, boost), how late their Go arrived after "2" in the last
// few countdowns, how far from the lip they pressed Drift at the last jump, and their phone's round-trip time.
// Those timings are what the device run sets the rocket start and trick windows from. Plain data and
// functions, unit tested in Node. Used by host/games/kart-3d/index.js.

import { playersInSlotOrder, displayName } from '../../roster.js';
import { playerKart } from './drive.js';
import { describeKart } from './drive-views.js';

// How many starts and round trips are kept per player.
const STARTS_KEPT = 6;
const ROUND_TRIPS_KEPT = 10;

// Returns { recordRoundTrip(playerId, ms), describe(drive, track, players, stepSummary, fps, drawMs) }.
export function createReadout() {
  // playerId -> the last few start results ({ outcome, offset }), newest last, across drives.
  const startsByPlayer = new Map();
  // The start results already in startsByPlayer: each drive's result objects are added once.
  const recordedStarts = new WeakSet();
  // playerId -> the last few round-trip times in ms, newest last.
  const roundTripsByPlayer = new Map();

  function recordRoundTrip(playerId, ms) {
    keepLast(roundTripsByPlayer, playerId, ms, ROUND_TRIPS_KEPT);
  }

  // The readout's lines as one string. Also adds the drive's new start results to the history, so a Restart
  // after each attempt builds up a list of arrival times. `stepSummary` is the step timer's (or null), `fps`
  // and `drawMs` the frame rate and CPU time per frame.
  function describe(drive, track, players, stepSummary, fps, drawMs) {
    const lines = [
      stepSummary
        ? `Physics step: ${stepSummary.averageMs.toFixed(3)} ms average, ${stepSummary.worstMs.toFixed(3)} ms worst (${drive.karts.length} karts)`
        : 'Physics step: not measured yet',
      `Drawing: ${fps.toFixed(0)} fps, ${drawMs.toFixed(1)} ms CPU per frame`,
    ];
    for (const player of playersInSlotOrder(players)) {
      const kart = playerKart(drive, player.playerId);
      if (!kart) {
        continue;
      }
      if (kart.startResult && !recordedStarts.has(kart.startResult)) {
        recordedStarts.add(kart.startResult);
        keepLast(startsByPlayer, player.playerId, kart.startResult, STARTS_KEPT);
      }
      lines.push(`${displayName(player)}: ${describeKart(kart, track)}`);
      lines.push(`   ${describeTimings(startsByPlayer.get(player.playerId), kart.lipTiming, roundTripsByPlayer.get(player.playerId))}`);
    }
    return lines.join('\n');
  }

  return { recordRoundTrip, describe };
}

function keepLast(map, key, value, count) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list.slice(-count));
}

// For example: Go after "2": +0.31 rocket, -0.20 stall, no press | Drift from lip: +0.12 trick | round trip
// 42 ms (35-60). Times are seconds, negative for early.
export function describeTimings(starts = [], lipTiming = null, roundTrips = []) {
  const startText = starts.length === 0 ? 'none yet' : starts.map((start) => describeTiming(start.offset, start.outcome)).join(', ');
  const lipText = lipTiming ? describeTiming(lipTiming.offset, lipTiming.trick ? 'trick' : 'no trick') : 'none yet';
  const tripText = roundTrips.length === 0 ? 'not measured yet' : describeRoundTrips(roundTrips);
  return `Go after "2": ${startText} | Drift from lip: ${lipText} | round trip ${tripText}`;
}

function describeTiming(offset, outcome) {
  return offset === null ? 'no press' : `${offset >= 0 ? '+' : ''}${offset.toFixed(2)} ${outcome}`;
}

function describeRoundTrips(roundTrips) {
  const latest = Math.round(roundTrips[roundTrips.length - 1]);
  return `${latest} ms (${Math.round(Math.min(...roundTrips))}-${Math.round(Math.max(...roundTrips))})`;
}
