// The cast, part one: Ember Wisp, Brook Sprite, Thistle Pups, Bramble Knight, Moth Swarm (docs/arena-plan.md 6.5).
// Used by generate.js.

import { cut, flat, line, dot, eyes, ell, rrect, poly, part, place, rig, boot, arm, stick, mirror, INK } from './kit.js';

const emberWisp = () => {
  const flame = 'M14 2C17 10 25 15 25 24C25 30 20 33 14 33C8 33 3 30 3 24C3 15 11 10 14 2z';
  const inner = flat('M14 14C16 19 20 21 20 25C20 28 17 30 14 30C11 30 8 28 8 25C8 21 12 19 14 14z', '#ffb347') + flat(ell(14, 26, 3.5, 3), '#fff0b0');
  return rig([
    part('body', [28, 35], [14, 35], [0, -2], cut(flame, '#e8552f') + inner + eyes(14, 25, 3.2, 1.5)),
    part('bodyBack', [28, 35], [14, 35], [0, -2], cut(flame, '#e8552f') + inner),
    part('prop', [22, 16], [11, 0], [0, -3], dot(11, 3, 3, '#ff8a2a') + dot(6, 8, 2.2, '#ffb347') + dot(15, 12, 1.6, '#fff0b0')),
  ], { height: 34, gait: 'hover', lift: 14, shadow: [18, 7] });
};

const brookSprite = () => {
  const sleeve = arm(4, 11, '#35b6c9', '#f1c9a0');
  const cape = 'M9 1C16 4 18 12 16 19L9 22L2 19C0 12 2 4 9 1z';
  const hat = (cx) => cut(`M${cx} 0C${cx + 3} 4 ${cx + 7} 8 ${cx + 6} 11C${cx + 4} 10 ${cx - 4} 10 ${cx - 6} 11C${cx - 7} 8 ${cx - 3} 4 ${cx} 0z`, '#35b6c9');
  return rig([
    place('footA', boot(6, 4, '#35b6c9'), [-3, -3]),
    place('footB', boot(6, 4, '#35b6c9'), [3, -3]),
    part('body', [20, 20], [10, 20], [0, -5], cut(poly([5, 2], [15, 2], [17, 18], [3, 18]), '#e9d9a6') + line('M4.5 9H15.5', '#35b6c9', 2)),
    part('bodyBack', [20, 24], [10, 24], [0, -5], cut(cape, '#35b6c9') + line('M9 4V19', '#1f7f8f', 1.2)),
    part('head', [20, 22], [10, 22], [0, -22], cut(ell(10, 14, 6.5, 6.5), '#f1c9a0') + eyes(10, 15, 2.6, 1.4) + hat(10)),
    part('headBack', [20, 22], [10, 22], [0, -22], cut(ell(10, 14, 6.5, 6.5), '#7a5a3a') + hat(10)),
    place('armBack', sleeve, [-7, -20]),
    place('armFront', sleeve, [7, -20]),
    part('prop', [12, 30], [5, 27], [0, 0], stick('M5 27Q3 14 6 4', '#8a9a4a', 1.6) + cut(ell(8, 5, 3, 2), '#5fae3b') + dot(9, 2, 2, '#bfe8ff')),
  ], { height: 40, shadow: [18, 7], hand: [sleeve.hand[0], sleeve.hand[1]] });
};

const thistlePups = () => {
  const spikes = 'M3 18L2 11L6 12L5 5L10 9L12 2L15 8L20 4L19 11L24 10L22 18Q13 21 3 18z';
  const tips = flat(poly([5, 5], [5, 8], [8, 7]), '#5fae3b') + flat(poly([12, 2], [10, 6], [14, 6]), '#5fae3b') + flat(poly([20, 4], [17, 7], [20, 8]), '#5fae3b');
  const ear = cut(ell(3, 3, 2.4, 2.4), '#6a6788');
  return rig([
    place('footA', boot(6, 4, '#5a4a68'), [-5, -2]),
    place('footB', boot(6, 4, '#5a4a68'), [5, -2]),
    part('body', [26, 22], [13, 22], [0, -3], cut(spikes, '#7d7a9a') + tips),
    part('bodyBack', [26, 22], [13, 22], [0, -3], cut(spikes, '#7d7a9a') + tips),
    part('head', [16, 12], [8, 7], [0, -7], ear + `<g transform="translate(10 0)">${ear}</g>` + cut(ell(8, 7, 5.5, 4.5), '#e6d6c0') + dot(8, 8.5, 1.4) + eyes(8, 6, 2.5, 1.1)),
    part('headBack', [16, 10], [8, 6], [0, -7], cut(ell(8, 6, 5.5, 4), '#6a6788')),
  ], { height: 22, shadow: [20, 7], ring: 0.8 });
};

