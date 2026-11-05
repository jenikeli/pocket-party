// The six items' icons as SVG strings (our own flat, bold designs, one main colour each with a dark outline), keyed
// by the ids in KART_ITEMS. Used by the host's item frame and settings (host/games/kart-3d/) and the phone's Item
// button (controller/kart/). The strings are our own text, so they can go into innerHTML.

import { KART_ITEMS } from './protocol.js';

const OUTLINE = '#1c2130';

// Wraps shapes in a 64 x 64 box with the outline style every icon shares.
function icon(shapes) {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${shapes}</svg>`;
}

export const ITEM_ICONS = Object.freeze({
  [KART_ITEMS.BLOCKER]: {
    name: 'Sandcastle',
    svg: icon(`<path d="M10 54 L14 30 H50 L54 54 Z" fill="#e8c36a"/><path d="M14 30 V20 H20 V24 H26 V20 H32 V24 H38 V20 H44 V30 Z" fill="#d9ab4a"/><path d="M26 54 V44 A6 6 0 0 1 38 44 V54" fill="#8a6a2a"/><line x1="48" y1="30" x2="48" y2="10"/><polygon points="48,10 58,14 48,18" fill="#e74c3c"/>`),
  },
  [KART_ITEMS.RAMP]: {
    name: 'Ramp',
    svg: icon(`<path d="M6 50 L58 50 L58 28 Z" fill="#f08a24"/><path d="M26 50 L58 50 L58 40 Z" fill="#ffffff"/><path d="M14 22 L22 12 L30 22 M22 12 V30" fill="none" stroke="#ffd84a" stroke-width="5"/>`),
  },
  [KART_ITEMS.TELEPORT]: {
    name: 'Teleport',
    svg: icon(`<circle cx="32" cy="32" r="22" fill="#2ec4d6"/><path d="M32 32 m0 0 a5 5 0 0 1 10 0 a10 10 0 0 1 -20 0 a15 15 0 0 1 30 0" fill="none" stroke="#ffffff" stroke-width="4"/><polygon points="12,6 14,11 19,13 14,15 12,20 10,15 5,13 10,11" fill="#ffffff" stroke-width="2"/><polygon points="52,44 53.5,48 57.5,49.5 53.5,51 52,55 50.5,51 46.5,49.5 50.5,48" fill="#ffffff" stroke-width="2"/>`),
  },
  [KART_ITEMS.MAGNET]: {
    name: 'Magnet',
    svg: icon(`<path d="M12 54 V30 A20 20 0 0 1 52 30 V54 H40 V30 A8 8 0 0 0 24 30 V54 Z" fill="#e53935"/><rect x="12" y="44" width="12" height="10" fill="#d8dde6"/><rect x="40" y="44" width="12" height="10" fill="#d8dde6"/>`),
  },
  [KART_ITEMS.PUSH]: {
    name: 'Shockwave',
    svg: icon(`<circle cx="32" cy="32" r="8" fill="#ffd84a"/><circle cx="32" cy="32" r="17" fill="none" stroke="#f39c12" stroke-width="5"/><circle cx="32" cy="32" r="27" fill="none" stroke="#f7c948" stroke-width="4" stroke-dasharray="14 6"/>`),
  },
  [KART_ITEMS.STICKY]: {
    name: 'Honey',
    svg: icon(`<path d="M6 8 H58 V20 Q58 26 52 26 Q48 26 48 32 V40 A5 5 0 0 1 38 40 V30 Q38 26 34 26 H26 Q22 26 22 31 V50 A6 6 0 0 1 10 50 V26 Q6 26 6 20 Z" fill="#f2a900"/><path d="M12 14 H30" fill="none" stroke="#ffe27a" stroke-width="3"/>`),
  },
});
