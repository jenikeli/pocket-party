// The cast, part two: Powder Cart, Kestrel, Cinder Hound, Pyre Mage, Stag Rider, Pikewarden, Cogwright
// (docs/arena-plan.md 6.5). Used by generate.js.

import { cut, flat, line, dot, eyes, ell, rrect, poly, star, part, place, rig, boot, arm, stick, INK } from './kit.js';

const powderCart = () => {
  const wheel = (spin) => part(spin, [18, 18], [9, 9], [spin === 'footA' ? -11 : 11, -7], cut(ell(9, 9, 7, 7), '#6e4a29') + flat(ell(9, 9, 2.5, 2.5), '#d9c08a') + line('M9 3V15M3 9H15M5 5L13 13M13 5L5 13', '#3a2614', 1));
  const grin = flat('M7 17Q18 27 29 17Q18 21 7 17z', '#fff') + line('M7 17Q18 27 29 17', INK, 1.4) + line('M12 20V23M18 21.5V25M24 20V23', INK, 0.9);
  return rig([
    wheel('footA'), wheel('footB'),
    part('body', [38, 34], [19, 34], [0, -7], cut(rrect(3, 6, 32, 26, 4), '#9aa6b5') + flat(rrect(3, 6, 32, 5, 2), '#6b7585') + dot(11, 13, 2.4, '#fff') + dot(25, 13, 2.4, '#fff') + dot(11.6, 13.4, 1.2) + dot(25.6, 13.4, 1.2) + grin),
    part('bodyBack', [38, 34], [19, 34], [0, -7], cut(rrect(3, 6, 32, 26, 4), '#9aa6b5') + line('M3 15H35M3 24H35', '#6b7585', 1.2) + flat(rrect(15, 20, 8, 8, 1), '#6e4a29')),
    part('prop', [26, 34], [13, 34], [0, -32], cut(rrect(3, 12, 20, 20, 6), '#8a5a34') + line('M3 19H23M3 26H23', '#4a2f1a', 1.4) + stick('M13 12Q15 6 11 2', '#d9c08a', 1) + dot(11, 2, 2.6, '#ffe066') + dot(11, 2, 1.2, '#fff')),
  ], { height: 46, gait: 'roll', shadow: [38, 10] });
};

const kestrel = () => {
  const sleeve = arm(4, 18, '#7b8594', '#f1c9a0');
  const hood = (back) => cut('M11 2L18 10Q20 18 14 20H8Q2 18 4 10z', '#7b8594') + (back ? line('M11 4V18', '#59606d', 1.2) : flat(ell(11, 14, 4.2, 3.6), '#2a2438') + flat(poly([11, 14], [15, 17], [11, 19]), '#e8782f') + dot(9.4, 13, 1.1, '#ffd27a') + dot(12.6, 13, 1.1, '#ffd27a'))
    + flat(poly([17, 8], [22, 2], [19, 11]), '#e8782f');
  return rig([
    place('footA', { size: [8, 20], pivot: [4, 10], content: cut(rrect(2, 2, 4, 16, 2), '#b08a4a') }, [-4, -10]),
    place('footB', { size: [8, 20], pivot: [4, 10], content: cut(rrect(2, 2, 4, 16, 2), '#b08a4a') }, [4, -10]),
    part('body', [18, 34], [9, 34], [0, -18], cut(poly([6, 2], [12, 2], [16, 32], [2, 32]), '#7b8594') + line('M9 4V32', '#e8782f', 1.4)),
    part('bodyBack', [18, 34], [9, 34], [0, -18], cut(poly([6, 2], [12, 2], [16, 32], [2, 32]), '#7b8594') + flat(poly([3, 28], [15, 28], [14, 33], [4, 33]), '#e8782f')),
    part('head', [24, 22], [11, 22], [0, -50], hood(false)),
    part('headBack', [24, 22], [11, 22], [0, -50], hood(true)),
    place('armBack', sleeve, [-6, -46]),
    place('armFront', sleeve, [6, -46]),
    part('prop', [30, 40], [15, 20], [0, 0], stick('M8 2Q-4 20 8 38', '#b08a4a', 2.4) + line('M8 2L8 38', '#fff2b8', 0.7) + cut(star(20, 20, 6, 4, 6), '#c9a24a') + flat(poly([24, 12], [29, 8], [27, 14]), '#e8782f') + flat(poly([25, 28], [29, 32], [26, 26]), '#e8782f')),
  ], { height: 66, shadow: [20, 8], hand: sleeve.hand });
};

