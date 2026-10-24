// One kart on the host screen: a body in the player's roster colour that turns with the kart, with the
// player's name above it that stays upright. Used by host/games/kart-2d/renderer.js.

import { wrapAngle } from './kart-physics.js';

// A little longer than the 18 px collision circle is wide, so karts look like karts and still touch at the
// circle's edge when they bump.
const BODY_LENGTH = 44;
const BODY_WIDTH = 28;
const NAME_STYLE = { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };

// `color` is a 0xRRGGBB number. Returns { show(kart, alpha, name, connected), destroy() }.
export function createKartSprite(scene, color) {
  const body = scene.add.rectangle(0, 0, BODY_LENGTH, BODY_WIDTH, color).setStrokeStyle(3, 0x000000);
  // A dark band at the front, so you can see which way the kart points.
  const nose = scene.add.rectangle(BODY_LENGTH / 2 - 7, 0, 10, BODY_WIDTH - 6, 0x111111);
  const kartImage = scene.add.container(0, 0, [body, nose]);
  const label = scene.add.text(0, 0, '', NAME_STYLE).setOrigin(0.5, 1);

  // `alpha` (0..1) is how far time has got from the kart's previous step to its current one; drawing in
  // between keeps motion smooth on screens faster than 60 Hz. A kart whose player dropped is drawn faded.
  function show(kart, alpha, name, connected) {
    const x = kart.previousX + (kart.x - kart.previousX) * alpha;
    const y = kart.previousY + (kart.y - kart.previousY) * alpha;
    // The short way round, or a kart pointing left (heading near +-PI) would spin a full turn between steps.
    const heading = kart.previousHeading + wrapAngle(kart.heading - kart.previousHeading) * alpha;
    kartImage.setPosition(x, y).setRotation(heading).setAlpha(connected ? 1 : 0.4);
    label.setPosition(x, y - 26).setText(connected ? name : `${name} (away)`).setAlpha(connected ? 1 : 0.6);
  }

  function destroy() {
    kartImage.destroy();
    label.destroy();
  }

  return { show, destroy };
}
