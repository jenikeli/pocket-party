// The cast, spells: one `prop` picture each (cloud, snowflake, wave, leaves, comet) that the effects can draw over the
// arena when a spell lands (docs/arena-plan.md 6.5). Used by generate.js.

import { cut, flat, line, dot, ell, poly, star, part, rig } from './kit.js';

const single = (width, height, content, ringHeight = 30) => rig([part('prop', [width, height], [width / 2, height / 2], [0, 0], content)], { height: ringHeight, gait: 'still', shadow: [0, 0] });

export const cast = {
  static: single(48, 36, cut('M10 28Q2 28 3 20Q4 13 12 14Q14 5 24 6Q33 6 35 14Q44 13 45 21Q46 28 38 28z', '#5a6a8a') + flat(poly([26, 20], [20, 20], [24, 14], [18, 30], [32, 20], [27, 20]), '#ffe066') + dot(16, 20, 1.4) + dot(30, 18, 1.4)),
  rime: single(40, 40, cut(star(20, 20, 17, 7, 6), '#bfe8ff') + line('M20 3V37M5 12L35 28M35 12L5 28', '#35b6c9', 1.4) + dot(20, 20, 3, '#fff')),
  surge: single(48, 34, cut('M2 30Q4 10 20 6Q34 4 42 14Q36 12 32 16Q40 22 46 30z', '#35b6c9') + flat('M14 10Q24 4 34 8Q26 10 22 14z', '#bfe8ff') + line('M8 26Q20 22 38 26', '#bfe8ff', 1.4)),
  'verdant-mend': single(40, 40, cut(ell(14, 14, 8, 4.6), '#7cc455') + `<g transform="translate(12 14)">${cut(ell(14, 14, 8, 4.6), '#5fae3b')}</g>` + cut(ell(10, 28, 6, 3.6), '#5fae3b') + line('M14 14Q22 20 20 30Q16 36 8 34', '#2e7a3a', 1.2)),
  flare: single(48, 40, cut('M4 36Q22 30 30 18Q36 8 44 4Q42 16 36 24Q30 36 4 36z', '#e8552f') + cut(ell(34, 14, 7, 7), '#ffb347') + dot(34, 14, 3, '#fff0b0')),
};
