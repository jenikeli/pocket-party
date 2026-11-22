// The temple run's own icons, in the same style as shared/icons.js (24 by 24 grid, round 2-wide stroke, drawn in
// currentColor), kept apart so the shared set stays as the other games have it. Used by the temple run's host
// screens and phone. Constant names only, never anything a phone sent.

const SHAPES = {
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/>',
  'heart-empty': '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5h3.7a1.6 1.6 0 0 1 0 3.2h-2.4a1.6 1.6 0 0 0 0 3.2h3.7"/>',
  magnet: '<path d="M5 20v-8a7 7 0 0 1 14 0v8h-4v-8a3 3 0 0 0-6 0v8z"/><path d="M5 16h4M15 16h4"/>',
  shield: '<path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6z"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z" fill="currentColor"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.8-6.5-6.2 0-3 2-4.8 3.2-6.6.4 1.6 1.2 2.4 2.1 2.8C10.5 8 11.5 5.4 14 3c.2 3.4 4.5 5.6 4.5 11.4C18.5 18.2 16 21 12 21z"/>',
  monkey: '<circle cx="12" cy="13" r="6.5"/><circle cx="5.5" cy="12" r="2.3"/><circle cx="18.5" cy="12" r="2.3"/><path d="M9 11.5h.01M15 11.5h.01M9.5 16c1.5 1.2 3.5 1.2 5 0"/>',
  runner: '<circle cx="15" cy="5" r="2"/><path d="M13 9l-2 6 3 2 1 4M11 15l-4 2M13 9l4 2 2-1M13 9l-3 1-2 3"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.3 4.2 3 5.2V20h10v-3.8c1.7-1 3-2.6 3-5.2a8 8 0 0 0-8-8z"/><path d="M9 11h.01M15 11h.01M10 20v-2.5M14 20v-2.5"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0M12 17l4-5"/>',
  'arrow-up': '<path d="M12 20V5M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 4v15M6 13l6 6 6-6"/>',
  'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'turn-left': '<path d="M18 20v-7a4 4 0 0 0-4-4H6M10 5L6 9l4 4"/>',
  'turn-right': '<path d="M6 20v-7a4 4 0 0 1 4-4h8M14 5l4 4-4 4"/>',
  tile: '<rect x="4" y="9" width="16" height="6" rx="1"/><path d="M8 15l-1 4M16 15l1 4"/>',
  gap: '<path d="M3 8h6v8H3M21 8h-6v8h6"/>',
  ready: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

export const TEMPLE_ICON_NAMES = Object.keys(SHAPES);

// The icon as an SVG string, sized by its parent's font size (1em), hidden from screen readers.
export function templeIcon(name) {
  const shape = SHAPES[name];
  if (!shape) {
    throw new Error(`No temple icon named "${name}"`);
  }
  return (
    '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-0.15em">${shape}</svg>`
  );
}
