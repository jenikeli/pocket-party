// The "Items" row of the 3D race's setup screen: an On/Off button, then one button per built item showing its
// icon (pressed when allowed, greyed while Items is off). Used by panels.js, which mounts it; it only shows the
// settings (item-settings.js) and reports clicks, index.js owns the state.

import { ITEM_ICONS } from '/shared/item-icons.js';

const STYLE = `
  #kart-3d-setup .kart-3d-item-row .item-toggle { padding: 4px 8px; }
  .kart-3d-item-row .item-toggle svg { display: block; width: 1.5em; height: 1.5em; }
  .kart-3d-item-row .item-toggle[aria-pressed="false"] svg { opacity: 0.4; }
  .kart-3d-item-row.off .item-toggle { opacity: 0.35; }
`;

// `settings` is item-settings.js's { on, items }, read once for which items get a button. `onToggleItems()` runs
// on a click of the On/Off button, `onToggleItem(id)` on a click of an item's button. Returns { element,
// show(settings) }: `element` goes into the setup panel, `show` is called every frame and writes to the page only
// on change.
export function createItemSettingsRow(settings, { onToggleItems, onToggleItem }) {
  const element = document.createElement('div');
  element.className = 'settings kart-3d-item-row';
  const style = document.createElement('style');
  style.textContent = STYLE;
  const onButton = createButton();
  onButton.id = 'kart-3d-items-button';
  onButton.addEventListener('click', onToggleItems);
  const itemButtons = Object.keys(settings.items).map((id) => {
    const button = createButton();
    button.className = 'item-toggle';
    button.dataset.itemId = id;
    button.title = ITEM_ICONS[id].name;
    // The icons are our own SVG text, never from a phone.
    button.innerHTML = ITEM_ICONS[id].svg;
    button.addEventListener('click', () => onToggleItem(id));
    return button;
  });
  element.append(style, onButton, ...itemButtons);

  function show(current) {
    element.classList.toggle('off', !current.on);
    setPressed(onButton, current.on);
    setText(onButton, current.on ? 'Items: On' : 'Items: Off');
    itemButtons.forEach((button) => setPressed(button, current.items[button.dataset.itemId]));
  }

  return { element, show };
}

function createButton() {
  const button = document.createElement('button');
  button.type = 'button';
  return button;
}

function setPressed(button, pressed) {
  if (button.getAttribute('aria-pressed') !== String(pressed)) {
    button.setAttribute('aria-pressed', String(pressed));
  }
}

function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}
