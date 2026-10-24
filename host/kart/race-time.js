// Race times as text for the screen: 83.456 -> '1:23.45'. Shared by both kart races' standings and results
// (host/games/kart-2d/ and host/games/kart-3d/). A plain function, unit tested in Node.

// Hundredths are cut, not rounded, so a time never shows later than it was. The tiny extra stops floating point
// turning 0.29 s into 28.999... hundredths.
export function formatRaceTime(seconds) {
  const hundredths = Math.floor(seconds * 100 + 1e-6);
  const minutes = Math.floor(hundredths / 6000);
  const rest = String(Math.floor(hundredths / 100) % 60).padStart(2, '0');
  return `${minutes}:${rest}.${String(hundredths % 100).padStart(2, '0')}`;
}
