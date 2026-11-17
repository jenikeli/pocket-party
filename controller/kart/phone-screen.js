// Which of the kart phone's screens a view shows: the setup screen, the controls while waiting for the race
// (Ready pressed: the player sees the controls they picked before the race starts, with Back to setup), or the
// race's controls. Plain function with no DOM, so Node can test it. Used by controller/kart/controls.js.

export const PHONE_SCREENS = { SETUP: 'setup', WAITING: 'waiting', RACE: 'race' };

// `view` is the race's view for this phone (phase 'setup' with ready, or a race phase), or null when the player
// has no kart; a phone with no kart shows the race's controls with "Waiting for the next race".
export function phoneScreen(view) {
  if (view?.phase !== 'setup') {
    return PHONE_SCREENS.RACE;
  }
  return view.ready ? PHONE_SCREENS.WAITING : PHONE_SCREENS.SETUP;
}
