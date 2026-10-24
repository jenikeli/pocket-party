// Places as words for the screen: 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th' (a race has at most 9 places).
// Used by the 2D race on the host (host/games/kart-2d/) and on the phone (controller/games/kart-2d/).

export function ordinal(place) {
  return `${place}${{ 1: 'st', 2: 'nd', 3: 'rd' }[place] ?? 'th'}`;
}
