// The one icon set of every screen, host and phone (CLAUDE.md, "UI design"): our own inline SVG, drawn in
// currentColor, so an icon takes the colour of the control it sits in. Used as `button.innerHTML = icon('gear')`
// with these constant names only, never with anything a phone sent.

// The inside of each icon, on a 24 by 24 grid, drawn with a round 2-wide stroke and no fill unless it says so.
// The gear has eight teeth and a hub; `leave` is a door with an arrow out of it (the phone's Leave game).
const ICON_SHAPES = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M10.31 4.38L10.52 1.5A10.6 10.6 0 0 1 13.48 1.5L13.69 4.38A7.8 7.8 0 0 1 16.19 5.42L18.38 3.53' +
    'A10.6 10.6 0 0 1 20.47 5.62L18.58 7.81A7.8 7.8 0 0 1 19.62 10.31L22.5 10.52A10.6 10.6 0 0 1 22.5 13.48' +
    'L19.62 13.69A7.8 7.8 0 0 1 18.58 16.19L20.47 18.38A10.6 10.6 0 0 1 18.38 20.47L16.19 18.58' +
    'A7.8 7.8 0 0 1 13.69 19.62L13.48 22.5A10.6 10.6 0 0 1 10.52 22.5L10.31 19.62A7.8 7.8 0 0 1 7.81 18.58' +
    'L5.62 20.47A10.6 10.6 0 0 1 3.53 18.38L5.42 16.19A7.8 7.8 0 0 1 4.38 13.69L1.5 13.48' +
    'A10.6 10.6 0 0 1 1.5 10.52L4.38 10.31A7.8 7.8 0 0 1 5.42 7.81L3.53 5.62A10.6 10.6 0 0 1 5.62 3.53' +
    'L7.81 5.42A7.8 7.8 0 0 1 10.31 4.38z"/>',
  leave: '<path d="M14 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3M9 12h12M17 8l4 4-4 4"/>',
  'add-players': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M19 7v6M16 10h6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  stick: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
  tilt:
    '<rect x="4" y="8" width="16" height="9" rx="2" transform="rotate(-14 12 12)"/>' +
    '<path d="M3 5c1-1.5 2.5-2 4-2M21 19c-1 1.5-2.5 2-4 2"/>',
  'go-button': '<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M10 8h4M10 12h4M10 16h4"/>',
  auto: '<path d="M5 19L12 4l7 15M8 13h8"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  tools: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  again: '<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>',
  music: '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 9a4 4 0 0 1 0 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M6 12h12M12 6v12"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
};

export const ICON_NAMES = Object.keys(ICON_SHAPES);

// The icon as an SVG string. It is hidden from screen readers: the control around it carries the name
// (aria-label and title).
export function icon(name) {
  const shape = ICON_SHAPES[name];
  if (!shape) {
    throw new Error(`No icon named "${name}"`);
  }
  return (
    '<svg class="pp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`
  );
}
