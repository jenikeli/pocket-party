// Vertical Foundry: three connected levels, wide stairwells and an open central atrium.

import { box, barrier, crate, stairs, deck, column, rotated } from './kit.js';

const STEEL = 0x66777d;
const COPPER = 0x8a5d43;
const SLATE = 0x3f4a50;

const west = [
  box(-40, 0, -28, 40, 4, -27.4, 'concrete', SLATE), box(-40, 0, 27.4, 40, 4, 28, 'concrete', SLATE),
  box(-40, 0, -28, -39.4, 4, 28, 'concrete', SLATE), box(39.4, 0, -28, 40, 4, 28, 'concrete', SLATE),
  box(-34, 0, -18, -18, 2.2, -16, 'metal', STEEL), box(-34, 0, 16, -18, 2.2, 18, 'metal', STEEL),
  column(-26, -12, 8), column(-20, -12, 8), column(-26, 12, 8), column(-20, 12, 8),
  ...deck(-29, -14, -17, 14, 3.6, true), ...stairs(-16, -18, '+z', 3.6, 3.2),
  ...stairs(-16, 18, '-z', 7.2, 3.2), ...deck(-12, -10, 12, 10, 7.2, true),
  barrier(-10, -8, 'x'), barrier(-10, 8, 'x'), crate(-6, 14, 2, 0, COPPER),
];

export const FOUNDRY = Object.freeze({
  id: 'foundry', name: 'Vertical Foundry',
  bounds: { x0: -40, x1: 40, z0: -28, z1: 28 },
  boxes: Object.freeze([...west, ...rotated(west)]),
  relays: Object.freeze([
    { id: '01', x: -30, z: 0, radius: 3 },
    { id: '02', x: 0, z: -20, radius: 3 },
    { id: '03', x: 30, z: 0, radius: 3 },
  ]),
  spawns: Object.freeze({
    0: [-34,-14,-7,0,7,14].map((z) => ({ x: -36, z, yaw: -Math.PI / 2 })),
    1: [-34,-14,-7,0,7,14].map((z) => ({ x: 36, z, yaw: Math.PI / 2 })),
    ffa: [[-34,-18],[-34,18],[-18,-12],[-8,0],[8,0],[18,12],[34,-18],[34,18],[0,-20],[0,20]].map(([x,z]) => ({x,z,yaw:Math.atan2(-x,-z)})),
  }),
  look: { sky: 0x59646a, fog: 0x536067, fogNear: 12, fogFar: 90, ground: 0x3e484c, rain: false },
});
