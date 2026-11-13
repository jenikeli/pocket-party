// The results' tune: a short fanfare (4 bars, once), then a calm loop of 16 bars, a slow lead over held chords.
// How to read and change it: the guide at the top of host/audio/tunes/index.js.

export const RESULTS = {
  name: 'results',
  key: 'Bb major',
  tempo: 100,
  beatsPerBar: 4,
  sounds: { lead: 'square', chords: 'held' },
  intro: {
    lead: 'F4:0.5 Bb4:0.5 D5:0.5 F5:0.5 Bb5:2 | G5:1 Eb5:1 A5:1 F5:1 | Bb5:1.5 A5:0.5 G5:2 | F5:3 -:1',
    bass: 'Bb2:4 | Eb3:2 F2:2 | Bb2:2 G2:2 | F2:4',
    chords: 'Bb:4 | Eb:2 F:2 | Bb:2 Gm:2 | F:4',
    drums: {
      kick: 'x.......x.......',
      // A little roll into the next bar.
      snare: '............xxxx',
    },
  },
  loop: {
    lead: `
      D5:2 F5:2 | G5:3 D5:1 | Eb5:2 G5:1 Bb5:1 | A5:2 F5:2 |
      F5:1.5 D5:0.5 Bb4:2 | A4:1 D5:1 F5:2 | G5:2 Eb5:1 Bb4:1 | C5:4 |
      Bb4:1 D5:1 G5:2 | G5:1.5 F5:0.5 Eb5:2 | D5:1 F5:1 Bb5:2 | A5:2 F5:2 |
      Eb5:1 F5:1 G5:2 | F5:1 Eb5:1 C5:2 | D5:4 | C5:2 -:2`,
    bass: `
      Bb2:2 F2:2 | G2:2 D3:2 | Eb3:2 Bb2:2 | F2:2 C3:2 |
      Bb2:2 F2:2 | D3:2 A2:2 | Eb3:2 Bb2:2 | F2:2 C3:2 |
      G2:2 D3:2 | Eb3:2 Bb2:2 | Bb2:2 F2:2 | F2:2 C3:2 |
      Eb3:2 Bb2:2 | F2:2 C3:2 | Bb2:2 F2:2 | F2:2 C3:2`,
    chords: `
      Bb:4 | Gm:4 | Eb:4 | F:4 |
      Bb:4 | Dm:4 | Eb:4 | F:4 |
      Gm:4 | Eb:4 | Bb:4 | F:4 |
      Eb:4 | F:4 | Bb:4 | F:4`,
    drums: {
      kick: 'x.......x.......',
      hat: '....x.......x...',
    },
  },
};
