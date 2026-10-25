// The 3D race's quality setting, chosen on the host's setup screen: how much of the look the host draws. M6a
// measured bloom as the costliest part and the number of pixels as the next, so lower levels drop bloom first,
// then resolution. The choice belongs to the host device, not to a race, so it is remembered in the host's
// localStorage. Used by host/games/kart-3d/index.js, panels.js and renderer.js.

// pixelRatio is drawing-buffer pixels per CSS pixel. M6a measured the full look at 1 (not the device's own
// ratio, which is 2 on an iPad and costs about 4 times as much).
export const QUALITY_LEVELS = Object.freeze({
  high: Object.freeze({ label: 'High', bloom: true, pixelRatio: 1 }),
  medium: Object.freeze({ label: 'Medium', bloom: false, pixelRatio: 1 }),
  low: Object.freeze({ label: 'Low', bloom: false, pixelRatio: 0.7 }),
});
export const DEFAULT_QUALITY = 'high';
// Where the choice is kept in the host's localStorage (the browser tests set it before the host page loads).
export const QUALITY_STORAGE_KEY = 'pocket-party.kart-3d.quality';

// The level saved on this host, or the default. localStorage can be missing or throw (a private window,
// blocked site data), and then the default is used.
export function loadQuality() {
  try {
    const saved = localStorage.getItem(QUALITY_STORAGE_KEY);
    return saved !== null && Object.hasOwn(QUALITY_LEVELS, saved) ? saved : DEFAULT_QUALITY;
  } catch (error) {
    console.error('Could not read the saved 3D quality setting, using the default', error);
    return DEFAULT_QUALITY;
  }
}

export function saveQuality(level) {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, level);
  } catch (error) {
    console.error('Could not save the 3D quality setting; it lasts until the page reloads', error);
  }
}
