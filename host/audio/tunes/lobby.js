// The lobby's tune: light and unhurried, a soft lead over held chords and a gentle beat. 16 bars.
// How to read and change it: the guide at the top of host/audio/tunes/index.js.

export const LOBBY = {
  name: 'lobby',
  key: 'F major',
  tempo: 96,
  beatsPerBar: 4,
  sounds: { lead: 'triangle', chords: 'held' },
  loop: {
    lead: `
      A4:1.5 C5:0.5 F5:2 | E5:1 C5:1 A4:2 | D5:1.5 C5:0.5 Bb4:1 D5:1 | C5:3 -:1 |
      A4:1 Bb4:1 C5:1 F5:1 | A5:2 F5:1 D5:1 | G5:1.5 F5:0.5 D5:1 Bb4:1 | C5:2 E5:1 G5:1 |
      F5:1.5 D5:0.5 Bb4:2 | E5:1 G5:1 E5:2 | C5:1.5 E5:0.5 A5:2 | F5:1 E5:1 D5:2 |
      Bb4:1 D5:1 G5:1.5 F5:0.5 | E5:2 C5:2 | F5:1 C5:1 D5:1 F5:1 | G5:1.5 F5:0.5 E5:2`,
    bass: `
      F2:2 C3:2 | A2:2 E2:2 | Bb2:2 F2:2 | C3:2 G2:2 |
      F2:2 C3:2 | D3:2 A2:2 | G2:2 D3:2 | C3:2 G2:2 |
      Bb2:2 F2:2 | C3:2 G2:2 | A2:2 E2:2 | D3:2 A2:2 |
      G2:2 D3:2 | C3:2 G2:2 | F2:2 D2:2 | G2:2 C3:2`,
    chords: `
      F:4 | Am:4 | Bb:4 | C:4 |
      F:4 | Dm:4 | Gm:4 | C:4 |
      Bb:4 | C:4 | Am:4 | Dm:4 |
      Gm:4 | C:4 | F:2 Dm:2 | Gm:2 C:2`,
    drums: {
      kick: 'x.......x.......',
      hat: '..x...x...x...x.',
    },
  },
};