const brambleKnight = () => {
  const barrel = 'M5 2Q16 -1 27 2L30 14Q31 24 27 27Q16 29 5 27Q1 24 2 14z';
  const moss = flat(ell(8, 22, 5, 3), '#5fae3b') + flat(ell(24, 6, 4, 2.5), '#5fae3b');
  const bands = line('M3 10Q16 13 29 10', '#4a2f1a', 1.6) + line('M2.5 20Q16 23 29.5 20', '#4a2f1a', 1.6);
  const plume = line('M11 14V6', '#4a2f1a', 1.4) + dot(8.5, 5, 2.6, '#b03a6e') + dot(13.5, 5, 2.6, '#b03a6e') + dot(11, 2.6, 2.6, '#d4568c');
  const helmet = cut(ell(11, 16, 9, 8), '#7a4f2d');
  const gauntlet = arm(7, 14, '#6e4a29', '#5fae3b');
  return rig([
    place('footA', boot(10, 7, '#4a2f1a'), [-7, -4]),
    place('footB', boot(10, 7, '#4a2f1a'), [7, -4]),
    part('body', [32, 30], [16, 30], [0, -8], cut(barrel, '#8a5a34') + bands + moss),
    part('bodyBack', [32, 30], [16, 30], [0, -8], cut(barrel, '#8a5a34') + bands + flat(ell(16, 6, 9, 3), '#5fae3b')),
    part('head', [22, 26], [11, 26], [0, -32], helmet + flat(rrect(5, 14, 12, 4, 2), INK) + dot(8.5, 16, 1.2, '#ffe066') + dot(13.5, 16, 1.2, '#ffe066') + plume),
    part('headBack', [22, 26], [11, 26], [0, -32], helmet + plume),
    place('armBack', gauntlet, [-17, -27]),
    place('armFront', gauntlet, [17, -27]),
    part('prop', [14, 40], [7, 36], [0, 0], cut(poly([5, 34], [4, 16], [6, 3], [9, 15], [9, 34]), '#c49a62') + cut(ell(11, 12, 3, 2), '#5fae3b') + flat(rrect(2, 33, 10, 3, 1.5), '#4a2f1a')),
  ], { height: 48, shadow: [30, 10], hand: gauntlet.hand });
};

const mothSwarm = () => {
  const wing = 'M20 14C14 0 2 1 1 8C0 14 8 19 20 16z';
  const wingArt = (path) => cut(path, '#5fae3b') + flat(ell(path === wing ? 8 : 14, 8, 3.4, 3.4), '#f6ecd2') + dot(path === wing ? 8 : 14, 8, 1.7);
  const faceHead = (eyeMarks) => cut(ell(6, 8, 4.5, 4.2), '#e7d3a5') + line('M4 4L1 1M8 4L11 1', INK, 1) + eyeMarks;
  return rig([
    part('body', [14, 18], [7, 18], [0, -2], cut(ell(7, 10, 4.5, 7), '#e7d3a5') + line('M3 9H11M3.5 13H10.5', '#8a6a3a', 1)),
    part('head', [12, 12], [6, 12], [0, -14], faceHead(dot(4.5, 8, 1.5) + dot(7.5, 8, 1.5))),
    part('headBack', [12, 12], [6, 12], [0, -14], faceHead('')),
    part('armBack', [22, 20], [20, 15], [-3, -9], wingArt(wing)),
    part('armFront', [22, 20], [2, 15], [3, -9], wingArt(mirror(wing, 22))),
  ], { height: 22, gait: 'hover', lift: 10, shadow: [12, 5], ring: 0.6 });
};

export const cast = {
  'ember-wisp': emberWisp(),
  'brook-sprite': brookSprite(),
  'thistle-pups': thistlePups(),
  'bramble-knight': brambleKnight(),
  'moth-swarm': mothSwarm(),
};
