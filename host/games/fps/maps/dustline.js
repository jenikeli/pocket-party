// Dustline: a compact sandstone fortress with a long lane, central doors and a sunken cross-angle.

import { box, barrier, crate, stairs, rotated } from './kit.js';

const STONE = 0xa58a62;
const PALACE = 0xb9a27e;
const BLUE = 0x6f8290;

const west = [
  box(-40, 0, -28, 40, 4, -27.4, 'concrete', STONE), box(-40, 0, 27.4, 40, 4, 28, 'concrete', STONE),
  box(-40, 0, -28, -39.4, 4, 28, 'concrete', STONE), box(39.4, 0, -28, 40, 4, 28, 'concrete', STONE),
  box(-34, 0, -18, -18, 3.2, -16.8, 'concrete', PALACE), box(-34, 0, 16.8, -18, 3.2, 18, 'concrete', PALACE),
  box(-20, 0, -9, -18.8, 2.4, 9, 'metal', BLUE), box(-8, 0, -12, -6.8, 2.4, 12, 'concrete', STONE),
  barrier(-10, -18, 'x'), barrier(-10, 18, 'x'), barrier(-1, 0, 'z'),
  crate(-29, 0, 2.2), crate(-27, 2.2, 1.8), ...stairs(-26, -14, '+z', 2.4, 3),
];

export const DUSTLINE = Object.freeze({
  id: 'dustline', name: 'Dustline',
  bounds: { x0: -40, x1: 40, z0: -28, z1: 28 },
  boxes: Object.freeze([...west, ...rotated(west)]),
  relays: Object.freeze([
    { id: '01', x: -24, z: 0, radius: 3 },
    { id: '02', x: 0, z: -20, radius: 3 },
    { id: '03', x: 24, z: 0, radius: 3 },
  ]),
  spawns: Object.freeze({
    0: [-34, -14, -7, 0, 7, 14].map((z) => ({ x: -36, z, yaw: -Math.PI / 2 })),
    1: [-34, -14, -7, 0, 7, 14].map((z) => ({ x: 36, z, yaw: Math.PI / 2 })),
    ffa: [[-34,-18],[-34,18],[-18,-8],[-8,0],[8,0],[18,8],[34,-18],[34,18],[0,-20],[0,20]].map(([x,z]) => ({x,z,yaw:Math.atan2(-x,-z)})),
  }),
  look: { sky: 0x9f9277, fog: 0x9a8f74, fogNear: 18, fogFar: 105, ground: 0x8a795d, rain: false },
});
