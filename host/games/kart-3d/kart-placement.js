// What the 3D renderer shows of the race's karts: each kart model placed at its pose in its design, and what each
// view shows about its kart (name, colour, HUD). Used by renderer.js.

import { displayName, colorText } from '/host/roster.js';
import { KART_DESIGNS } from './karts/kart-designs.js';
import { assignDesigns } from './karts/kart-roster.js';
import { viewTargets, viewHud } from './race-views.js';
import { kartLookScale } from './items/kart-effect-looks.js';

// `kartModels` is kart-models.js's. Returns { place(race, players, poses, dt) }.
export function createKartPlacer(kartModels) {
  // The race whose karts' designs (indexes into KART_DESIGNS, one per kart) were last worked out.
  let designsRace = null;
  let kartDesigns = [];

  // `poses` are the karts' poses as drawn this frame, in the order of race.karts. Which design each kart draws is
  // worked out once per race (kart-roster.js), so a kart keeps its look when its player leaves mid-race.
  function place(race, players, poses, dt) {
    if (designsRace !== race) {
      designsRace = race;
      kartDesigns = assignDesigns(race.karts, players, KART_DESIGNS);
    }
    kartModels.karts.forEach((model, index) => {
      const kart = race.karts[index];
      if (!kart) {
        kartModels.hide(index);
        return;
      }
      kartModels.show(index, kart, poses[index], kartDesigns[index], dt, kartLookScale(race, kart));
    });
  }

  return { place };
}

// One entry per view: the kart it follows (its pose from `poses`, in the order of race.karts), the name and colour
// to show and its HUD.
export function describeViews(race, players, poses) {
  return viewTargets(race, players).map(({ kart, player }) => ({
    pose: poses[race.karts.indexOf(kart)],
    name: player ? displayName(player) : 'CPU',
    color: player ? colorText(player) : '#ffffff',
    boosting: kart.boost !== null,
    gliding: kart.gliding,
    hud: viewHud(race, kart),
  }));
}
