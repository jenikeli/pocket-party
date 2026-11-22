// Spirefall's four tunes, each 16 bars (a 4-bar phrase twice, then it again with a new ending). Regulation is a
// calm pastoral loop in G major: a soft lead over a held pad. At double elixir the same tune gains drums and the
// pad turns into short plucked chords. Overtime is the minor-key variant (E minor, the same notes) with a drum
// pulse, and at triple elixir the tempo and the hat speed up. How to read and change it: the guide at the top of
// host/audio/tunes/index.js.

// Joins four-bar phrases into one part.
const bars = (...phrases) => phrases.join(' | ');

const PASTORAL_LEAD = bars(
  'G4:1 B4:1 D5:2 | E5:1.5 D5:0.5 B4:2 | C5:1 E5:1 G5:2 | F#5:1.5 E5:0.5 D5:2',
  'B4:1 E5:1 G5:2 | G5:1 E5:1 C5:2 | D5:1.5 F#5:0.5 A5:2 | G5:3 -:1',
  'G4:1 B4:1 D5:2 | E5:1.5 D5:0.5 B4:2 | C5:1 E5:1 G5:2 | F#5:1.5 E5:0.5 D5:2',
  'B4:1 E5:1 G5:2 | G5:1 E5:1 C5:2 | D5:1 F#5:1 A5:1 F#5:1 | G5:4',
);
const PASTORAL_BASS = bars(
  'G2:2 D3:2 | E2:2 B2:2 | C3:2 G2:2 | D3:2 A2:2',
  'E2:2 B2:2 | C3:2 G2:2 | D3:2 A2:2 | G2:2 D3:2',
  'G2:2 D3:2 | E2:2 B2:2 | C3:2 G2:2 | D3:2 A2:2',
  'E2:2 B2:2 | C3:2 G2:2 | D3:2 A2:2 | G2:4',
);
const PASTORAL_CHORDS = bars('G:4 | Em:4 | C:4 | D:4', 'Em:4 | C:4 | D:4 | G:4', 'G:4 | Em:4 | C:4 | D:4', 'Em:4 | C:4 | D:4 | G:4');

export const ARENA = {
  name: 'arena',
  key: 'G major',
  tempo: 84,
  beatsPerBar: 4,
  sounds: { lead: 'triangle', chords: 'held' },
  loop: { lead: PASTORAL_LEAD, bass: PASTORAL_BASS, chords: PASTORAL_CHORDS },
};

export const ARENA_DOUBLE = {
  name: 'arena-double',
  key: 'G major',
  tempo: 100,
  beatsPerBar: 4,
  sounds: { lead: 'triangle', chords: 'offbeat' },
  loop: {
    lead: PASTORAL_LEAD,
    bass: PASTORAL_BASS,
    chords: PASTORAL_CHORDS,
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
  },
};

const OVERTIME_LEAD = bars(
  'E5:1 G5:1 B5:2 | G5:1 E5:1 C5:2 | A4:1 C5:1 E5:2 | D5:1 F#5:1 B5:2',
  'B5:1 G5:1 E5:2 | C5:1 E5:1 A5:2 | F#5:1 D5:1 B4:2 | E5:3 -:1',
  'E5:1 G5:1 B5:2 | G5:1 E5:1 C5:2 | A4:1 C5:1 E5:2 | D5:1 F#5:1 B5:2',
  'B5:1 G5:1 E5:2 | C5:1 E5:1 A5:2 | F#5:1 D5:1 B4:2 | E5:4',
);
const OVERTIME_BASS = bars(
  'E2:2 B2:2 | C3:2 G2:2 | A2:2 E3:2 | B2:2 F#2:2',
  'E2:2 B2:2 | A2:2 E3:2 | B2:2 F#2:2 | E2:2 B2:2',
  'E2:2 B2:2 | C3:2 G2:2 | A2:2 E3:2 | B2:2 F#2:2',
  'E2:2 B2:2 | A2:2 E3:2 | B2:2 F#2:2 | E2:4',
);
const OVERTIME_CHORDS = bars('Em:4 | C:4 | Am:4 | Bm:4', 'Em:4 | Am:4 | Bm:4 | Em:4', 'Em:4 | C:4 | Am:4 | Bm:4', 'Em:4 | Am:4 | Bm:4 | Em:4');

export const ARENA_OVERTIME = {
  name: 'arena-overtime',
  key: 'E minor',
  tempo: 112,
  beatsPerBar: 4,
  sounds: { lead: 'triangle', chords: 'offbeat' },
  loop: {
    lead: OVERTIME_LEAD,
    bass: OVERTIME_BASS,
    chords: OVERTIME_CHORDS,
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
  },
};

export const ARENA_FINAL = {
  ...ARENA_OVERTIME,
  name: 'arena-final',
  tempo: 132,
  loop: { ...ARENA_OVERTIME.loop, drums: { kick: 'x...x...x...x..x', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' } },
};
