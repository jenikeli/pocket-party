// The 2D race's tune: quick and arcade, a bright lead over running arpeggios, a bass jumping octaves and a
// four-on-the-floor beat. 16 bars. How to read and change it: the guide at the top of host/audio/tunes/index.js.

// A bar of the bass: the note and the one an octave up, in eighths.
const octaves = (low, high) => `${low}:0.5 ${high}:0.5 `.repeat(4);

export const KART_2D = {
  name: 'kart-2d',
  key: 'E minor',
  tempo: 150,
  beatsPerBar: 4,
  sounds: { lead: 'square', chords: 'arpeggio' },
  loop: {
    lead: `
      E5:0.5 G5:0.5 B5:0.5 G5:0.5 E5:1 B4:1 | C5:0.5 E5:0.5 G5:1 E5:1 C5:1 |
      D5:0.5 F#5:0.5 A5:1 F#5:0.5 D5:0.5 A4:1 | B4:1 E5:1 G5:2 |
      G5:0.5 F#5:0.5 E5:0.5 F#5:0.5 G5:1 B5:1 | C6:1.5 B5:0.5 G5:1 E5:1 |
      A5:0.5 G5:0.5 E5:0.5 C5:0.5 A4:1 C5:1 | D5:1.5 E5:0.5 F#5:2 |
      E5:0.5 E5:0.5 G5:0.5 E5:0.5 C6:1 G5:1 | F#5:0.5 F#5:0.5 A5:0.5 F#5:0.5 D6:1 A5:1 |
      B5:1 A5:0.5 F#5:0.5 D5:1 F#5:1 | E5:3 -:1 |
      C5:0.5 E5:0.5 A5:0.5 E5:0.5 C6:1 A5:1 | G5:0.5 E5:0.5 C5:0.5 E5:0.5 G5:1 C6:1 |
      B5:0.5 A5:0.5 F#5:0.5 E5:0.5 D5:1 F#5:1 | A5:2 F#5:1 D5:1`,
    bass: `
      ${octaves('E2', 'E3')} | ${octaves('C2', 'C3')} | ${octaves('D2', 'D3')} | ${octaves('E2', 'E3')} |
      ${octaves('E2', 'E3')} | ${octaves('C2', 'C3')} | ${octaves('A2', 'A3')} | ${octaves('D2', 'D3')} |
      ${octaves('C2', 'C3')} | ${octaves('D2', 'D3')} | ${octaves('B2', 'B3')} | ${octaves('E2', 'E3')} |
      ${octaves('A2', 'A3')} | ${octaves('C2', 'C3')} | ${octaves('D2', 'D3')} | ${octaves('D2', 'D3')}`,
    chords: `
      Em:4 | C:4 | D:4 | Em:4 |
      Em:4 | C:4 | Am:4 | D:4 |
      C:4 | D:4 | Bm:4 | Em:4 |
      Am:4 | C:4 | D:4 | D:4`,
    drums: {
      kick: 'x...x...x...x...',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.',
    },
  },
};
