// The host's one Web Audio context, its two volumes (music and effects) and the nodes that sounds connect to.
// Unlocked by the Tap to start tap (host/tap-to-start.js); used by the synth (host/audio/synth.js), the game
// sounds and the music. Everything is a no-op where there is no Web Audio, or before the unlock.

const DEFAULT_VOLUME = { music: 0.7, effects: 0.8 };
const STORAGE_PREFIX = 'pocket-party-volume-';

// The two volumes as they are now. Loaded from storage on first use; storage only remembers them for the next
// visit, so they stay right even where localStorage is missing or throws.
let volumes = null;
let context = null;
let effectsGain = null;
let musicGain = null;

// A slider value kept to 0..1; anything else (a stored string gone wrong, NaN) is not a volume and gives null.
export function clampVolume(value) {
  if (value === null || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Math.min(1, Math.max(0, number));
}

// `storage` is a localStorage-shaped object, passed in so the tests need no browser. It can throw (private
// windows, blocked site data), and then the volume is just not remembered.
export function readStoredVolume(storage, kind) {
  try {
    return clampVolume(storage.getItem(STORAGE_PREFIX + kind)) ?? DEFAULT_VOLUME[kind];
  } catch {
    return DEFAULT_VOLUME[kind];
  }
}

export function storeVolume(storage, kind, value) {
  try {
    storage.setItem(STORAGE_PREFIX + kind, String(value));
  } catch (error) {
    console.warn(`Could not save the ${kind} volume:`, error);
  }
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function assertKind(kind) {
  if (!(kind in DEFAULT_VOLUME)) {
    throw new Error(`Unknown volume "${kind}": use "music" or "effects"`);
  }
}

function currentVolumes() {
  if (!volumes) {
    const storage = browserStorage();
    volumes = {
      music: storage ? readStoredVolume(storage, 'music') : DEFAULT_VOLUME.music,
      effects: storage ? readStoredVolume(storage, 'effects') : DEFAULT_VOLUME.effects,
    };
  }
  return volumes;
}

export function getVolume(kind) {
  assertKind(kind);
  return currentVolumes()[kind];
}

// The slider is linear but loudness is not: squaring the value makes the lower half of the slider more useful.
function gainFor(kind) {
  return getVolume(kind) ** 2;
}

export function setVolume(kind, value) {
  assertKind(kind);
  const volume = clampVolume(value) ?? DEFAULT_VOLUME[kind];
  currentVolumes()[kind] = volume;
  const storage = browserStorage();
  if (storage) {
    storeVolume(storage, kind, volume);
  }
  const gain = kind === 'music' ? musicGain : effectsGain;
  if (gain) {
    // A short ramp instead of a jump, so dragging the slider does not click.
    gain.gain.setTargetAtTime(volume ** 2, context.currentTime, 0.02);
  }
}

// Called from inside the Tap to start tap: browsers only let a context run after a gesture. Safe to call again.
export function unlockAudio() {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) {
    console.info('Web Audio is not available in this browser: no sound');
    return;
  }
  if (!context) {
    context = new AudioContextClass();
    buildGraph();
    globalThis.document?.addEventListener('visibilitychange', resumeWhenVisible);
  }
  context.resume().catch((error) => console.warn('Audio could not start:', error));
  playSilence();
}

// iOS Safari can leave the context suspended or "interrupted" after the page was hidden (screen lock, app
// switch), and it does not start again by itself. Resuming needs no tap once the page has had one.
function resumeWhenVisible() {
  if (globalThis.document.visibilityState === 'visible' && context.state !== 'running') {
    context.resume().catch((error) => console.warn('Audio could not resume:', error));
  }
}

// Effects and music each have a volume, then both go through one limiter: four karts' engines and a jingle at
// once would otherwise add up past full scale and crackle. A compressor with the browser's defaults would pump
// (the whole mix ducking at every loud sound), so it is set as a peak limiter: it acts only above -6 dB, with
// no soft knee, a ratio of 20, and fast to clamp (3 ms) and release (0.1 s).
function buildGraph() {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.1;
  limiter.connect(context.destination);
  effectsGain = context.createGain();
  effectsGain.gain.value = gainFor('effects');
  effectsGain.connect(limiter);
  musicGain = context.createGain();
  musicGain.gain.value = gainFor('music');
  musicGain.connect(limiter);
}

// iOS Safari starts its audio only once a node has played inside the tap; resume() alone can leave it silent.
function playSilence() {
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  source.connect(context.destination);
  source.start();
}

// null before the unlock or without Web Audio: callers skip their sound.
export function audioContext() {
  return context;
}

export function effectsOutput() {
  return effectsGain;
}

export function musicOutput() {
  return musicGain;
}
