// The test track's tune: plain, a steady lead in quarter notes over held chords, a bass on every beat and a
// basic beat. 16 bars. How to read and change it: the guide at the top of host/audio/tunes/index.js.

export const TEST_TRACK = {
  name: 'test-track',
  key: 'C major',
  tempo: 120,
  beatsPerBar: 4,
  sounds: { lead: 'sawtooth', chords: 'held' },
  loop: {
    lead: `
      E5:1 G5:1 E5:1 C5:1 | A4:1 C5:1 E5:2 | F5:1 E5:1 C5:1 A4:1 | G4:2 B4:1 D5:1 |
      C5:1 E5:1 G5:2 | A5:1 G5:1 E5:2 | F5:1 E5:1 D5:1 A4:1 | B4:2 D5:2 |
      A4:1 C5:1 F5:2 | G5:1 F5:1 D5:2 | E5:1 G5:1 B5:2 | A5:2 E5:2 |
      F5:1 A5:1 C6:1 A5:1 | G5:1 D5:1 B4:2 | C5:4 | D5:2 B4:2`,
    bass: `
      C3:1 C3:1 C3:1 C3:1 | A2:1 A2:1 A2:1 A2:1 | F2:1 F2:1 F2:1 F2:1 | G2:1 G2:1 G2:1 G2:1 |
      C3:1 C3:1 C3:1 C3:1 | A2:1 A2:1 A2:1 A2:1 | D3:1 D3:1 D3:1 D3:1 | G2:1 G2:1 G2:1 G2:1 |
      F2:1 F2:1 F2:1 F2:1 | G2:1 G2:1 G2:1 G2:1 | E2:1 E2:1 E2:1 E2:1 | A2:1 A2:1 A2:1 A2:1 |
      F2:1 F2:1 F2:1 F2:1 | G2:1 G2:1 G2:1 G2:1 | C3:1 C3:1 C3:1 C3:1 | G2:1 G2:1 G2:1 G2:1`,
    chords: `
      C:4 | Am:4 | F:4 | G:4 |
      C:4 | Am:4 | Dm:4 | G:4 |
      F:4 | G:4 | Em:4 | Am:4 |
      F:4 | G:4 | C:4 | G:4`,
    drums: {
      kick: 'x.......x.......',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.',
    },
  },
};
