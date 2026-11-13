// Reads the tunes' note data (host/audio/tunes/*.js, whose header says how it is written) and turns a tune into
// timed events for the sequencer (host/audio/music.js): which voice plays which notes, when and for how long.
// Plain functions, no Web Audio, so the tests can check every tune's bars and key.

const LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// The notes a chord symbol stacks on its root, in semitones: 'F' major, 'Dm' minor, 'G7', 'Fmaj7', 'Am7',
// 'Dsus2', 'Gsus4'.
const CHORD_SHAPES = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

const SCALE_STEPS = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

const DRUMS = ['kick', 'snare', 'hat'];
const STEPS_PER_BEAT = 4; // a drum pattern's characters are sixteenth notes
const ARPEGGIO_STEP_BEATS = 0.25;

// 'C' -> 0, 'F#' -> 6, 'Bb' -> 10: the pitch class, 0 to 11.
function pitchClass(name) {
  const match = /^([A-G])(#|b)?$/.exec(name);
  if (!match) {
    throw new Error(`"${name}" is not a note name (a letter A to G, then # or b)`);
  }
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (LETTER_SEMITONES[match[1]] + accidental + 12) % 12;
}

// 'A4' -> 69, the MIDI note number (middle C, C4, is 60).
export function noteNumber(name) {
  const match = /^([A-G](?:#|b)?)(\d)$/.exec(name);
  if (!match) {
    throw new Error(`"${name}" is not a note (a letter, maybe # or b, then the octave: A4, F#3, Bb2)`);
  }
  // An octave number belongs to C to B, so B#4 or Cb4 would cross it; the tunes never use them.
  return (Number(match[2]) + 1) * 12 + pitchClass(match[1]);
}

export function noteFrequency(number) {
  return 440 * 2 ** ((number - 69) / 12);
}

// 'Dm' -> its notes as MIDI numbers. Roots C to E sit in octave 4 and F to B in octave 3, so every chord falls
// between F3 and about B4, the middle of the keyboard, whatever its root.
export function chordNotes(symbol) {
  const match = /^([A-G](?:#|b)?)(.*)$/.exec(symbol);
  const shape = match && CHORD_SHAPES[match[2]];
  if (!shape) {
    throw new Error(`"${symbol}" is not a chord (a root, then nothing, m, 7, maj7, m7, sus2 or sus4)`);
  }
  const rootClass = pitchClass(match[1]);
  const root = (rootClass < 5 ? 60 : 48) + rootClass;
  return shape.map((step) => root + step);
}

// 'F major' -> the seven pitch classes in it.
export function scaleOf(key) {
  const [tonic, mode] = key.split(' ');
  return SCALE_STEPS[mode].map((step) => (pitchClass(tonic) + step) % 12);
}

// A part string -> its bars, each a list of { notes, beats }. `readNotes` turns what is before the colon into
// MIDI numbers ('-' is a rest, no notes). A `|` after the last bar is allowed and adds no empty bar.
function parseBars(part, readNotes) {
  return part.trim().replace(/\|$/, '').split('|').map((bar) =>
    bar
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        const [what, beats] = token.split(':');
        if (!(Number(beats) > 0)) {
          throw new Error(`"${token}" has no length: write it as note:beats, like C5:1`);
        }
        return { notes: what === '-' ? [] : readNotes(what), beats: Number(beats) };
      }),
  );
}

export function parseMelody(part) {
  return parseBars(part, (name) => [noteNumber(name)]);
}

export function parseChords(part) {
  return parseBars(part, chordNotes);
}

// Checks that every bar of a part adds up to the bar's length and that the parts are as long as the lead.
function checkBars(bars, beatsPerBar, barCount, where) {
  if (bars.length !== barCount) {
    throw new Error(`${where} has ${bars.length} bars, the lead has ${barCount}`);
  }
  bars.forEach((bar, index) => {
    const beats = bar.reduce((sum, note) => sum + note.beats, 0);
    if (Math.abs(beats - beatsPerBar) > 1e-9) {
      throw new Error(`${where}, bar ${index + 1}, adds up to ${beats} beats, not ${beatsPerBar}`);
    }
  });
}

// Lays the notes of a part end to end: one event per note, rests left out. Times in beats from the section's
// start.
function melodyEvents(bars, voice) {
  const events = [];
  let beat = 0;
  for (const note of bars.flat()) {
    if (note.notes.length > 0) {
      events.push({ beat, voice, notes: note.notes, beats: note.beats });
    }
    beat += note.beats;
  }
  return events;
}

// How the chords are played (the tune's `chords` sound): 'held' as long notes, 'arpeggio' one note at a time
// in sixteenths going up (the root again an octave up after the top), 'offbeat' as short stabs between the beats.
function chordEvents(bars, style) {
  const events = [];
  for (const chord of melodyEvents(bars, 'pad')) {
    if (style === 'held') {
      events.push(chord);
    } else if (style === 'arpeggio') {
      const cycle = [...chord.notes, chord.notes[0] + 12];
      for (let step = 0; step * ARPEGGIO_STEP_BEATS < chord.beats; step++) {
        const note = cycle[step % cycle.length];
        events.push({ beat: chord.beat + step * ARPEGGIO_STEP_BEATS, voice: 'arp', notes: [note], beats: ARPEGGIO_STEP_BEATS });
      }
    } else if (style === 'offbeat') {
      for (let offset = 0.5; offset < chord.beats; offset++) {
        events.push({ beat: chord.beat + offset, voice: 'stab', notes: chord.notes, beats: 0.35 });
      }
    } else {
      throw new Error(`Unknown chord sound "${style}": use held, arpeggio or offbeat`);
    }
  }
  return events;
}

// The same one-bar pattern in every bar: 'x' a hit, '.' nothing, one character per sixteenth.
function drumEvents(drums, beatsPerBar, barCount, where) {
  const events = [];
  for (const drum of DRUMS) {
    const pattern = drums[drum];
    if (!pattern) {
      continue;
    }
    if (pattern.length !== beatsPerBar * STEPS_PER_BEAT || /[^x.]/.test(pattern)) {
      throw new Error(`${where} ${drum}: write ${beatsPerBar * STEPS_PER_BEAT} characters, x or .`);
    }
    for (let bar = 0; bar < barCount; bar++) {
      [...pattern].forEach((character, step) => {
        if (character === 'x') {
          events.push({ beat: bar * beatsPerBar + step / STEPS_PER_BEAT, voice: drum, notes: [], beats: 0 });
        }
      });
    }
  }
  return events;
}

// One section (the intro or the loop) -> { bars, seconds, events }, each event { time, voice, notes, seconds }
// in seconds from the section's start, in time order. Throws, naming the bar, if a part does not add up.
function compileSection(section, tune, where) {
  const { beatsPerBar } = tune;
  const lead = parseMelody(section.lead);
  const bass = parseMelody(section.bass);
  const chords = parseChords(section.chords);
  checkBars(lead, beatsPerBar, lead.length, `${where} lead`);
  checkBars(bass, beatsPerBar, lead.length, `${where} bass`);
  checkBars(chords, beatsPerBar, lead.length, `${where} chords`);
  const secondsPerBeat = 60 / tune.tempo;
  const events = [
    ...melodyEvents(lead, 'lead'),
    ...melodyEvents(bass, 'bass'),
    ...chordEvents(chords, tune.sounds.chords),
    ...drumEvents(section.drums ?? {}, beatsPerBar, lead.length, where),
  ];
  if (events.length === 0) {
    throw new Error(`${where} has no notes at all`);
  }
  return {
    bars: lead.length,
    seconds: lead.length * beatsPerBar * secondsPerBeat,
    events: events
      .map(({ beat, voice, notes, beats }) => ({ time: beat * secondsPerBeat, voice, notes, seconds: beats * secondsPerBeat }))
      .sort((a, b) => a.time - b.time),
  };
}

// A tune -> { intro (null if it has none), loop }, each as compileSection gives it.
export function compileTune(tune) {
  return {
    intro: tune.intro ? compileSection(tune.intro, tune, `${tune.name} intro`) : null,
    loop: compileSection(tune.loop, tune, `${tune.name} loop`),
  };
}
