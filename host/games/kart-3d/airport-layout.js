// Where Palm Bay Airport's dressing stands (M9): which barrier stands on each stretch of wall, and where its
// landmarks go (the terminal with planes at its gates, the control tower, the hangars, the conveyor under the jump,
// the plane taking off, the islands and boats in the sea). The props along the road are in airport-props.js.
// Distances along the lap (s) are the track's own (buildTrack(PALM_BAY_AIRPORT)); places are world x, z (x east,
// z south, as palm-bay-airport.js draws it; the airfield at 0). A landmark's spot is { x, z, heading }: it is
// turned by `heading` about up (Three.js's rotation.y), so its own +x faces (cos heading, -sin heading).
// Plain data and maths, unit tested in Node. Drawn by host/games/kart-3d/airport-landmarks.js and
// airport-scenery.js.

import { BARRIER_STYLES } from './kit/layout-rules.js';

const { APRON_RAIL, PADDED_BARRIER, RAIL_FENCE } = BARRIER_STYLES;

// The airfield's walls are the airport's own: low orange-and-white apron rails where the karts should see the
// planes and buildings past them, fat yellow pads along the grid, through the cutting and tunnel and down the
// runway; wooden rail fences on the beach road and up the S-bend. The hangar's ring keeps its anti-gravity walls.
export const BARRIER_RUNS = Object.freeze([
  // The start straight (the terminal and its planes on the left, the grid's pads on the right), the first corner,
  // the taxiway and the turn toward the runway.
  { fromS: 0, toS: 452, side: 'left', style: APRON_RAIL },
  { fromS: 0, toS: 232, side: 'right', style: PADDED_BARRIER },
  { fromS: 232, toS: 452, side: 'right', style: APRON_RAIL },
  // Down into the cutting, through the tunnel, up the jump's ramp and on its landing.
  { fromS: 452, toS: 654, side: 'both', style: PADDED_BARRIER },
  // Out of the hangar and round onto the runway; the runway and the glide ramp.
  { fromS: 771, toS: 919, side: 'both', style: APRON_RAIL },
  { fromS: 919, toS: 1116, side: 'both', style: PADDED_BARRIER },
  // The beach road and the climb back up.
  { fromS: 1206, toS: 1473, side: 'both', style: RAIL_FENCE },
  // The last corner, back on the apron.
  { fromS: 1473, toS: 1552, side: 'both', style: APRON_RAIL },
]);

// The terminal north of the start straight, its glass front facing the road (kit/terminal.js stands on the foot
// of its glass, halfway along, facing +x): the jet bridges reach toward the road, and the planes parked at them
// keep their wingtips about 10 clear of the road's edge.
export const TERMINAL = Object.freeze({ length: 160, x: 70, z: -66, heading: -Math.PI / 2 });

// The airliner at each jet bridge (kit/terminal.js's terminalGates, in order), by livery.
export const GATE_LIVERIES = Object.freeze(['skipjack-air', 'coral-wings', 'palm-air']);

// The spot of a plane parked at `gate` ({ x, z } in the terminal's frame) of a terminal at `terminal`: turned a
// quarter turn from the terminal, so it lies along the glass with its right side to the road, its front left door
// (`door`, { x, z } in the plane's own frame) at the bridge's cab. As task I's buildGate (docs/queue.md).
export function gatePlaneSpot(terminal, gate, door) {
  // The door turned a quarter turn about up: (x, z) becomes (z, -x).
  const local = { x: gate.x - door.z, z: gate.z + door.x };
  return { ...toWorld(terminal, local), heading: terminal.heading + Math.PI / 2 };
}

// A point given in the frame of a landmark standing at `spot`, in the world.
export function toWorld(spot, { x, z }) {
  const [cos, sin] = [Math.cos(spot.heading), Math.sin(spot.heading)];
  return { x: spot.x + x * cos + z * sin, z: spot.z - x * sin + z * cos };
}

