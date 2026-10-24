// Places as words for the screen: 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th' (a race has at most 12 places,
// so 11th and 12th need no special case). Used by both kart races on the host (host/games/kart-2d/,
// host/games/kart-3d/) and on the phone (controller/games/kart-2d/, controller/games/kart-3d/).

export function ordinal(place) {
  return `${place}${{ 1: 'st', 2: 'nd', 3: 'rd' }[place] ?? 'th'}`;
}
