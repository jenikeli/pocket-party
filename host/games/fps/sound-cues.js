// What Breakwater sounds like, decided without audio: which cues the rules' events imply for one frame, and how
// loud, how far left or right and how muffled each one is for the nearest person playing. Plain functions, unit
// tested in Node; host/games/fps/sounds.js turns the cues into Web Audio, sound-voices.js says how each sounds.
// A cue is a small object { type, ... }; positional cues also carry { gain, pan, cutoff }.

// At most this many cues play in one frame; a firefight is thinned per kind first (the loudest ones stay).
export const MAX_CUES = 10;
const MAX_PER_KIND = { fire: 5, impact: 2, step: 2, jump: 1, land: 1, reload: 2, dryfire: 1, throw: 2, explode: 3, flash: 2, smoke: 2, respawn: 2, hitMarker: 1, thud: 1, killConfirm: 1 };
// Lower plays first when the frame is over the cap: the big moments are never the ones dropped.
const PRIORITY = { matchEnd: 0, explode: 0, killConfirm: 1, flash: 1, hitMarker: 1, thud: 1, fire: 2, throw: 3, smoke: 3, respawn: 3, reload: 4, land: 5, jump: 5, dryfire: 5, impact: 6, step: 7 };
// How loud each kind is at the listener's feet, before distance. Gunshots by weapon: sniper and shotgun are loud.
const LEVEL = { impact: 0.4, step: 0.5, jump: 0.5, land: 0.6, reload: 0.6, dryfire: 0.6, throw: 0.6, explode: 1, flash: 0.9, smoke: 0.6, respawn: 0.6 };
const WEAPON_LEVEL = { sniper: 1, shotgun: 1, rifle: 0.7, carbine: 0.65, pistol: 0.55, knife: 0.3 };
// How far a sound carries in metres before it is cut off (everything fades over the last quarter).
const DEFAULT_RANGE = 70;
const FAR_RANGE = 140;
const MIN_GAIN = 0.02;
const CENTRE_DISTANCE = 1.5; // closer than this the sound is straight ahead, so a source underfoot does not swing

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The listener nearest to a point, and how far (metres, on the ground and up). Null with no listeners.
export function nearestListener(listeners, point) {
  let best = null;
  for (const listener of listeners) {
    const distance = Math.hypot(point.x - listener.x, (point.y ?? 0) - (listener.y ?? 0), point.z - listener.z);
    if (!best || distance < best.distance) {
      best = { listener, distance };
    }
  }
  return best;
}

// Volume for a distance: about 1/(1+d/10), faded to nothing over the last quarter of `range`, 0 beyond it.
export function distanceGain(distance, range = DEFAULT_RANGE) {
  if (distance >= range) {
    return 0;
  }
  return Math.min(1, (range - distance) / (range * 0.25)) / (1 + distance / 10);
}

// -1 (hard left) to 1 (hard right): the source's direction against the listener's right vector (cos yaw, -sin yaw
// on the ground; yaw 0 faces -z, so +x is on the right). 0 when very close.
export function panFor(listener, point, distance) {
  if (distance < CENTRE_DISTANCE) {
    return 0;
  }
  const across = (point.x - listener.x) * Math.cos(listener.yaw) - (point.z - listener.z) * Math.sin(listener.yaw);
  return clamp(across / distance, -1, 1) * 0.9;
}

// Distant sounds lose their highs: a lowpass cutoff in Hz from 16 kHz (close) down to about 900 Hz (far).
export function cutoffFor(distance) {
  return Math.max(900, 16000 / (1 + distance / 6));
}

// A positional cue's gain, pan and cutoff for the nearest listener, or null when it is out of earshot.
export function placed(cue, point, listeners, level, range = DEFAULT_RANGE) {
  const near = nearestListener(listeners, point);
  if (!near) {
    return null;
  }
  const gain = level * distanceGain(near.distance, range);
  if (gain < MIN_GAIN) {
    return null;
  }
  return { ...cue, gain, pan: panFor(near.listener, point, near.distance), cutoff: cutoffFor(near.distance) };
}

function fireCue(event, listeners) {
  const level = (WEAPON_LEVEL[event.weapon] ?? 0.6) * (event.loud === false ? 0.6 : 1);
  const range = event.weapon === 'sniper' ? FAR_RANGE : event.weapon === 'shotgun' ? DEFAULT_RANGE * 1.3 : DEFAULT_RANGE;
  return placed({ type: 'fire', weapon: event.weapon }, event, listeners, level, range);
}

// Non-positional feedback for the people playing: their hit marker, their kill, and being hit.
function personalCues(event, humanIds) {
  const cues = [];
  if (event.type === 'hit') {
    if (humanIds.includes(event.pid)) {
      cues.push({ type: 'hitMarker', head: Boolean(event.head) });
    }
    if (humanIds.includes(event.victim)) {
      cues.push({ type: 'thud' });
    }
  } else if (event.type === 'kill' && humanIds.includes(event.killer)) {
    cues.push({ type: 'killConfirm', head: Boolean(event.head) });
  } else if (event.type === 'matchEnd') {
    cues.push({ type: 'matchEnd' });
  }
  return cues;
}

// One event -> its cues (none for events with no sound).
function cuesOf(event, listeners, humanIds) {
  const at = (cue, range) => placed(cue, event, listeners, LEVEL[cue.type], range);
  switch (event.type) {
    case 'fire':
      return [fireCue(event, listeners)];
    case 'impact':
      return [at({ type: 'impact', mat: event.mat })];
    case 'step':
      return [at({ type: 'step', sprint: Boolean(event.sprint) })];
    case 'reload':
      return [at({ type: 'reload', weapon: event.weapon })];
    case 'throw':
      return [at({ type: 'throw', kind: event.kind })];
    case 'explode':
      return [at({ type: 'explode' }, FAR_RANGE)];
    case 'flash':
      return [at({ type: 'flash' }, FAR_RANGE)];
    case 'jump': case 'land': case 'dryfire': case 'smoke': case 'respawn':
      return [at({ type: event.type })];
    default:
      return personalCues(event, humanIds);
  }
}

// Keeps the loudest few of each kind that has a limit.
function thinned(cues) {
  const seen = {};
  return [...cues].sort((a, b) => (b.gain ?? 1) - (a.gain ?? 1)).filter((cue) => {
    seen[cue.type] = (seen[cue.type] ?? 0) + 1;
    return seen[cue.type] <= (MAX_PER_KIND[cue.type] ?? Infinity);
  });
}

// A crowd of footsteps is a murmur, not a stampede: past two in a frame the survivors play quieter.
function crowdedSteps(all) {
  const count = all.filter((cue) => cue.type === 'step').length;
  return count > 2 ? 0.6 : 1;
}

// Every cue for one frame, most important first and no more than MAX_CUES. `listeners` is 1 to 4 of
// { x, y, z, yaw }; `humanIds` the ids of the people playing.
export function frameCues(events, listeners, humanIds) {
  const all = events.flatMap((event) => cuesOf(event, listeners, humanIds)).filter(Boolean);
  const stepScale = crowdedSteps(all);
  const kept = thinned(all).map((cue) => (cue.type === 'step' ? { ...cue, gain: cue.gain * stepScale } : cue));
  return kept.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]).slice(0, MAX_CUES);
}
