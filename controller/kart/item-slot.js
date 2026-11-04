// The 3D race's Item button on the phone: shows the held item's icon, cycles icons while the roulette rolls, and
// draws the running effects as small icons in emptying rings. Used by controller/kart/controls.js, which passes
// the icons (so the DOM-free describeItemSlot can be unit tested in Node).

const ROLL_ICON_MS = 90; // how fast the roulette cycles its icons

// What the button shows for a race view's `item` (null, or { held, rolling, effects }):
// { state: 'hidden' | 'empty' | 'rolling' | 'held', held, effects }.
export function describeItemSlot(item) {
  if (!item) {
    return { state: 'hidden', held: null, effects: [] };
  }
  const state = item.rolling ? 'rolling' : item.held ? 'held' : 'empty';
  return { state, held: item.held, effects: item.effects };
}

// `button` is the #kart-item-slot element, `icons` is ITEM_ICONS. Returns { show(item), stop() }.
export function createItemSlot(button, icons) {
  const iconBox = button.querySelector('#kart-item-icon');
  const effectsBox = button.querySelector('#kart-item-effects');
  const rollIds = Object.keys(icons);
  let rollTimer = null;
  let rollIndex = 0;
  let ringFrame = null;
  // The effects on show: [{ item, element, secondsLeft, total, updatedAt }].
  let rings = [];

  // An id the icons do not know draws nothing, so a newer host cannot break the phone's controls.
  function iconSvg(id) {
    return icons[id]?.svg ?? '';
  }

  function showIcon(id) {
    iconBox.innerHTML = iconSvg(id);
  }

  function setRolling(rolling) {
    if (rolling && rollTimer === null) {
      showIcon(rollIds[rollIndex]);
      rollTimer = setInterval(() => {
        rollIndex = (rollIndex + 1) % rollIds.length;
        showIcon(rollIds[rollIndex]);
      }, ROLL_ICON_MS);
    } else if (!rolling && rollTimer !== null) {
      clearInterval(rollTimer);
      rollTimer = null;
    }
  }

  // Rebuilds the rings only when the set of effects changes; otherwise just notes the new seconds.
  function showEffects(effects) {
    const now = performance.now();
    if (effects.map((effect) => effect.item).join() !== rings.map((ring) => ring.item).join()) {
      effectsBox.replaceChildren();
      const oldRings = rings;
      rings = effects.map((effect) => {
        const element = document.createElement('div');
        element.className = 'kart-effect';
        element.innerHTML = iconSvg(effect.item);
        effectsBox.append(element);
        // A ring already on show keeps its total, so adding another effect does not refill it.
        const total = oldRings.find((ring) => ring.item === effect.item)?.total ?? effect.secondsLeft;
        return { item: effect.item, element, total, shownLeft: '' };
      });
    }
    rings.forEach((ring, index) => {
      const secondsLeft = effects[index].secondsLeft;
      ring.total = Math.max(ring.total, secondsLeft);
      ring.secondsLeft = secondsLeft;
      ring.updatedAt = now;
    });
    if (rings.length > 0 && ringFrame === null) {
      ringFrame = requestAnimationFrame(drawRings);
    }
  }

  // secondsLeft is rounded up and changes once a second. The true time left is just under it right after an
  // update and falls by 1 over the next second, so the ring counts down from secondsLeft by the time since
  // the update, and stops at the next whole second.
  function drawRings(now) {
    ringFrame = null;
    for (const ring of rings) {
      const elapsed = Math.min((now - ring.updatedAt) / 1000, 1);
      const left = (Math.max(ring.secondsLeft - elapsed, 0) / ring.total).toFixed(3);
      // Written only when it changed: after the 1 s cap the value stands still.
      if (left !== ring.shownLeft) {
        ring.element.style.setProperty('--left', left);
        ring.shownLeft = left;
      }
    }
    if (rings.length > 0) {
      ringFrame = requestAnimationFrame(drawRings);
    }
  }

  function show(item) {
    const slot = describeItemSlot(item);
    button.hidden = slot.state === 'hidden';
    button.classList.toggle('empty', slot.state === 'empty');
    setRolling(slot.state === 'rolling');
    if (slot.state !== 'rolling') {
      showIcon(slot.held);
    }
    showEffects(slot.effects);
  }

  function stop() {
    setRolling(false);
    if (ringFrame !== null) {
      cancelAnimationFrame(ringFrame);
      ringFrame = null;
    }
    rings = [];
  }

  return { show, stop };
}
