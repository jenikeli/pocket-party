// The music: a small sequencer that loops one tune (host/audio/tunes/) through the music volume. Called by the
// game picker (host/game-picker.js) and the races (host/games/kart-2d/index.js, host/games/kart-3d/index.js) with the name
// of the tune their screen should have; does nothing before the audio unlock.
//
// How it keeps time: a plain timer wakes every 50 ms and schedules every note that falls in the next 0.3 s at
// its exact time on the audio clock (context.currentTime). The audio thread then plays them on time even when
// the page's frames are slow or the page is blocked for a moment, as long as the timer catches up within the
// window. While the page is hidden, browsers slow timers to about once a second, so the window grows to 1.5 s.
// If the timer was held up even longer (a phone's screen lock), the notes it missed are skipped, not played in
// a burst (host/audio/tune-cursor.js).
//
// Each tune plays into its own gain node. Stopping or changing the tune fades that node out over half a second
// and then disconnects it, so notes already scheduled past the fade are never heard.

import { audioContext, musicOutput } from './audio.js';
import { compileTune } from './notation.js';
import { createTuneCursor } from './tune-cursor.js';
import { playEvent } from './instruments.js';
import { TUNES } from './tunes/index.js';

const TIMER_MS = 50;
const LOOKAHEAD_SECONDS = 0.3;
const HIDDEN_LOOKAHEAD_SECONDS = 1.5;
const FADE_SECONDS = 0.5;
// The first note waits this long, so it is not already late when the timer first runs.
const START_DELAY_SECONDS = 0.1;

// Each tune is compiled once, the first time it plays.
const compiledTunes = new Map();
// The tune playing now: { name, bus, cursor, timer }; bus and timer are null for a name with no tune.
let playing = null;

function compiled(name) {
  if (!compiledTunes.has(name)) {
    compiledTunes.set(name, compileTune(TUNES[name]));
  }
  return compiledTunes.get(name);
}

// Plays the tune called `name` in a loop, or stops the music for null. Calling it again with the name already
// playing does nothing, so a game can call it every step with the tune its screen should have.
export function playTune(name) {
  if ((playing?.name ?? null) === name) {
    return;
  }
  fadeOut(playing);
  playing = null;
  const context = audioContext();
  if (!name || !context) {
    // Before the unlock nothing can play; the name is not kept, so the next call tries again.
    return;
  }
  if (!TUNES[name]) {
    console.warn(`No tune called "${name}": no music`);
    playing = { name, bus: null, timer: null };
    return;
  }
  const bus = context.createGain();
  bus.connect(musicOutput());
  const cursor = createTuneCursor(compiled(name), context.currentTime + START_DELAY_SECONDS);
  const sounds = TUNES[name].sounds;
  const schedule = () => {
    const now = context.currentTime;
    const lookahead = globalThis.document?.hidden ? HIDDEN_LOOKAHEAD_SECONDS : LOOKAHEAD_SECONDS;
    for (const { event, time } of cursor.due(now, now + lookahead)) {
      playEvent(event, time, sounds, bus);
    }
  };
  schedule();
  playing = { name, bus, timer: setInterval(schedule, TIMER_MS) };
}

function fadeOut(tune) {
  if (!tune?.bus) {
    return;
  }
  clearInterval(tune.timer);
  const now = audioContext().currentTime;
  tune.bus.gain.setValueAtTime(1, now);
  tune.bus.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
  // A little after the fade, by the page's clock: nothing is heard by then, so cutting it off makes no click.
  setTimeout(() => tune.bus.disconnect(), (FADE_SECONDS + 0.1) * 1000);
}

// Which tune a race's screen has: none on the setup screen and during the countdown (its beeps), the race's own
// from GO, the results tune once the race is over. `race` is either race's state (both name their phases
// 'countdown', 'racing' and 'results'), null on the setup screen.
export function tuneForRace(race, raceTune) {
  if (!race || race.phase === 'countdown') {
    return null;
  }
  return race.phase === 'results' ? 'results' : raceTune;
}
