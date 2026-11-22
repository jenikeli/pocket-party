// The cast, towers and teams: the Warden and Keep (stone body, team-coloured roof and banner, lantern, shutters, rubble)
// and the team base rings with the Dawn sun and Dusk crescent crest. Drawn by tower-sprite.js and puppet.js. Used by
// generate.js.

import { cut, flat, line, dot, ell, rrect, poly, part, stick, INK, CREAM } from './kit.js';

const STONE = '#8a7a9a';
const TEAMS = { dawn: '#ffc53d', dusk: '#8e6bff' };

function bricks(x, y, width, height) {
  let path = '';
  for (let row = y + 12; row < y + height; row += 12) {
    path += `M${x + 2} ${row}H${x + width - 2}`;
    for (let column = x + 8 + ((row / 12) % 2) * 8; column < x + width - 4; column += 16) {
      path += `M${column} ${row - 12}V${row}`;
    }
  }
  return line(path, '#5a4a6a', 1);
}

const crest = (team, cx, cy) => (team === 'dawn'
  ? dot(cx, cy, 6.4, INK) + dot(cx, cy, 4.4, '#ffc53d') + line(`M${cx} ${cy - 9}V${cy - 6.6}M${cx} ${cy + 6.6}V${cy + 9}M${cx - 9} ${cy}H${cx - 6.6}M${cx + 6.6} ${cy}H${cx + 9}`, '#ffc53d', 1.8)
  : flat(`M${cx} ${cy - 7}a7 7 0 1 0 6.5 9.5a5.4 5.4 0 1 1 -6.5 -9.5z`, INK) + flat(`M${cx - 0.5} ${cy - 5.6}a5.6 5.6 0 1 0 5 7.6a4.4 4.4 0 1 1 -5 -7.6z`, '#8e6bff'));

function ring(team) {
  return part(`ring-${team}`, [60, 32], [30, 14], [0, 0],
    flat(ell(30, 14, 26, 11), 'rgba(29,27,46,0.35)') + `<path d="${ell(30, 14, 26, 11)}" fill="none" stroke="${CREAM}" stroke-width="7"/>`
    + `<path d="${ell(30, 14, 26, 11)}" fill="none" stroke="${TEAMS[team]}" stroke-width="4.6"/>` + crest(team, 30, 25));
}

function tower(config) {
  const { width, height, roofWidth, roofHeight, lanternY, wide } = config;
  const middle = width / 2;
  const walls = wide
    ? cut(rrect(18, 20, width - 36, height - 20, 3), STONE) + cut(rrect(2, 56, 30, height - 56, 3), '#7a6a8a') + cut(rrect(width - 32, 56, 30, height - 56, 3), '#7a6a8a') + bricks(18, 20, width - 36, height - 20)
    : cut(poly([10, 18], [width - 10, 18], [width - 4, height - 2], [4, height - 2]), STONE) + bricks(8, 18, width - 16, height - 20);
  const crenel = cut(rrect(middle - (wide ? 40 : 28), 8, wide ? 80 : 56, 14, 2), '#9a8aaa');
  const body = part('body', [width, height], [middle, height], [0, 0], walls + crenel + flat(rrect(middle - 13, lanternY - 14, 26, 30, 13), '#2a2438'));
  const roof = (team) => part(`roof-${team}`, [roofWidth, roofHeight], [roofWidth / 2, roofHeight], [0, -(height - 12)], cut(poly([roofWidth / 2, 2], [roofWidth - 3, roofHeight - 6], [3, roofHeight - 6]), TEAMS[team]) + cut(rrect(1, roofHeight - 10, roofWidth - 2, 8, 3), team === 'dawn' ? '#c98a12' : '#5a3fc4'));
  const banner = (team) => part(`banner-${team}`, [26, 40], [3, 38], [roofWidth / 2 - 4, -(height - 12) - roofHeight + 24], stick('M3 38V3', '#6e4a29', 2) + cut(poly([4, 4], [24, 4], [24, 26], [14, 21], [4, 26]), TEAMS[team]) + crest(team, 14, 13).replace(/stroke-width="1.8"/g, 'stroke-width="1.2"'));
  const lanternPart = part('lantern', [26, 30], [13, 15], [0, -(height - lanternY)], cut(rrect(1, 1, 24, 28, 12), '#fff2b8') + dot(13, 15, 5, '#fffbe0') + line('M13 1V29M1 15H25', '#a88a20', 1));
  const shutter = (side) => part(`shutter${side}`, [16, 32], [side === 'L' ? 0 : 16, 16], [side === 'L' ? -13 : 13, -(height - lanternY)], cut(rrect(1, 1, 14, 30, 4), '#6e4a29') + line('M4 6H12M4 16H12M4 26H12', '#3a2614', 1));
  const rubble = part('rubble', [width, 40], [middle, 36], [0, 0], cut(poly([4, 34], [10, 14], [24, 22], [34, 6], [48, 18], [60, 10], [width - 6, 34]), '#6c5b7b') + cut(poly([18, 36], [24, 26], [36, 30], [42, 36]), '#8a7a9a') + (wide ? cut(poly([width - 40, 36], [width - 30, 20], [width - 16, 26], [width - 10, 36]), '#7a6a8a') : ''));
  return { parts: [body, roof('dawn'), roof('dusk'), banner('dawn'), banner('dusk'), lanternPart, ...(wide ? [shutter('L'), shutter('R')] : []), rubble], config: { height: height + roofHeight - 12, gait: 'still', lift: 0, shadow: [0, 0], ring: 1, hand: null, order: { front: [], back: [] } } };
}

export const cast = {
  'tower-warden': tower({ width: 76, height: 112, roofWidth: 88, roofHeight: 52, lanternY: 64 }),
  'tower-keep': tower({ width: 116, height: 132, roofWidth: 100, roofHeight: 60, lanternY: 76, wide: true }),
  team: { parts: [ring('dawn'), ring('dusk')], config: { height: 0, gait: 'still', lift: 0, shadow: [0, 0], ring: 1, hand: null, order: { front: [], back: [] } } },
};
