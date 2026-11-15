// Which kart-and-driver design each kart in a race draws (M7d5): a player always drives the design of their
// lobby colour slot, and the CPU karts take the designs nobody holds, so every kart looks different. Plain data,
// no Three.js, so it is unit tested in Node. Used by host/games/kart-3d/renderer.js.

// The driver of each colour slot, in slot order, for the setup view (the phone shows "You drive Blaze"). A plain
// list, since kart-designs.js needs Three.js and so cannot load where the views are tested in Node; a unit test
// (test/unit/kart-3d-driver-names.test.js) checks it matches KART_DESIGNS.
export const DRIVER_NAMES = ['Blaze', 'Pip', 'Fern', 'Bolt', 'Grimble', 'Rusty', 'Inky', 'Mochi', 'Sprout', 'Bruno', 'Rhino',
  'Wisp'];

// `karts` is race.karts (each with playerId, null for a CPU kart), `players` the room's Map(playerId -> player)
// (each with colorIndex), `designs` the list of designs, each with its colour `slot`. Returns, for each kart in
// order, an index into `designs`. Players come first, so a CPU kart never takes a player's design. A kart whose
// player has left the room counts as a CPU kart. If there are more karts than designs (while M7d5's queue is
// still adding them), the extra karts repeat designs in turn.
export function assignDesigns(karts, players, designs) {
  const assigned = new Array(karts.length).fill(null);
  const taken = new Set();
  karts.forEach((kart, kartIndex) => {
    const player = kart.playerId === null ? undefined : players.get(kart.playerId);
    if (player === undefined) {
      return;
    }
    const own = designs.findIndex((design) => design.slot === player.colorIndex);
    if (own !== -1 && !taken.has(own)) {
      assigned[kartIndex] = own;
      taken.add(own);
    }
  });
  let repeats = 0;
  karts.forEach((kart, kartIndex) => {
    if (assigned[kartIndex] !== null) {
      return;
    }
    const free = freeDesignsInSlotOrder(designs, taken);
    if (free.length > 0) {
      assigned[kartIndex] = free[0];
      taken.add(free[0]);
    } else {
      assigned[kartIndex] = repeats % designs.length;
      repeats += 1;
    }
  });
  return assigned;
}

// Indexes into `designs` not yet taken, lowest slot first.
function freeDesignsInSlotOrder(designs, taken) {
  return designs
    .map((design, index) => index)
    .filter((index) => !taken.has(index))
    .sort((first, second) => designs[first].slot - designs[second].slot);
}
