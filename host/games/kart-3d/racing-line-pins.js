// Where the CPU drivers' racing line (racing-line.js) must run, whatever the corners round it want (M7e): down the
// middle of the road over each jump, so a kart takes off square and lands with the most road either side, and
// over each dash panel's middle. Also lists the jumps, for the drivers (cpu-road.js). Plain maths, unit tested in
// Node through racing-line.js.

import { DASH_PANEL_LENGTH } from './kart-boosts.js';
import { progressBetween } from './track.js';

// The line runs down the middle from this far before a ramp's lip to this far past the gap.
const JUMP_RUN_UP = 30;
const JUMP_RUN_OUT = 8;
// It runs over a dash panel's middle for its whole length and this far either side.
const PANEL_RUN = 2;

// The laterals the line must keep, one per station (NaN where it is free).
export function pinnedLaterals(track) {
  const pins = new Float64Array(track.stations.length).fill(NaN);
  const pinAround = (fromS, toS, lateral) => {
    track.stations.forEach((station, index) => {
      if (progressBetween(track, fromS, station.s) >= 0 && progressBetween(track, station.s, toS) >= 0) {
        pins[index] = lateral;
      }
    });
  };
  for (const jump of jumps(track)) {
    pinAround(jump.lipS - JUMP_RUN_UP, jump.landingS + JUMP_RUN_OUT, 0);
  }
  for (const panel of track.dashPanels) {
    const reach = DASH_PANEL_LENGTH / 2 + PANEL_RUN;
    pinAround(panel.s - reach, panel.s + reach, panel.lateral);
  }
  return pins;
}

// Every jump on the track: { lipS, landingS, glide }, where the road stops at a gap and where it starts again,
// and whether the gap is crossed with the glider open (a glide ramp's, M9).
export function jumps(track) {
  const { stations } = track;
  const found = [];
  stations.forEach((station, index) => {
    const next = stations[(index + 1) % stations.length];
    if (!station.gap && next.gap) {
      found.push({ lipS: next.s, landingS: next.s, glide: next.glide });
    }
    if (station.gap && !next.gap && found.length > 0) {
      found.at(-1).landingS = next.s;
    }
  });
  return found;
}
