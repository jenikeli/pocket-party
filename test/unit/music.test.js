// Unit tests for the music (M10 task L): the note notation (host/audio/notation.js), every tune's bars and key
// (host/audio/tunes/), the cursor that keeps a tune's place (host/audio/tune-cursor.js), and the sequencer's
// start and stop (host/audio/music.js) against a fake Web Audio context. Nobody can listen in a test; these
// check what can be checked without ears.

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { noteNumber, noteFrequency, chordNotes, scaleOf, parseMelody, parseChords, compileTune } from '../../host/audio/notation.js';
import { createTuneCursor } from '../../host/audio/tune-cursor.js';
import { TUNES } from '../../host/audio/tunes/index.js';
import { COURSES } from '../../host/games/kart-3d/courses.js';

test('notes are read as MIDI numbers, sharps and flats included', () => {
  assert.equal(noteNumber('C4'), 60);
  assert.equal(noteNumber('A4'), 69);
  assert.equal(noteNumber('F#3'), 54);
  assert.equal(noteNumber('Bb2'), 46);
  assert.ok(Math.abs(noteFrequency(69) - 440) < 1e-9);
  assert.ok(Math.abs(noteFrequency(81) - 880) < 1e-9);
  assert.throws(() => noteNumber('H4'), /not a note/);
  assert.throws(() => noteNumber('C'), /not a note/);
});

test('chords stack their notes on a root in the middle of the keyboard', () => {
  assert.deepEqual(chordNotes('C'), [60, 64, 67]);
  assert.deepEqual(chordNotes('Dm'), [62, 65, 69]);
  assert.deepEqual(chordNotes('F'), [53, 57, 60]);
  assert.deepEqual(chordNotes('G7'), [55, 59, 62, 65]);
  assert.deepEqual(chordNotes('F#m'), [54, 57, 61]);
  assert.throws(() => chordNotes('Cdim'), /not a chord/);
});

test('a part is read bar by bar, rests have no notes, and a token without a length is refused', () => {
  const bars = parseMelody('A4:1.5 C5:0.5 -:2 | F5:4');
  assert.deepEqual(bars, [
    [{ notes: [69], beats: 1.5 }, { notes: [72], beats: 0.5 }, { notes: [], beats: 2 }],
    [{ notes: [77], beats: 4 }],
  ]);
  assert.deepEqual(parseChords('C:2 Am:2'), [[{ notes: [60, 64, 67], beats: 2 }, { notes: [57, 60, 64], beats: 2 }]]);
  assert.throws(() => parseMelody('A4 C5:1'), /no length/);
});

const sampleTune = (lead) => ({
  name: 'sample',
  key: 'C major',
  tempo: 120,
  beatsPerBar: 4,
  sounds: { lead: 'square', chords: 'held' },
  loop: { lead, bass: 'C3:4 | G2:4', chords: 'C:4 | G:4', drums: { kick: 'x.......x.......' } },
});

test('a bar that does not add up is refused, naming the part and the bar', () => {
  assert.throws(() => compileTune(sampleTune('C5:4 | D5:2 E5:1')), /sample loop lead, bar 2, adds up to 3 beats/);
  assert.throws(() => compileTune(sampleTune('C5:4')), /bass has 2 bars, the lead has 1/);
});

