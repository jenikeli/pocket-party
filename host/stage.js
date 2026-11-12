// Keeps the host's 16:9 stage fitted to the window: sets --pp-em, the font size of every .pp-stage (host/ui.css),
// to 1/80 of the largest 16:9 box that fits, so one design in em fits every screen, as Phaser's FIT did.
// Started once by host/main.js.

const STAGE_WIDTH_EM = 80;
const STAGE_ASPECT = 16 / 9;

// The em, in px, for a window of width x height px: 24 on a 1920 x 1080 screen, smaller on a 4:3 iPad
// (the box is as wide as the screen and has bars above and below).
export function stageEm(width, height) {
  return Math.min(width, height * STAGE_ASPECT) / STAGE_WIDTH_EM;
}

// innerWidth and innerHeight are the visible window, toolbars excluded, which CSS's vh is not on iPad Safari.
// Going full screen fires resize too.
export function keepStageFitted() {
  function fit() {
    document.documentElement.style.setProperty('--pp-em', `${stageEm(innerWidth, innerHeight)}px`);
  }
  addEventListener('resize', fit);
  fit();
}
