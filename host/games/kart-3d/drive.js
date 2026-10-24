// The M6b test drive's rules: every player's kart, plus dummy karts filling the field to 12 as MK8DX fills a
// race with CPU drivers, driving freely on the test track with no countdown, laps or places (M7 adds those).
// The drive is plain data (see createDrive). No Three.js, no DOM: unit tested in Node. Used by
// host/games/kart-3d/index.js.

import { createKart, stepKart } from './kart-physics.js';
import { bumpKarts } from './kart-bumps.js';
import { dummyControls } from './dummy-driver.js';

// MK8DX always races 12 karts.
export const FIELD_SIZE = 12;
// The grid: two staggered columns behind the start line, as in MK8DX.
const GRID_LANES = [-3, 3];
const GRID_FIRST_ROW = 3;
const GRID_ROW_SPACING = 5;
const GRID_STAGGER = 2.5;
// The dummies' lanes (units right of the centre line) and weights, taken in turn, so they spread across the
// road and bumps between light and heavy karts can be tried. Players drive a middle weight.
const DUMMY_LANES = [-4, 2, -1, 4, -3, 1, -2, 3, 0, -4, 4];
const DUMMY_WEIGHTS = [0.8, 1, 1.25];
const PLAYER_WEIGHT = 1;

// `playerIds` in grid order. As in MK8DX the players start at the back, behind the dummies, so dummies drive
// away from them instead of shunting a player who has not pressed Go yet. Returns the drive: { time, karts },
// where each kart is a kart from kart-physics.js plus { playerId, lane }: playerId is null for a dummy, and lane
// is where a dummy drives (null for a player).
export function createDrive(track, playerIds) {
  const dummyCount = Math.max(FIELD_SIZE - playerIds.length, 0);
  const karts = [];
  for (let gridIndex = 0; gridIndex < dummyCount + playerIds.length; gridIndex += 1) {
    const row = Math.floor(gridIndex / GRID_LANES.length);
    const column = gridIndex % GRID_LANES.length;
    const s = track.startLine - GRID_FIRST_ROW - row * GRID_ROW_SPACING - column * GRID_STAGGER;
    const isDummy = gridIndex < dummyCount;
    const weight = isDummy ? DUMMY_WEIGHTS[gridIndex % DUMMY_WEIGHTS.length] : PLAYER_WEIGHT;
    karts.push({
      ...createKart(track, s, GRID_LANES[column], weight),
      playerId: isDummy ? null : playerIds[gridIndex - dummyCount],
      lane: isDummy ? DUMMY_LANES[gridIndex % DUMMY_LANES.length] : null,
    });
  }
  return { time: 0, karts };
}

// Advances the drive by `dt` seconds. `controlsFor(playerId)` returns that player's controls
// ({ steer, accelerate, brake }); the caller hands back neutral controls for a player who is not connected.
export function stepDrive(drive, track, controlsFor, dt) {
  for (const kart of drive.karts) {
    const controls = kart.playerId === null ? dummyControls(track, kart, kart.lane) : controlsFor(kart.playerId);
    stepKart(track, kart, controls, dt);
  }
  bumpKarts(drive.karts);
  drive.time += dt;
}

// A player left mid-drive: their kart leaves the track.
export function removeKart(drive, playerId) {
  drive.karts = drive.karts.filter((kart) => kart.playerId !== playerId);
}

export function playerKart(drive, playerId) {
  return drive.karts.find((kart) => kart.playerId === playerId) ?? null;
}
