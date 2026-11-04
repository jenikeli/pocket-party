// The Items setting on the 3D race's setup screen (M8): items on or off, and each built item allowed or left
// out. One set for everyone, kept from race to race by index.js. Plain data and functions, unit tested in Node.
// Used by index.js and the settings row (item-settings-panel.js).

import { BUILT_ITEMS } from './item-catalog.js';

// Items on, every built item allowed: { on, items: { [id]: allowed } }.
export function createItemSettings() {
  return { on: true, items: Object.fromEntries(BUILT_ITEMS.map((id) => [id, true])) };
}

// Items on or off. Each item's own switch is kept, so turning items back on gives the same set.
export function toggleItems(settings) {
  settings.on = !settings.on;
}

// One item allowed or left out. An id that is not a built item is ignored.
export function toggleItem(settings, id) {
  if (Object.hasOwn(settings.items, id)) {
    settings.items[id] = !settings.items[id];
  }
}

// The item ids to pass to createRace: none when items are off.
export function allowedItems(settings) {
  if (!settings.on) {
    return [];
  }
  return BUILT_ITEMS.filter((id) => settings.items[id]);
}
