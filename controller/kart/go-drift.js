// The double tap on Go (the 3D race with the stick, which has no Drift button): tap Go, then press and hold it
// again to drift; let go to end the drift. Every other press of Go accelerates. It sends the same button
// presses as the Drift and Go buttons, so the host's rules do not change. Plain functions with no DOM, so Node
// can test them. Used by controller/kart/controls.js.

import { KART_BUTTONS } from '../../shared/protocol.js';

// Tune: how soon after a tap the next press must start to count as a drift.
const DOUBLE_TAP_MS = 300;
// Tune: how short a press must be to count as the first tap of a double tap.
const SHORT_TAP_MS = 220;

// Returns { press(now), release(now) }; `now` is a time in ms (performance.now()). Each returns the button input
// to send, { button, pressed }, where button is KART_BUTTONS.ACCELERATE or DRIFT. A release names the button
// its press sent.
export function createGoDrift({ doubleTapMs = DOUBLE_TAP_MS, shortTapMs = SHORT_TAP_MS } = {}) {
  let pressedAt = 0;
  let drifting = false;
  // When the last short tap ended, or -Infinity when the next press is plain accelerate in any case.
  let shortTapEndedAt = -Infinity;

  function press(now) {
    pressedAt = now;
    drifting = now - shortTapEndedAt <= doubleTapMs;
    return { button: drifting ? KART_BUTTONS.DRIFT : KART_BUTTONS.ACCELERATE, pressed: true };
  }

  // After a drift, or a press held longer than a tap, the next press starts over as plain accelerate.
  function release(now) {
    const button = drifting ? KART_BUTTONS.DRIFT : KART_BUTTONS.ACCELERATE;
    const wasShortTap = !drifting && now - pressedAt < shortTapMs;
    shortTapEndedAt = wasShortTap ? now : -Infinity;
    drifting = false;
    return { button, pressed: false };
  }

  return { press, release };
}
