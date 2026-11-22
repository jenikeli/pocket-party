// The cast, part three: Rampart Golem, Tideshell Guardian, Hexweaver, Magma Brute and the three tokens (Cog Bot,
// Sapling, Rubble) (docs/arena-plan.md 6.5). Used by generate.js.

import { cut, flat, line, dot, eyes, ell, rrect, poly, star, part, place, rig, boot, arm, stick, INK } from './kit.js';

const fist = (width, length, color, skin = color) => {
  const middle = width / 2 + 2;
  return {
    size: [width + 4, length + 6], pivot: [middle, 4], hand: [middle, length - 6],
    content: cut(rrect(3, 3, width - 2, length - 12, 4), color) + cut(rrect(1, length - 14, width + 2, 14, 5), skin),
  };
};

const rampartGolem = () => {
  const mortar = '#4a5568';
  const wall = (extra) => cut(rrect(3, 3, 58, 50, 4), '#7f8fa5') + line('M3 20H61M3 36H61', mortar, 1.6) + line(extra, mortar, 1.6) + flat(ell(14, 48, 8, 3), '#5fae3b');
  const block = fist(18, 42, '#7f8fa5');
  const head = (front) => cut(rrect(3, 3, 24, 20, 3), '#8a9ab0') + (front ? flat(rrect(7, 10, 6, 3, 1), '#ffd27a') + flat(rrect(17, 10, 6, 3, 1), '#ffd27a') + line('M10 18H20', mortar, 1.4) : flat(ell(20, 8, 5, 2.5), '#5fae3b'));
  return rig([
    place('footA', boot(16, 10, '#6f7f95'), [-14, -5]),
    place('footB', boot(16, 10, '#6f7f95'), [14, -5]),
    part('body', [64, 56], [32, 56], [0, -10], wall('M22 3V20M42 20V36M30 36V53M12 20V36')),
    part('bodyBack', [64, 56], [32, 56], [0, -10], wall('M42 3V20M22 20V36M34 36V53M50 20V36')),
    part('head', [30, 26], [15, 26], [0, -62], head(true)),
    part('headBack', [30, 26], [15, 26], [0, -62], head(false)),
    place('armBack', block, [-38, -56]),
    place('armFront', block, [38, -56]),
    part('prop', [26, 44], [3, 42], [24, -62], stick('M3 42V3', '#6e4a29', 2) + cut(poly([4, 4], [24, 8], [4, 18]), '#5a8fd0') + line('M6 11H20', '#f6ecd2', 1.4)),
  ], { height: 84, shadow: [64, 16], ring: 1.6, hand: block.hand });
};

const tideshellGuardian = () => {
  const flipper = arm(6, 14, '#4aa58a', '#4aa58a');
  const crest = cut(poly([12, 0], [17, 8], [7, 8]), '#f0e2b0');
  const bubbles = dot(4, 6, 2, '#bfe8ff') + dot(30, 28, 1.6, '#bfe8ff') + dot(32, 8, 2.4, '#bfe8ff');
  return rig([
    place('footA', boot(10, 6, '#2a9fb0'), [-6, -3]),
    place('footB', boot(10, 6, '#2a9fb0'), [6, -3]),
    part('body', [30, 28], [15, 28], [0, -8], cut(rrect(4, 2, 22, 24, 6), '#2a9fb0') + cut(ell(15, 15, 6.5, 8), '#f0e2b0') + line('M9 15H21M15 8V22', '#c9b880', 1.2)),
    part('bodyBack', [40, 36], [20, 36], [0, -8], cut(ell(20, 18, 17, 16), '#35b6c9') + line('M20 3V33M6 18H34M10 8L30 28M30 8L10 28', '#1f7f8f', 1.3) + flat(ell(20, 18, 4, 4), '#f0e2b0')),
    part('head', [24, 24], [12, 24], [0, -32], crest + cut(ell(12, 16, 7.5, 7), '#4aa58a') + flat(rrect(9, 18, 6, 3, 1.5), '#2d7a66') + eyes(12, 14, 3, 1.4)),
    part('headBack', [24, 24], [12, 24], [0, -32], crest + cut(ell(12, 16, 7.5, 7), '#4aa58a')),
    place('armBack', flipper, [-14, -26]),
    place('armFront', flipper, [14, -26]),
    part('prop', [40, 40], [20, 20], [0, 0], cut(star(20, 20, 17, 14.5, 10), '#35b6c9') + flat(ell(20, 20, 9, 9), '#f0e2b0') + line('M20 11V29M11 20H29M14 14L26 26M26 14L14 26', '#1f7f8f', 1.1) + bubbles),
  ], { height: 52, shadow: [30, 10], ring: 1.1, hand: flipper.hand });
};

