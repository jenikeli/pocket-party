// The Items setting on the 3D race's setup screen (M8): each built item allowed or left out; every item left
// out is a race without items. One set for everyone, kept from race to race by index.js. Plain data and functions, unit tested in Node.
// Used by index.js and the settings row (item-settings-panel.js).

import { BUILT_ITEMS } from './item-catalog.js';

// Every built item allowed: { items: { [id]: allowed } }.
export function createItemSettings() {
  return { items: Object.fromEntries(BUILT_ITEMS.map((id) => [id, true])) };
}

// One item allowed or left out. An id that is not a built item is ignored.
export function toggleItem(settings, id) {
  if (Object.hasOwn(settings.items, id)) {
    settings.items[id] = !settings.items[id];
  }
}

// The item ids to pass to createRace.
export function allowedItems(settings) {
  return BUILT_ITEMS.filter((id) => settings.items[id]);
}