const cinderHound = () => {
  const fur = '#3a3340';
  const mane = (y) => cut(star(20, y, 17, 12, 9), '#e8552f') + flat(star(20, y, 11, 8, 9), '#ffb347');
  return rig([
    place('footA', boot(8, 7, '#2a2438'), [-8, -4]),
    place('footB', boot(8, 7, '#2a2438'), [8, -4]),
    part('body', [40, 22], [20, 22], [0, -5], cut(ell(20, 12, 17, 9), fur) + line('M9 10L14 14L12 18M26 9L24 14L30 17M20 6L19 11', '#ff8a2a', 1.3)),
    part('bodyBack', [40, 22], [20, 22], [0, -5], cut(ell(20, 12, 17, 9), fur) + line('M12 8L16 13M27 7L24 12', '#ff8a2a', 1.3)),
    part('head', [40, 40], [20, 36], [0, -16], mane(20) + cut(ell(20, 21, 9, 8), fur) + flat(ell(20, 26, 4.5, 3.2), '#5a4a58') + dot(20, 25, 1.4, INK) + dot(16, 19, 1.8, '#ffe066') + dot(24, 19, 1.8, '#ffe066') + flat(poly([11, 14], [8, 6], [15, 11]), '#2a2438') + flat(poly([29, 14], [32, 6], [25, 11]), '#2a2438')),
    part('headBack', [40, 40], [20, 36], [0, -16], mane(20) + cut(ell(20, 21, 8, 7), fur)),
    part('prop', [20, 22], [10, 18], [0, -9], stick('M10 18Q4 10 10 2', '#3a3340', 3) + dot(10, 3, 3, '#ff8a2a') + dot(10, 3, 1.4, '#fff0b0')),
  ], { height: 34, shadow: [38, 10], ring: 1.1 });
};

const pyreMage = () => {
  const robe = (flare) => cut(poly([8, 2], [16, 2], [flare, 34], [24 - flare, 34]), '#b8372a') + flat('M5 31Q12 36 19 31L19 34H5z', '#2a2438');
  const hat = (coal) => cut(ell(12, 18, 12, 3.4), '#2a2438') + cut('M12 1Q16 10 18 18H6Q9 8 12 1z', '#b8372a') + (coal ? dot(12, 17, 2.4, '#ffb347') + dot(12, 17, 1.2, '#fff') : '');
  const sleeve = arm(5, 11, '#b8372a', '#f1c9a0');
  return rig([
    part('body', [24, 36], [12, 36], [0, -6], robe(21)),
    part('bodyBack', [24, 36], [12, 36], [0, -6], robe(21) + line('M12 4V30', '#2a2438', 1.2)),
    part('head', [24, 34], [12, 34], [0, -38], cut(ell(12, 26, 5.6, 5.6), '#f1c9a0') + eyes(12, 27, 2.4, 1.3) + hat(true)),
    part('headBack', [24, 34], [12, 34], [0, -38], cut(ell(12, 26, 5.6, 5.6), '#3a2a1a') + hat(false)),
    place('armBack', sleeve, [-9, -32]),
    place('armFront', sleeve, [9, -32]),
    part('prop', [20, 20], [10, 10], [0, 0], cut(ell(10, 10, 6, 6), '#e8552f') + flat(ell(10, 10, 3.4, 3.4), '#ffb347') + dot(10, 10, 1.6, '#fff0b0')),
  ], { height: 66, gait: 'glide', lift: 5, shadow: [24, 8], hand: sleeve.hand });
};

const stagRider = () => {
  const antler = 'M20 14L12 8L8 1M12 8L5 7M20 14L28 8L32 1M28 8L35 7';
  const lance = arm(3, 18, '#5fae3b', '#f1c9a0');
  return rig([
    place('footA', boot(6, 8, '#5a3c25'), [-8, -4]),
    place('footB', boot(6, 8, '#5a3c25'), [8, -4]),
    part('body', [40, 36], [20, 36], [0, -8], cut(ell(20, 22, 15, 11), '#a8794a') + cut(rrect(10, 14, 20, 8, 3), '#5fae3b') + cut(rrect(15, 2, 10, 14, 4), '#d9a63a') + cut(ell(20, 4, 4.5, 4.5), '#f1c9a0') + eyes(20, 5, 1.8, 1) + flat(poly([14, 3], [8, 1], [13, 6]), '#5fae3b') + flat(poly([26, 3], [32, 1], [27, 6]), '#5fae3b')),
    part('bodyBack', [40, 36], [20, 36], [0, -8], cut(ell(20, 22, 15, 11), '#a8794a') + cut(rrect(10, 14, 20, 8, 3), '#5fae3b') + cut(rrect(15, 2, 10, 14, 4), '#d9a63a') + cut(ell(20, 4, 4.5, 4.5), '#6a4a2a')),
    part('head', [40, 34], [20, 30], [0, -16], line(antler, '#f6ecd2', 4.4) + line(antler, '#d9a63a', 2.4) + cut(ell(20, 22, 7, 8), '#a8794a') + flat(ell(20, 27, 4, 3), '#d9c08a') + dot(20, 27, 1.2) + dot(16.5, 20, 1.5) + dot(23.5, 20, 1.5)),
    part('headBack', [40, 34], [20, 30], [0, -16], line(antler, '#f6ecd2', 4.4) + line(antler, '#d9a63a', 2.4) + cut(ell(20, 22, 7, 7), '#a8794a')),
    place('armBack', lance, [-9, -28]),
    place('armFront', lance, [9, -28]),
    part('prop', [10, 50], [5, 44], [0, 0], cut(rrect(3, 4, 4, 44, 2), '#c49a62') + cut(poly([5, 0], [9, 10], [1, 10]), '#d8d8e8')),
  ], { height: 50, shadow: [34, 10], ring: 1.1, hand: lance.hand });
};