const hexweaver = () => {
  const sleeve = arm(4, 14, '#35b6c9', '#f0e2b0');
  const threads = ['#35b6c9', '#f0e2b0', '#35b6c9', '#f0e2b0', '#35b6c9', '#f0e2b0', '#35b6c9']
    .map((color, index) => line(`M${3 + index * 2.4} 2Q${index % 2 ? 0 : 20} 22 ${2 + index * 2.6} 50`, color, 1)).join('');
  const hood = cut('M10 1Q19 3 18 14L16 10Q10 6 4 10L2 14Q1 3 10 1z', '#35b6c9');
  return rig([
    part('body', [24, 42], [12, 42], [0, -8], cut(poly([7, 2], [15, 2], [21, 38], [3, 38]), '#35b6c9') + `<path d="M11 4V38" stroke="#f0e2b0" stroke-width="1.4" stroke-dasharray="2.2 2" fill="none"/>`),
    part('bodyBack', [24, 42], [12, 42], [0, -8], cut(poly([7, 2], [15, 2], [21, 38], [3, 38]), '#2a9fb0') + line('M7 12L15 30M15 12L7 30', '#f0e2b0', 1.1)),
    part('head', [20, 26], [10, 26], [0, -48], cut(ell(10, 15, 5.8, 6.8), '#f0e2b0') + line('M6.5 13.5L9 16M9 13.5L6.5 16M11 13.5L13.5 16M13.5 13.5L11 16', INK, 1.1) + hood),
    part('headBack', [20, 26], [10, 26], [0, -48], cut(ell(10, 15, 5.8, 6.8), '#2a9fb0') + hood),
    part('armBack', [24, 54], [12, 2], [-9, -42], threads),
    place('armFront', sleeve, [8, -42]),
    part('prop', [14, 60], [7, 44], [0, 0], cut(rrect(5, 8, 3.4, 50, 1.7), '#8a6a3a') + cut(poly([6.7, 0], [10, 10], [3.4, 10]), '#f0e2b0') + line('M6.7 4Q13 6 11 12', '#35b6c9', 1)),
  ], { height: 62, gait: 'glide', lift: 4, shadow: [22, 8], hand: sleeve.hand });
};

const magmaBrute = () => {
  const rock = '#3d3345';
  const glow = (cracks) => line(cracks, '#ff8a2a', 2.2) + line(cracks, '#ffd27a', 0.8);
  const body = 'M10 6Q35 -2 60 6L68 30Q66 52 54 56Q35 60 16 56Q4 52 2 30z';
  const knuckle = fist(24, 50, rock, '#4a3d52');
  const head = (front) => cut(ell(15, 15, 13, 11), rock) + (front ? dot(10, 14, 3, '#ff6a1a') + dot(20, 14, 3, '#ff6a1a') + dot(10, 14, 1.3, '#fff0b0') + dot(20, 14, 1.3, '#fff0b0') + glow('M9 22L13 20L16 23L21 20') : glow('M8 8L13 12L18 8'));
  return rig([
    place('footA', boot(18, 10, '#2f2738'), [-15, -5]),
    place('footB', boot(18, 10, '#2f2738'), [15, -5]),
    part('body', [72, 60], [36, 60], [0, -12], cut(body, rock) + glow('M14 14L24 24L20 38M34 8L38 22L50 30M56 16L50 28L58 44M30 46L40 40')),
    part('bodyBack', [72, 60], [36, 60], [0, -12], cut(body, rock) + glow('M20 10L28 24L22 40M44 10L40 26L52 34M36 44L46 48')),
    part('head', [30, 28], [15, 28], [0, -66], head(true)),
    part('headBack', [30, 28], [15, 28], [0, -66], head(false)),
    place('armBack', knuckle, [-42, -54]),
    place('armFront', knuckle, [42, -54]),
  ], { height: 80, shadow: [66, 16], ring: 1.6 });
};

