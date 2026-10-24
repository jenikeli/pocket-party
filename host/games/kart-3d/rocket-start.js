// The countdown before a 3D drive and MK8DX's rocket start: Go pressed just after "2" appears and held to GO
// boosts the kart off the line; pressed too early, the kart stalls. Plain functions, unit tested in Node. Used
// by host/games/kart-3d/drive.js and drive-views.js.
//
// The host judges by when the press arrives, which is one network trip (phone -> server -> host) after the
// thumb, and is read at the next 60 Hz step (up to 17 ms later still). So the window is about arrival times;
// the host's readout lists them, to set the window from real phones.

// "3" shows from 0 s, "2" from 1 s, "1" from 2 s, and GO at 3 s (a guess at MK8DX's pace), which shows for a
// second while the karts drive off.
export const GO_AT = 3;
const TWO_AT = 1;
const GO_SHOWN_FOR = 1;
// A press arriving from ROCKET_FROM to ROCKET_TO seconds after "2" appears, and held until GO, rocket starts;
// earlier stalls; later is a normal start. Guesses until the device run.
const ROCKET_FROM = 0;
const ROCKET_TO = 0.6;
// A stalled kart stands still this long after GO (a guess; MK8DX's stall is about a second).
export const STALL_SECONDS = 1;

export const START_OUTCOMES = Object.freeze({ ROCKET: 'rocket', STALL: 'stall', NORMAL: 'normal' });

// What the countdown shows at drive time `time`: 3, 2, 1, 0 (GO) or null once GO has gone.
export function countdownNumber(time) {
  if (time >= GO_AT + GO_SHOWN_FOR) {
    return null;
  }
  return time >= GO_AT ? 0 : 3 - Math.floor(time);
}

// During the countdown, every step for each player's kart: kart.goPressedAt is the drive time the held press
// of Go arrived (null while it is not held), kart.goHeld the button last step.
export function watchGoButton(kart, accelerate, time) {
  if (accelerate && !kart.goHeld) {
    kart.goPressedAt = time;
  } else if (!accelerate) {
    kart.goPressedAt = null;
  }
  kart.goHeld = accelerate;
}

// At GO: { outcome, offset }, offset being how long after "2" the held press arrived (negative is before it),
// null if Go was not held.
export function judgeStart(goPressedAt) {
  if (goPressedAt === null || goPressedAt === undefined) {
    return { outcome: START_OUTCOMES.NORMAL, offset: null };
  }
  const offset = goPressedAt - TWO_AT;
  if (offset < ROCKET_FROM) {
    return { outcome: START_OUTCOMES.STALL, offset };
  }
  return { outcome: offset <= ROCKET_TO ? START_OUTCOMES.ROCKET : START_OUTCOMES.NORMAL, offset };
}
