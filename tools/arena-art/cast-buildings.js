// The cast, buildings: Bolt Tower, Rootspout and Ballista Nest (docs/arena-plan.md 6.5). They stand still, so the rig
// player only breathes, rises at deploy and swings the prop. Used by generate.js.

import { cut, flat, line, dot, ell, rrect, poly, star, part, rig, stick, INK } from './kit.js';

const boltTower = () => rig([
  part('body', [40, 48], [20, 48], [0, 0], stick('M20 20L5 44M20 20L35 44M20 20L20 46', '#b08a4a', 3) + cut(ell(20, 43, 15, 4.5), '#8a6a3a') + cut(rrect(12, 14, 16, 16, 3), '#c9a24a') + line('M12 19H28M12 24H28', '#6e4a29', 1.2) + flat(rrect(17, 8, 6, 8, 2), '#6b7585')),
  part('prop', [26, 26], [13, 13], [0, -38], cut(ell(13, 13, 9, 9), '#bfe8ff') + dot(13, 13, 4.2, '#fff6b8') + line('M13 4L10 11L15 12L12 20', '#fff', 1.2)),
], { height: 54, gait: 'still', shadow: [36, 11], ring: 1.1 });

const rootspout = () => rig([
  part('body', [48, 46], [24, 46], [0, 0], cut('M10 42Q7 24 11 12Q24 4 37 12Q41 24 38 42Q24 46 10 42z', '#7a5a34') + flat(ell(24, 27, 6.5, 9), INK) + line('M5 44Q12 38 12 32M43 44Q36 38 36 32M16 45Q24 40 32 45', '#7a5a34', 3) + flat(ell(14, 10, 6, 3), '#5fae3b') + flat(ell(34, 11, 5, 3), '#5fae3b')),
  part('prop', [20, 20], [10, 14], [0, -22], cut(ell(10, 10, 6, 6.4), '#7cc455') + dot(8, 9, 1.2) + dot(12, 9, 1.2) + flat(poly([10, 0], [13, 5], [7, 5]), '#5fae3b')),
], { height: 48, gait: 'still', shadow: [40, 12], ring: 1.1 });

const ballistaNest = () => rig([
  part('body', [60, 58], [30, 58], [0, 0], stick('M12 30L8 56M48 30L52 56', '#6e4a29', 4) + cut(rrect(4, 28, 52, 8, 3), '#9b6b3e') + cut(ell(30, 28, 26, 9), '#d9b84a') + line('M10 28L16 22M22 26L26 20M36 26L40 20M48 28L52 22', '#a88a20', 1.2)),
  part('prop', [60, 40], [30, 24], [0, -30], stick('M4 10Q30 -4 56 10', '#6e4a29', 4) + line('M4 10L56 10', '#f6ecd2', 1) + stick('M30 10V36', '#9b6b3e', 4) + cut(poly([30, 2], [33, 12], [27, 12]), '#d8d8e8')),
], { height: 56, gait: 'still', shadow: [50, 12], ring: 1.2 });

export const cast = { 'bolt-tower': boltTower(), rootspout: rootspout(), 'ballista-nest': ballistaNest() };
