// How the items' effects on a kart look (M8): big grows in a wobble, overshooting and settling as MK8DX's Mega
// Mushroom did; small shrinks the same way in a puff of smoke and pops back in another; bouncy squashes and
// stretches all the time under a glossy pink rubber coat (kart-models.js draws the coat). In each effect's last
// second the look blinks, to warn it is ending: a big or small kart flickers between its sizes, a bouncy one's
// coat comes and goes. The sizes are plain functions of the race state; only the puffs need a drawing. Used by
// renderer.js (kartLookScale, kartCameraSize, kartRubbery) and item-drawing.js (createKartEffectDrawing).

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { tuning } from '../tuning.js';

const ONE = Object.freeze({ x: 1, y: 1, z: 1 });
// The grow's wobble: a spring released at the effect's start, settling in about 0.6 s. Its share of the way to
// the new size is 1 - e^(-damping t) cos(wobble t), which overshoots by about a third once, then a little less.
const GROW_DAMPING = 5;
const GROW_WOBBLE = 4 * Math.PI;
// The ending's blink: over the last BLINK_SECONDS the look is off for every other 1/BLINK_RATE s.
const BLINK_SECONDS = 1;
const BLINK_RATE = 8;
// Bouncy's squash and stretch: how much taller (and so narrower) it stretches, bounces a second, and the bigger
// bounce it starts with, fading at KICK_FADE a second.
const BOUNCE_AMPLITUDE = 0.1;
const BOUNCE_RATE = 2.6;
const BOUNCE_KICK = 0.22;
const KICK_FADE = 3;
// Small's puffs: how many, how far they spread, and how high over the kart's base they start.
const PUFF_COUNT = 30;
const PUFF_REACH = 1.3;
const PUFF_HEIGHT = 0.6;

// The kart model's scale this frame, { x, y, z } (x across, y up, z along the kart), all 1 with no effect (and for
// a kart with no `item`: items off, or a kart made by createKart alone). `race` is for effects that come from the
// race rather than the kart.
export function kartLookScale(race, kart) {
  const effect = kart.item?.effect;
  if (!effect) {
    return ONE;
  }
  const elapsed = Math.max(tuning.itemEffectSeconds - effect.left, 0);
  if (effect.item === KART_ITEMS.BIG || effect.item === KART_ITEMS.SMALL) {
    const size = effect.item === KART_ITEMS.BIG ? tuning.bigSize : tuning.smallSize;
    const share = isBlinkedOff(effect.left) ? 0 : grownShare(elapsed);
    const scale = 1 + (size - 1) * share;
    return { x: scale, y: scale, z: scale };
  }
  if (effect.item === KART_ITEMS.BOUNCY) {
    const stretch = 1 + (BOUNCE_AMPLITUDE + BOUNCE_KICK * Math.exp(-KICK_FADE * elapsed)) * Math.sin(2 * Math.PI * BOUNCE_RATE * elapsed);
    // As tall as it stretches, it is that much narrower across and along, so it keeps its bulk like rubber.
    const narrower = 1 / Math.sqrt(stretch);
    return { x: narrower, y: stretch, z: narrower };
  }
  return ONE;
}

// The size the kart's chase camera follows (views.js pulls back and up with it): a big or small kart's, 1
// otherwise, so bouncy's squash and stretch does not make the camera breathe.
export function kartCameraSize(race, kart) {
  const item = kart.item?.effect?.item;
  return item === KART_ITEMS.BIG || item === KART_ITEMS.SMALL ? kartLookScale(race, kart).y : 1;
}

// True while the kart wears bouncy's rubber coat (off every other blink in its last second).
export function kartRubbery(race, kart) {
  const effect = kart.item?.effect;
  return effect?.item === KART_ITEMS.BOUNCY && !isBlinkedOff(effect.left);
}

// How far from its old size toward the effect's a growing (or shrinking) kart is, `elapsed` seconds in.
function grownShare(elapsed) {
  return 1 - Math.exp(-GROW_DAMPING * elapsed) * Math.cos(GROW_WOBBLE * elapsed);
}

// True in the off half of the ending's blink, `left` seconds before the effect ends.
function isBlinkedOff(left) {
  return left < BLINK_SECONDS && Math.floor(left * BLINK_RATE) % 2 === 1;
}

// Small's puffs of smoke as it shrinks and as it pops back. Returns { update(race, track, poses, dt), dispose() }
// (item-drawing.js's shape); `bursts` is burst-look.js's.
export function createKartEffectDrawing(scene, bursts) {
  // The race last drawn, and each kart's running effect then, to see an effect start or end.
  let shownRace = null;
  let lastEffects = [];
  const puffAt = { x: 0, y: 0, z: 0 };

  // A new race (or the setup screen, race null) only notes the karts' effects: nothing started on screen.
  function update(race, track, poses) {
    if (race !== shownRace || !race) {
      shownRace = race;
      lastEffects = race ? race.karts.map(effectOf) : [];
      return;
    }
    race.karts.forEach((kart, index) => {
      const effect = effectOf(kart);
      if (effect !== lastEffects[index] && (effect === KART_ITEMS.SMALL || lastEffects[index] === KART_ITEMS.SMALL)) {
        const { position, up } = poses[index];
        puffAt.x = position.x + up.x * PUFF_HEIGHT;
        puffAt.y = position.y + up.y * PUFF_HEIGHT;
        puffAt.z = position.z + up.z * PUFF_HEIGHT;
        bursts.smoke(puffAt, PUFF_COUNT, PUFF_REACH);
      }
      lastEffects[index] = effect;
    });
  }

  // The puffs are the bursts' (item-drawing.js frees them): nothing of its own to free.
  function dispose() {}

  return { update, dispose };
}

function effectOf(kart) {
  return kart.item?.effect?.item ?? null;
}
