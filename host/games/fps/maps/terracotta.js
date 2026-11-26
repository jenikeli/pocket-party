// Terracotta Plaza: courtyards, colonnades and a low balcony over asymmetric lanes.

import { box, barrier, crate, stairs, deck, column, rotated } from './kit.js';

const TERRA = 0xb8754f;
const SAND = 0xc7ad82;
const PALACE = 0x9f5f43;

const west = [
  box(-40, 0, -28, 40, 4, -27.4, 'concrete', TERRA), box(-40, 0, 27.4, 40, 4, 28, 'concrete', TERRA),
  box(-40, 0, -28, -39.4, 4, 28, 'concrete', TERRA), box(39.4, 0, -28, 40, 4, 28, 'concrete', TERRA),
  box(-32, 0, -20, -16, 3, -18.8, 'concrete', PALACE), box(-32, 0, 18.8, -16, 3, 20, 'concrete', PALACE),
  column(-28, -12, 5), column(-22, -12, 5), column(-28, 12, 5), column(-22, 12, 5),
  ...deck(-30, -14, -20, 14, 3.8, true), ...stairs(-18, -16, '+z', 3.8, 3),
  barrier(-12, -8, 'x'), barrier(-12, 8, 'x'), crate(-6, -16, 2), crate(-4, 16, 2),
];

export const TERRACOTTA = Object.freeze({
  id: 'terracotta', name: 'Terracotta Plaza',
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
  look: { sky: 0x9e9da4, fog: 0x9a8d82, fogNear: 16, fogFar: 100, ground: 0x8d7463, rain: false },
});