const cogBot = () => {
  const head = (face) => cut(rrect(2, 4, 14, 10, 3), '#b4bfce') + face + line('M9 4V1', INK, 1) + dot(9, 1, 1.4, '#e8552f');
  return rig([
    place('footA', boot(6, 4, '#6b7585'), [-3, -2]),
    place('footB', boot(6, 4, '#6b7585'), [3, -2]),
    part('body', [20, 20], [10, 20], [0, -3], cut(star(10, 11, 9, 6.6, 8), '#9aa6b5') + cut(ell(10, 11, 4, 4), '#c9a24a')),
    part('bodyBack', [20, 20], [10, 20], [0, -3], cut(star(10, 11, 9, 6.6, 8), '#9aa6b5') + line('M10 11L16 6', '#c9a24a', 1.6)),
    part('head', [18, 16], [9, 14], [0, -15], head(dot(6, 9, 2, '#ffe066') + dot(12, 9, 2, '#ffe066') + dot(6, 9, 0.8) + dot(12, 9, 0.8))),
    part('headBack', [18, 16], [9, 14], [0, -15], head('')),
  ], { height: 26, shadow: [16, 6], ring: 0.7 });
};

const sapling = () => {
  const twig = arm(2.4, 8, '#8a5a34', '#8a5a34');
  const leaves = cut(ell(5, 5, 4, 2.4), '#5fae3b') + `<g transform="translate(8 -2)">${cut(ell(5, 5, 4, 2.4), '#7cc455')}</g>`;
  return rig([
    place('footA', boot(5, 4, '#5a3c25'), [-3, -2]),
    place('footB', boot(5, 4, '#5a3c25'), [3, -2]),
    part('body', [18, 18], [9, 18], [0, -3], cut(rrect(3, 2, 12, 14, 5), '#8a5a34') + line('M6 6Q9 9 6 13', '#5a3c25', 1)),
    part('head', [20, 20], [10, 18], [0, -17], leaves + cut(ell(10, 13, 5.5, 5), '#a8794a') + eyes(10, 13, 2.2, 1.2)),
    part('headBack', [20, 20], [10, 18], [0, -17], leaves + cut(ell(10, 13, 5.5, 5), '#8a5a34')),
    place('armBack', twig, [-7, -12]),
    place('armFront', twig, [7, -12]),
  ], { height: 28, shadow: [16, 6], ring: 0.7 });
};

const rubble = () => {
  const pile = poly([3, 18], [2, 10], [7, 4], [14, 6], [20, 3], [25, 10], [24, 18], [14, 20]);
  const stone = arm(6, 10, '#6f7f95', '#6f7f95');
  return rig([
    place('footA', boot(8, 6, '#56657a'), [-5, -3]),
    place('footB', boot(8, 6, '#56657a'), [5, -3]),
    part('body', [28, 24], [14, 24], [0, -5], cut(pile, '#7f8fa5') + line('M8 8L12 14L9 18M17 6L16 13L21 17', '#4a5568', 1.1)),
    part('head', [18, 16], [9, 14], [0, -20], cut(poly([2, 12], [3, 4], [9, 2], [15, 4], [16, 12], [9, 13]), '#8a9ab0') + dot(6, 8, 1.6, '#ffd27a') + dot(12, 8, 1.6, '#ffd27a')),
    part('headBack', [18, 16], [9, 14], [0, -20], cut(poly([2, 12], [3, 4], [9, 2], [15, 4], [16, 12], [9, 13]), '#7f8fa5')),
    place('armBack', stone, [-12, -18]),
    place('armFront', stone, [12, -18]),
  ], { height: 30, shadow: [26, 9], ring: 0.9 });
};

export const cast = {
  'rampart-golem': rampartGolem(),
  'tideshell-guardian': tideshellGuardian(),
  hexweaver: hexweaver(),
  'magma-brute': magmaBrute(),
  'cog-bot': cogBot(),
  sapling: sapling(),
  rubble: rubble(),
};
