// The one icon set of every screen, host and phone (CLAUDE.md, "UI design"): our own inline SVG, drawn in
// currentColor, so an icon takes the colour of the control it sits in. Used as `button.innerHTML = icon('gear')`
// with these constant names only, never with anything a phone sent.

// The inside of each icon, on a 24 by 24 grid, drawn with a round 2-wide stroke and no fill unless it says so.
const ICON_SHAPES = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path transform="translate(1.2 1.2) scale(.9)" d="M10.3 3h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 ' +
    '2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2' +
    '-.8-1.9L2.4 15.1v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"/>',
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
