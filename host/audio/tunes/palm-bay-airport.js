// Palm Bay Airport's tune: sunny and bouncy, a bright lead in short notes, chords stabbed between the beats and
// a bass hopping root to fifth. 32 bars: part A, part B, part A again, then part C leading back to the start.
// How to read and change it: the guide at the top of host/audio/tunes/index.js.

const A = {
  lead: `
    B4:0.5 D5:0.5 -:0.5 G5:0.5 -:0.5 D5:0.5 B4:1 | C5:0.5 E5:0.5 -:0.5 G5:0.5 -:0.5 E5:0.5 C5:1 |
    A4:0.5 D5:0.5 -:0.5 F#5:0.5 -:0.5 A5:0.5 F#5:1 | G5:1.5 D5:0.5 B4:2 |
    E5:0.5 G5:0.5 -:0.5 B5:0.5 -:0.5 G5:0.5 E5:1 | G5:0.5 E5:0.5 -:0.5 C5:0.5 -:0.5 E5:0.5 G5:1 |
    A5:1 G5:0.5 E5:0.5 C5:1 E5:1 | D5:1 F#5:1 A5:2`,
  bass: `
    G2:1 D3:1 G2:1 D3:1 | C3:1 G2:1 C3:1 G2:1 | D3:1 A2:1 D3:1 A2:1 | G2:1 D3:1 G2:1 D3:1 |
    E2:1 B2:1 E2:1 B2:1 | C3:1 G2:1 C3:1 G2:1 | A2:1 E3:1 A2:1 E3:1 | D3:1 A2:1 D3:1 A2:1`,
  chords: 'G:4 | C:4 | D:4 | G:4 | Em:4 | C:4 | Am:4 | D:4',
};

const B = {
  lead: `
    E5:1.5 D5:0.5 C5:1 G4:1 | F#5:1.5 E5:0.5 D5:1 A4:1 | B4:0.5 D5:0.5 F#5:0.5 D5:0.5 B5:2 | G5:1 F#5:1 E5:2 |
    C6:0.5 B5:0.5 G5:0.5 E5:0.5 C5:1 E5:1 | D6:0.5 A5:0.5 F#5:0.5 D5:0.5 A5:2 | B5:1 A5:0.5 G5:0.5 D5:1 B4:1 |
    G5:3 -:1`,
  bass: `
    C3:1 G2:1 C3:1 G2:1 | D3:1 A2:1 D3:1 A2:1 | B2:1 F#2:1 B2:1 F#2:1 | E2:1 B2:1 E2:1 B2:1 |
    C3:1 G2:1 C3:1 G2:1 | D3:1 A2:1 D3:1 A2:1 | G2:1 D3:1 G2:1 D3:1 | G2:1 D3:1 G2:1 D3:1`,
  chords: 'C:4 | D:4 | Bm:4 | Em:4 | C:4 | D:4 | G:4 | G:4',
};

const C = {
  lead: `
    E5:0.5 -:0.5 E5:0.5 G5:0.5 B5:1 G5:1 | C5:0.5 -:0.5 C5:0.5 E5:0.5 G5:1 E5:1 |
    D5:0.5 -:0.5 D5:0.5 G5:0.5 B5:1 D6:1 | A5:2 F#5:2 |
    G5:0.5 F#5:0.5 E5:0.5 F#5:0.5 G5:1 B5:1 | C6:1 B5:0.5 A5:0.5 G5:1 E5:1 |
    E5:0.5 F#5:0.5 G5:0.5 A5:0.5 C6:1 A5:1 | F#5:1 A5:1 D6:1 -:1`,
  bass: `
    E2:1 B2:1 E2:1 B2:1 | C3:1 G2:1 C3:1 G2:1 | G2:1 D3:1 G2:1 D3:1 | D3:1 A2:1 D3:1 A2:1 |
    E2:1 B2:1 E2:1 B2:1 | C3:1 G2:1 C3:1 G2:1 | A2:1 E3:1 A2:1 E3:1 | D3:1 A2:1 D3:1 A2:1`,
  chords: 'Em:4 | C:4 | G:4 | D:4 | Em:4 | C:4 | Am:4 | D:4',
};

// Parts end to end, in this order.
const ORDER = [A, B, A, C];

export const PALM_BAY_AIRPORT = {
  name: 'palm-bay-airport',
  key: 'G major',
  tempo: 132,
  beatsPerBar: 4,
  sounds: { lead: 'square', chords: 'offbeat' },
  loop: {
    lead: ORDER.map((part) => part.lead).join(' | '),
    bass: ORDER.map((part) => part.bass).join(' | '),
    chords: ORDER.map((part) => part.chords).join(' | '),
    drums: {
      kick: 'x...x...x...x...',
      snare: '....x.......x...',
      hat: '..x...x...x...x.',
    },
  },
};
