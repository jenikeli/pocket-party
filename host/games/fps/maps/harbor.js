// Saltline Terminal: a rainy container terminal, 80 x 56 metres. Stacked containers form alleys and walk-through
// gaps, steel stairs lead up to the roofs of the two-high stacks and a crane perch, crate and barrier cover sit on
// the central pier. Half the map is written once and turned half a turn for the other half, so it is fair to both
// teams. Boxes only: the same data is the collision and the drawing. Used by maps/index.js.

import { box, stack, container, crate, barrier, stairs, deck, column, rotated } from './kit.js';

const BLUE = 0x263e52;
const RED = 0x754133;
const GREEN = 0x3d554b;
const YELLOW = 0x78623c;
const GREY = 0x465157;

// One half of the map (the north-west and south-west quadrants).
function half() {
  return [
    // North alley wall: a two-high stack to the west, a one-high container and a gap to the east.
    ...stack(-29, -22, 'x', 2, BLUE),
    ...stack(-14, -22, 'x', 1, RED),
    ...stairs(-23, -19.6, '+x', 5.2, 2.4),
    // The crane: four legs, a perch deck high up, stairs from the roof of the two-high stack.
    column(-22.5, -26.4, 9.4), column(-17.5, -26.4, 9.4), column(-22.5, -24.4, 9.4), column(-17.5, -24.4, 9.4),
    ...deck(-23.5, -27.2, -16.5, -23.6, 9.2),
    ...deck(-29, -27.6, -23.4, -26.6, 5.2, false),
    ...stairs(-34.6, -26.9, '+x', 4.0, 1.2).map((step) => ({ ...step, y0: 5.2, y1: step.y1 + 5.2 })),
    // Mid-west cluster: two containers and a crate corner with a doorway between them.
    ...stack(-24, -9, 'z', 2, GREEN),
    ...stack(-24, 8, 'z', 1, YELLOW),
    crate(-17, 0, 1.4), crate(-17, 1.4, 1.4), crate(-15.6, 0.7, 1.4),
    barrier(-10, -6, 'x'), barrier(-10, 6, 'x'), barrier(-6, 0, 'z'),
    // South-west yard: a long one-high wall with a gap, a two-high end and a small stair.
    ...stack(-29, 22, 'x', 1, GREY),
    ...stack(-12, 21.5, 'x', 2, RED),
    ...stairs(-12, 18.4, '+x', 5.2, 2.2),
    crate(-4, 12, 1.6), crate(-4, 13.6, 1.6), crate(-2.4, 12.8, 1.6, 0, 0x6f5a35),
    // Forklift: a low body and a mast.
    box(-6, 0, -14, -4, 1.3, -12.6, 'metal', 0xc79a2a), box(-6, 1.3, -14, -5.8, 3.2, -12.6, 'metal', 0x3a3f44),
    // Pier edge bollards and a low wall in the open middle.
    barrier(0, -10, 'x'), barrier(3, 10, 'x'),
  ];
}

const FENCE = 0x6e757b;

function perimeter() {
  return [
    box(-40.6, 0, -28.6, 40.6, 5, -28, 'concrete', FENCE),
    box(-40.6, 0, 28, 40.6, 5, 28.6, 'concrete', FENCE),
    box(-40.6, 0, -28.6, -40, 5, 28.6, 'concrete', FENCE),
    box(40, 0, -28.6, 40.6, 5, 28.6, 'concrete', FENCE),
  ];
}

function spawnsFor(team) {
  const x = team === 0 ? -35 : 35;
  return [-14, -7, 0, 7, 14].map((z) => ({ x, z, yaw: team === 0 ? -Math.PI / 2 : Math.PI / 2 }));
}

const base = half();

export const HARBOR = Object.freeze({
  id: 'harbor',
  name: 'Saltline Terminal',
  bounds: { x0: -40, x1: 40, z0: -28, z1: 28 },
  boxes: Object.freeze([...perimeter(), ...base, ...rotated(base)]),
  uplinkSites: Object.freeze({ A: { x: -34, z: -20, radius: 4 }, B: { x: 34, z: 20, radius: 4 } }),
  relays: Object.freeze([
    { id: '01', x: -30, z: 0, radius: 3 },
    { id: '02', x: 0, z: -20, radius: 3 },
    { id: '03', x: 30, z: 0, radius: 3 },
  ]),
  spawns: Object.freeze({
    0: spawnsFor(0),
    1: spawnsFor(1),
    ffa: [[-30, -15], [-8, -16], [14, -8], [34, -14], [34, 14], [8, 16], [-14, 8], [-34, 14], [0, 0], [-20, 0], [20, 0], [0, 22], [0, -22]].map(([x, z]) => ({ x, z, yaw: Math.atan2(-x, -z) })),
  }),
  // Warm low-angle light and wet asphalt echo the standalone Saltline terminal.
  look: {
    sky: 0x75645b,
    skyTop: 0x3e4c59,
    skyHorizon: 0xd59a70,
    skyBottom: 0x79685d,
    skyLight: 0xc9d0d0,
    groundLight: 0x342b28,
    ambientIntensity: 1.15,
    sunColor: 0xffc28f,
    sunIntensity: 2.45,
    sunPosition: [-48, 19, 34],
    fog: 0x897264,
    fogDensity: 0.006,
    fogNear: 12,
    fogFar: 88,
    ground: 0x252c30,
    rain: true,
  },
});
