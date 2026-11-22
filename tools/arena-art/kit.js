// Drawing helpers for Spirefall's puppet parts (docs/arena-plan.md section 3.5): three-tone cut-paper shapes with a
// cream edge and the light at the upper left, plus path builders and the part/rig records. Used by the cast-*.js
// files and generate.js. Dev tool only; the game loads the SVG files this writes.

export const INK = '#1d1b2e';
export const CREAM = '#f6ecd2';
export const FACTION = { cinder: '#e8552f', brook: '#35b6c9', thorn: '#5fae3b', cog: '#9aa6b5' };

function channels(hex) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

// Mixes a colour toward another (white or black) by `amount` 0..1.
export function mix(hex, toward, amount) {
  const target = channels(toward);
  const parts = channels(hex).map((value, index) => Math.round(value + (target[index] - value) * amount));
  return `#${parts.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export const tones = (hex) => ({ light: mix(hex, '#ffffff', 0.32), base: hex, shade: mix(hex, '#1d1b2e', 0.32) });

// Path builders.
export const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
export const rrect = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
export const poly = (...points) => `M${points.map((point) => point.join(' ')).join('L')}z`;
// A spiky ring of `count` teeth around a centre, for thistles, cogs and flames.
export function star(cx, cy, outer, inner, count) {
  const points = [];
  for (let index = 0; index < count * 2; index += 1) {
    const angle = (index / (count * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 === 0 ? outer : inner;
    points.push([+(cx + Math.cos(angle) * radius).toFixed(1), +(cy + Math.sin(angle) * radius).toFixed(1)]);
  }
  return poly(...points);
}

let counter = 0;

// A cut-paper shape: cream edge, shade underneath, light on the upper-left rim, base in the middle. The three tones
// come from clipping the same path shifted by `shift` px, so each costs one <use>, not three paths.
export function cut(d, color, shift = 2) {
  const id = `s${counter++}`;
  const t = tones(color);
  const clip = (name, dx, dy) => `<clipPath id="${id}${name}"><use href="#${id}" transform="translate(${dx} ${dy})"/></clipPath>`;
  return `<defs><path id="${id}" d="${d}"/>${clip('p', 0, 0)}${clip('a', -shift, -shift)}${clip('b', shift, shift)}</defs>`
    + `<use href="#${id}" fill="${t.shade}" stroke="${CREAM}" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<g clip-path="url(#${id}p)"><use href="#${id}" fill="${t.light}" transform="translate(${-shift} ${-shift})"/>`
    + `<g clip-path="url(#${id}b)"><use href="#${id}" fill="${t.base}" transform="translate(${-shift} ${-shift})"/></g></g>`;
}

export const flat = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
export const line = (d, color = INK, width = 1.2) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const dot = (cx, cy, r, fill = INK) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
export const eyes = (cx, cy, gap, r = 1.7) => dot(cx - gap, cy, r) + dot(cx + gap, cy, r) + dot(cx - gap + 0.5, cy - 0.6, 0.5, '#fff') + dot(cx + gap + 0.5, cy - 0.6, 0.5, '#fff');

// One part: size in px, pivot in the part, and `at`, where the pivot sits relative to the unit's feet (y up is negative).
export function part(name, size, pivot, at, content) {
  const [width, height] = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
  return { name, size, pivot, at, svg };
}

// A character: its parts plus the numbers the rig player needs. `gait` is walk, hover, glide, roll or still. `hand` is
// where the prop is held, in the front arm's pixels (the prop part's own pivot is its hold point).
export function rig(parts, { height, gait = 'walk', lift = 0, shadow = [26, 9], hand = null, ring = 1 }) {
  const has = (name) => parts.some((entry) => entry.name === name);
  const pick = (names) => names.filter(has);
  const front = pick(['footA', 'footB', 'armBack', 'body', 'head', 'armFront', 'prop']);
  const back = pick(['footA', 'footB', 'armBack', has('bodyBack') ? 'bodyBack' : 'body', has('headBack') ? 'headBack' : 'head', 'armFront', 'prop']);
  return { parts, config: { height, gait, lift, shadow, ring, hand, order: { front, back } } };
}

// Mirrors an absolute path (M L C Q Z only) across a part of `width` px, so a right wing matches a left one.
export function mirror(d, width) {
  let index = 0;
  return d.replace(/[A-Za-z]|-?\d*\.?\d+/g, (token) => {
    if (/[A-Za-z]/.test(token)) {
      index = 0;
      return token;
    }
    index += 1;
    return index % 2 === 1 ? String(+(width - Number(token)).toFixed(1)) : token;
  });
}

// A boot or foot: a rounded cut shape with a little padding for the edge.
export function boot(width, height, color) {
  return { size: [width + 4, height + 4], pivot: [(width + 4) / 2, (height + 4) / 2], content: cut(rrect(2, 2, width, height, Math.min(height / 2, width / 2)), color) };
}

// An arm hanging from the shoulder (pivot at the top) with a round hand. `hand` is the grip point.
export function arm(width, length, sleeve, skin) {
  const middle = (width + 4) / 2;
  return {
    size: [width + 4, length + 8], pivot: [middle, 2], hand: [middle, length],
    content: cut(rrect(2, 2, width, length - 2, Math.min(width / 2, 3)), sleeve) + dot(middle, length, width * 0.6, skin),
  };
}

// A thin stick with a cream edge, for shafts, reeds and poles.
export const stick = (d, color, width = 2) => line(d, CREAM, width + 1.8) + line(d, color, width);

// Turns a boot() or arm() result into a part placed at `at`.
export const place = (name, built, at) => part(name, built.size, built.pivot, at, built.content);
