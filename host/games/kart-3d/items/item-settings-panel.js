// The "Items" row of the 3D race's setup screen: one button per built item showing its icon, pressed when the
// item is allowed. Turning every item off is items off (item-settings.js's allowedItems), so there is no separate
// On switch. Styled by setup.css. Used by setup-panel.js, which mounts it; it only shows the settings
// (item-settings.js) and reports clicks, index.js owns the state.

import { ITEM_ICONS } from '/shared/item-icons.js';
import { setPressed } from '/host/kart/panel-parts.js';

// `settings` is item-settings.js's { items }, read once for which items get a button. `onToggleItem(id)`
// runs on a click of an item's button. Returns { element, show(settings) }: `element` goes into the setup panel,
// `show` is called every frame and writes to the page only on change.
export function createItemSettingsRow(settings, { onToggleItem }) {
  const element = document.createElement('div');
  element.className = 'pp-segment k3d-items';
  const itemButtons = Object.keys(settings.items).map((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pp-button k3d-item';
    button.dataset.itemId = id;
    button.title = ITEM_ICONS[id].name;
    button.setAttribute('aria-label', ITEM_ICONS[id].name);
    // The icons are our own SVG text, never from a phone.
    button.innerHTML = ITEM_ICONS[id].svg;
    button.addEventListener('click', () => onToggleItem(id));
    return button;
  });
  element.append(...itemButtons);

  function show(current) {
    itemButtons.forEach((button) => setPressed(button, current.items[button.dataset.itemId]));
  }

  return { element, show };
}