const pikewarden = () => {
  const sleeve = arm(4, 15, '#8aa0b0', '#f1c9a0');
  const helmet = cut('M11 1Q20 1 20 10L20 13H2L2 10Q2 1 11 1z', '#a8b4c0') + flat(rrect(0, 12, 22, 3, 1.5), '#8aa0b0');
  return rig([
    place('footA', boot(7, 6, '#4a5560'), [-5, -3]),
    place('footB', boot(7, 6, '#4a5560'), [5, -3]),
    part('body', [20, 34], [10, 34], [0, -7], cut(poly([5, 2], [15, 2], [18, 30], [2, 30]), '#8aa0b0') + flat(rrect(7, 4, 6, 26, 2), '#2a9fb0') + line('M3 20H17', '#4a5560', 1.4)),
    part('bodyBack', [20, 34], [10, 34], [0, -7], cut(poly([5, 2], [15, 2], [18, 30], [2, 30]), '#8aa0b0') + line('M10 3V30', '#4a5560', 1.2)),
    part('head', [22, 24], [11, 24], [0, -38], cut(ell(11, 17, 5.5, 5.5), '#f1c9a0') + eyes(11, 18, 2.4, 1.3) + helmet),
    part('headBack', [22, 24], [11, 24], [0, -38], cut(ell(11, 17, 5.5, 5.5), '#5a3a2a') + helmet),
    place('armBack', sleeve, [-9, -34]),
    place('armFront', sleeve, [8, -34]),
    part('prop', [10, 78], [5, 56], [0, 0], cut(rrect(3, 14, 4, 62, 2), '#b08a4a') + cut(poly([5, 0], [9, 16], [1, 16]), '#e8f0f8') + flat(poly([5, 4], [7, 14], [5, 14]), '#fff')),
  ], { height: 60, shadow: [22, 8], hand: sleeve.hand });
};

const cogwright = () => {
  const sleeve = arm(6, 11, '#c9a24a', '#f1c9a0');
  const cap = cut('M3 12Q4 3 12 3Q20 3 21 12z', '#8a5a34') + flat(rrect(2, 11, 20, 3, 1.5), '#6e4a29');
  const pack = cut(rrect(1, 8, 26, 26, 5), '#8a6a3a') + cut(rrect(18, 0, 6, 10, 2), '#6b7585') + line('M4 18H24M4 26H24', '#4a2f1a', 1.2) + flat(ell(14, 28, 4, 2.6), '#ff8a2a') + cut(star(8, 15, 4.4, 3, 6), '#c9a24a');
  return rig([
    place('footA', boot(8, 6, '#4a2f1a'), [-6, -3]),
    place('footB', boot(8, 6, '#4a2f1a'), [6, -3]),
    part('body', [32, 28], [16, 28], [0, -7], cut(ell(16, 15, 13, 12), '#c9a24a') + cut(rrect(9, 8, 14, 17, 3), '#8a6a3a') + cut(star(16, 16, 4, 2.8, 6), '#e8d28a')),
    part('bodyBack', [28, 36], [14, 36], [0, -7], pack),
    part('head', [24, 24], [12, 24], [0, -29], cut(ell(12, 16, 7, 7), '#f1c9a0') + cut(ell(8, 14, 3.2, 3.2), '#6b7585') + cut(ell(16, 14, 3.2, 3.2), '#6b7585') + dot(8, 14, 1.2, '#bfe8ff') + dot(16, 14, 1.2, '#bfe8ff') + cap),
    part('headBack', [24, 24], [12, 24], [0, -29], cut(ell(12, 16, 7, 7), '#6a4a2a') + cap),
    place('armBack', sleeve, [-14, -22]),
    place('armFront', sleeve, [14, -22]),
    part('prop', [22, 14], [3, 7], [0, 0], cut(rrect(2, 5, 16, 4, 2), '#6b7585') + cut(star(18, 7, 4.6, 3, 6), '#c9a24a')),
  ], { height: 42, shadow: [32, 10], hand: sleeve.hand });
};

export const cast = {
  'powder-cart': powderCart(),
  kestrel: kestrel(),
  'cinder-hound': cinderHound(),
  'pyre-mage': pyreMage(),
  'stag-rider': stagRider(),
  pikewarden: pikewarden(),
  cogwright: cogwright(),
};
