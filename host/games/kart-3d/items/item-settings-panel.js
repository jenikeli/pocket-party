// The "Items" row of the 3D race's setup screen: an On/Off button, then one button per built item showing its
// icon (pressed when allowed, greyed while Items is off). Styled by setup.css. Used by setup-panel.js, which
// mounts it; it only shows the settings (item-settings.js) and reports clicks, index.js owns the state.

import { ITEM_ICONS } from '/shared/item-icons.js';
import { setText, setPressed } from '/host/kart/panel-parts.js';

// `settings` is item-settings.js's { on, items }, read once for which items get a button. `onToggleItems()` runs
// on a click of the On/Off button, `onToggleItem(id)` on a click of an item's button. Returns { element,
// show(settings) }: `element` goes into the setup panel, `show` is called every frame and writes to the page only
// on change.
export function createItemSettingsRow(settings, { onToggleItems, onToggleItem }) {
  const element = document.createElement('div');
  element.className = 'pp-segment k3d-items';
  const onButton = createButton();
  onButton.id = 'kart-3d-items-button';
  onButton.addEventListener('click', onToggleItems);
  const itemButtons = Object.keys(settings.items).map((id) => {
    const button = createButton();
    button.classList.add('k3d-item');
    button.dataset.itemId = id;
    button.title = ITEM_ICONS[id].name;
    // The icons are our own SVG text, never from a phone.
    button.innerHTML = ITEM_ICONS[id].svg;
    button.addEventListener('click', () => onToggleItem(id));
    return button;
  });
  element.append(onButton, ...itemButtons);

  function show(current) {
    element.classList.toggle('off', !current.on);
    setPressed(onButton, current.on);
    setText(onButton, current.on ? 'On' : 'Off');
    itemButtons.forEach((button) => setPressed(button, current.items[button.dataset.itemId]));
  }

  return { element, show };
}

function createButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pp-button';
  return button;
}