// More planes: an airliner parked past the end of the start straight, nose west toward the karts coming, and one at
// the cargo stand east of the taxiway's last turn; small prop planes by the first corner, the last, and two on the
// grass south of the runway.
export const APRON_AIRLINERS = Object.freeze([
  { livery: 'palm-air', x: 232, z: -58, heading: Math.PI },
  { livery: 'coral-wings', x: 500, z: 70, heading: -Math.PI / 2 },
]);
export const PROP_PLANES = Object.freeze([
  { x: 242, z: 14, heading: Math.PI },
  { x: -50, z: -38, heading: -Math.PI / 4 },
  { x: 255, z: 296, heading: Math.PI / 2 },
  { x: 222, z: 322, heading: Math.PI },
]);

// The control tower inside the first corner, its door toward the start straight.
export const CONTROL_TOWER = Object.freeze({ x: 140, z: 32, heading: Math.PI / 2 });

// The small hangars (kit/hangar.js), each { airline, width, depth, x, z, heading }: the taxiway's, side by side
// north of it on its tarmac (inside its first turn), their doors facing the road (south); two by the cargo stand
// east of the taxiway's last turn, doors west; and one south of the runway, doors north.
export const HANGARS = Object.freeze([
  { airline: 'Palm Air', width: 22, depth: 18, x: 232, z: 82, heading: -Math.PI / 2 },
  { airline: 'Coral Wings', width: 24, depth: 20, x: 262, z: 80, heading: -Math.PI / 2 },
  { airline: 'Skipjack Air', width: 20, depth: 16, x: 291, z: 84, heading: -Math.PI / 2 },
  { airline: 'Skipjack Air', width: 26, depth: 22, x: 455, z: 105, heading: Math.PI },
  { airline: 'Palm Air', width: 22, depth: 18, x: 455, z: 140, heading: Math.PI },
  { airline: 'Coral Wings', width: 22, depth: 18, x: 300, z: 312, heading: Math.PI / 2 },
]);

// The big hangar round the anti-gravity ring: the stretch of road it covers (kit/hangar-big.js places itself).
export const BIG_HANGAR = Object.freeze({ fromS: 654, toS: 771 });

// The baggage conveyor across the road under the jump's gap (lip 614, landing 630), nearer the lip, where karts fly
// higher over it; its belt along its own z, so turned a quarter turn to run across the road (east-west), long
// enough for its housings to stand off the road.
export const CONVEYOR = Object.freeze({ length: 24, x: 345, z: 330.5, heading: Math.PI / 2 });

// The plane taking off each lap (kit/take-off-plane.js): it waits at the runway's east end, rolls west and lifts
// off before the road turns onto the runway, so it passes low over the karts' part of it, the glide and the bay.
export const TAKE_OFF = Object.freeze({ from: { x: 548, y: 0, z: 240 }, to: { x: 498, y: 0, z: 240 }, height: 12 });

// The rocky islands out in the sea (kit/rock-island.js; seed picks the kind, size is the radius at the waterline),
// south and west of the bay, where the glide and the beach road look out, far enough from the road to stay out of
// its baked shade. Big enough to read from the glide, 100 and more away. Each is turned so its beach (its +x) faces
// the course.
export const ISLANDS = Object.freeze([
  { seed: 1, size: 22, x: 135, z: 375, heading: Math.PI / 2 },
  { seed: 2, size: 20, x: 10, z: 430, heading: Math.PI / 2 },
  { seed: 3, size: 18, x: -105, z: 270, heading: 0 },
  { seed: 5, size: 22, x: -120, z: 460, heading: Math.PI / 4 },
  { seed: 6, size: 16, x: -150, z: 90, heading: 0 },
]);

// Boats on the water: { kind, x, z, heading }; a motor yacht moored in the bay north of the glide, the others out
// at sea.
export const BOATS = Object.freeze([
  { kind: 'motor-yacht', x: 150, z: 206, heading: 0.1 },
  { kind: 'sailboat', x: 70, z: 305, heading: 0.6 },
  { kind: 'sailboat', x: 165, z: 300, heading: 2.4 },
  { kind: 'sailboat', x: -60, z: 330, heading: -0.8 },
  { kind: 'motor-yacht', x: 60, z: 450, heading: 1.9 },
  { kind: 'sailboat', x: -120, z: 170, heading: 1.2 },
]);
