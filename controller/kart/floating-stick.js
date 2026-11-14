// The kart races' floating stick, as drawn: the whole steer area takes the thumb, and the ring and knob appear
// centred where it lands and go when it lifts; the knob moves sideways only, and a thin bar along the area's top
// edge shows how far the player steers. Only the drawing: controller/inputs/drag.js already measures from where
// the thumb lands. Used by controller/kart/steering.js.

import { pointInTurnedBox } from '/controller/kart/turned-layout.js';

// How far (CSS px) the knob moves when the stick is all the way over.
const KNOB_TRAVEL_PX = 45;

// `elements` is { zone, ring, knob, amount } (the stick zone, #kart-stick-ring, #kart-stick-knob,
// #kart-steer-amount); `isTurned()` says whether the controls are drawn turned round now. Returns
// { start(), stop(), show(stick) }.
export function createFloatingStick(elements, isTurned) {
  const { zone, ring, knob, amount } = elements;
  // The finger the ring follows: the first one down, as drag.js steers with the first one only.
  let pointerId = null;

  // The zone is inside the controls, which a portrait page draws turned, so the touch is converted into the
  // zone's own frame before the ring is placed in it.
  function onPointerDown(event) {
    if (pointerId !== null) {
      return;
    }
    pointerId = event.pointerId;
    const point = pointInTurnedBox(event.clientX, event.clientY, zone.getBoundingClientRect(), isTurned());
    ring.style.left = `${point.x}px`;
    ring.style.top = `${point.y}px`;
    ring.hidden = false;
    zone.classList.add('steering');
  }

  function onPointerEnd(event) {
    if (event.pointerId !== pointerId) {
      return;
    }
    pointerId = null;
    hide();
  }

  function hide() {
    ring.hidden = true;
    zone.classList.remove('steering');
    show({ x: 0 });
  }

  // `stick` is the stick value sent to the host, in the player's directions: only x steers. The bar grows from
  // the middle of the top edge toward the side steered to.
  function show(stick) {
    knob.style.transform = `translateX(${stick.x * KNOB_TRAVEL_PX}px)`;
    const width = Math.abs(stick.x) * 50;
    amount.style.width = `${width}%`;
    amount.style.left = `${stick.x < 0 ? 50 - width : 50}%`;
  }

  function start() {
    zone.addEventListener('pointerdown', onPointerDown);
    zone.addEventListener('pointerup', onPointerEnd);
    zone.addEventListener('pointercancel', onPointerEnd);
  }

  function stop() {
    zone.removeEventListener('pointerdown', onPointerDown);
    zone.removeEventListener('pointerup', onPointerEnd);
    zone.removeEventListener('pointercancel', onPointerEnd);
    pointerId = null;
    hide();
  }

  return { start, stop, show };
}