test('a compiled tune has its events in seconds, in time order', () => {
  const { intro, loop } = compileTune(sampleTune('C5:2 -:2 | D5:4'));
  assert.equal(intro, null);
  assert.equal(loop.bars, 2);
  assert.equal(loop.seconds, 4); // 8 beats at 120 per minute
  const lead = loop.events.filter((event) => event.voice === 'lead');
  assert.deepEqual(lead.map((event) => [event.time, event.seconds]), [[0, 1], [2, 2]]);
  assert.deepEqual(loop.events.filter((event) => event.voice === 'kick').map((event) => event.time), [0, 1, 2, 3]);
  const times = loop.events.map((event) => event.time);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('arpeggios run in sixteenths through the chord, offbeat stabs fall between the beats', () => {
  const arpeggio = compileTune({ ...sampleTune('C5:4 | C5:4'), sounds: { lead: 'square', chords: 'arpeggio' } });
  const arp = arpeggio.loop.events.filter((event) => event.voice === 'arp');
  assert.equal(arp.length, 32);
  assert.deepEqual(arp.slice(0, 5).map((event) => event.notes[0]), [60, 64, 67, 72, 60]);
  const offbeat = compileTune({ ...sampleTune('C5:4 | C5:4'), sounds: { lead: 'square', chords: 'offbeat' } });
  const stabs = offbeat.loop.events.filter((event) => event.voice === 'stab');
  assert.deepEqual(stabs.slice(0, 4).map((event) => event.time), [0.25, 0.75, 1.25, 1.75]);
});

test('there is a tune for the lobby, the 2D race, the results and every 3D course', () => {
  for (const name of ['lobby', 'kart-2d', 'results', ...COURSES.map((course) => course.id)]) {
    assert.ok(TUNES[name], `a tune called ${name}`);
  }
});

for (const tune of Object.values(TUNES)) {
  test(`${tune.name}: every bar adds up, the loop is 16 to 32 bars, every note is in ${tune.key}`, () => {
    const { intro, loop } = compileTune(tune);
    assert.ok(loop.bars >= 16 && loop.bars <= 32, `${loop.bars} bars`);
    assert.ok(!intro || intro.bars <= 8, 'a short intro');
    const scale = scaleOf(tune.key);
    for (const section of [intro, loop].filter(Boolean)) {
      for (const event of section.events) {
        for (const note of event.notes) {
          assert.ok(scale.includes(note % 12), `${event.voice} note ${note} at ${event.time.toFixed(2)} s is outside ${tune.key}`);
        }
        if (event.voice === 'lead') {
          assert.ok(event.notes[0] >= 60 && event.notes[0] <= 86, `lead note ${event.notes[0]} out of range`);
        }
        if (event.voice === 'bass') {
          assert.ok(event.notes[0] >= 36 && event.notes[0] <= 59, `bass note ${event.notes[0]} out of range`);
        }
      }
    }
  });
}

const twoSections = {
  intro: { seconds: 1, events: [{ time: 0, voice: 'lead' }, { time: 0.5, voice: 'lead' }] },
  loop: { seconds: 2, events: [{ time: 0, voice: 'bass' }, { time: 1, voice: 'bass' }] },
};

test('the cursor plays the intro once, then the loop over and over', () => {
  const cursor = createTuneCursor(twoSections, 10);
  const due = cursor.due(10, 16).map(({ event, time }) => [event.voice, time]);
  assert.deepEqual(due, [
    ['lead', 10], ['lead', 10.5],
    ['bass', 11], ['bass', 12], ['bass', 13], ['bass', 14], ['bass', 15],
  ]);
  assert.deepEqual(cursor.due(16, 17).map(({ time }) => time), [16], 'carries on where it stopped');
});

test('after a long pause the cursor skips what it missed instead of playing it all at once', () => {
  const cursor = createTuneCursor(twoSections, 10);
  cursor.due(10, 10.3);
  // The timer did not run for 100 s (a locked screen): only notes from now on come back.
  const due = cursor.due(110.2, 110.5);
  assert.deepEqual(due, []);
  assert.deepEqual(cursor.due(110.5, 112.1).map(({ time }) => time), [111, 112]);
});

// A stand-in for Web Audio: records the nodes made, where they connect and their gain changes.
function fakeAudioContext() {
  const made = [];
  const param = () => {
    const calls = [];
    const record = (name) => (...args) => calls.push([name, ...args]);
    return { calls, value: 1, setValueAtTime: record('set'), linearRampToValueAtTime: record('linear'), exponentialRampToValueAtTime: record('exponential'), setTargetAtTime: record('target') };
  };
  const node = (kind, extra) => {
    const created = {
      kind,
      connect(target) {
        this.target = target;
        return target;
      },
      disconnect() {
        this.target = null;
      },
      start(when) {
        this.started = when;
      },
      stop() {},
      ...extra,
    };
    made.push(created);
    return created;
  };
  const limiterParams = { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } };
  return {
    made,
    currentTime: 5,
    sampleRate: 100,
    state: 'running',
    destination: { kind: 'destination' },
    resume: () => Promise.resolve(),
    createBuffer: (channels, length) => ({ length, getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => node('source'),
    createOscillator: () => node('oscillator', { frequency: param() }),
    createGain: () => node('gain', { gain: param() }),
    createBiquadFilter: () => node('filter', { frequency: param(), Q: { value: 0 } }),
    createDynamicsCompressor: () => node('compressor', limiterParams),
  };
}

test('a tune is scheduled ahead on the audio clock, and stopping it fades it out and schedules nothing more', async () => {
  const fake = fakeAudioContext();
  globalThis.AudioContext = function AudioContext() {
    return fake;
  };
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  try {
    const { unlockAudio, musicOutput } = await import('../../host/audio/audio.js');
    const { playTune } = await import('../../host/audio/music.js');
    playTune('lobby');
    assert.equal(fake.made.length, 0, 'nothing before the unlock');
    unlockAudio();
    playTune('lobby');
    const bus = fake.made.find((made) => made.kind === 'gain' && made.target === musicOutput());
    assert.ok(bus, 'the tune has its own gain into the music volume');
    const started = () => fake.made.filter((made) => made.kind === 'oscillator').map((made) => made.started);
    assert.ok(started().length > 0, 'the first notes are scheduled at once');
    assert.ok(started().every((when) => when >= 5.1 && when < 5.4), 'within the lookahead, from the start delay');

    fake.currentTime = 6;
    mock.timers.tick(50);
    assert.ok(Math.max(...started()) >= 6, 'the timer schedules the next notes');

    playTune('lobby');
    const countBefore = fake.made.length;
    playTune(null);
    assert.deepEqual(bus.gain.calls.at(-1), ['linear', 0, 6.5], 'faded out over half a second');
    fake.currentTime = 7;
    mock.timers.tick(1000);
    assert.equal(fake.made.length, countBefore, 'no notes after the stop');
    assert.equal(bus.target, null, 'disconnected after the fade');
  } finally {
    mock.timers.reset();
    delete globalThis.AudioContext;
  }
});

test('tuneForRace: silence on the setup screen and the countdown, the race tune from GO, then the results', async () => {
  const { tuneForRace } = await import('../../host/audio/music.js');
  assert.equal(tuneForRace(null, 'kart-2d'), null);
  assert.equal(tuneForRace({ phase: 'countdown' }, 'kart-2d'), null);
  assert.equal(tuneForRace({ phase: 'racing' }, 'kart-2d'), 'kart-2d');
  assert.equal(tuneForRace({ phase: 'results' }, 'kart-2d'), 'results');
});

test('a bar line after the last bar adds no empty bar', () => {
  assert.equal(parseMelody('C5:4 | D5:4 |').length, 2);
});
