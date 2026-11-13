// Seaside Skyway's tune: breezy, a soft lead in long notes over rippling arpeggios, a bass in half notes and a
// light beat. 32 bars: part A, part B, part A again, then part C leading back to the start.
// How to read and change it: the guide at the top of host/audio/tunes/index.js.

const A = {
  lead: `
    F#5:2 E5:1 D5:1 | E5:1.5 C#5:0.5 A4:2 | D5:1 F#5:1 B5:1.5 A5:0.5 | G5:3 -:1 |
    A5:1.5 F#5:0.5 D5:1 F#5:1 | E5:1 C#5:1 E5:1 A5:1 | B5:1.5 A5:0.5 G5:1 D5:1 | E5:3 -:1`,
  bass: `
    D3:2 A2:2 | A2:2 E2:2 | B2:2 F#2:2 | G2:2 D3:2 |
    D3:2 A2:2 | A2:2 E2:2 | G2:2 D3:2 | A2:2 E2:2`,
  chords: 'D:4 | A:4 | Bm:4 | G:4 | D:4 | A:4 | G:4 | A:4',
};

const B = {
  lead: `
    D5:1 G5:1 B5:2 | C#5:1 E5:1 A5:2 | F#5:1.5 E5:0.5 C#5:1 A4:1 | B4:1 D5:1 F#5:2 |
    G5:1 A5:1 B5:1 D6:1 | C#6:2 A5:1 E5:1 | F#5:1.5 E5:0.5 D5:1 A4:1 | D5:3 -:1`,
  bass: `
    G2:2 D3:2 | A2:2 E2:2 | F#2:2 C#3:2 | B2:2 F#2:2 |
    G2:2 D3:2 | A2:2 E2:2 | D3:2 A2:2 | D3:2 A2:2`,
  chords: 'G:4 | A:4 | F#m:4 | Bm:4 | G:4 | A:4 | D:4 | D:4',
};

const C = {
  lead: `
    F#5:1 D5:1 B4:2 | G5:1 D5:1 B4:2 | A5:1 F#5:1 D5:2 | E5:1 C#5:0.5 E5:0.5 A5:2 |
    B5:1.5 A5:0.5 F#5:1 D5:1 | G5:1.5 F#5:0.5 D5:2 | E5:1 G5:1 B5:1 G5:1 | A5:2 C#6:1 -:1`,
  bass: `
    B2:2 F#2:2 | G2:2 D3:2 | D3:2 A2:2 | A2:2 E2:2 |
    B2:2 F#2:2 | G2:2 D3:2 | E2:2 B2:2 | A2:2 E2:2`,
  chords: 'Bm:4 | G:4 | D:4 | A:4 | Bm:4 | G:4 | Em:4 | A:4',
};

// Parts end to end, in this order.
const ORDER = [A, B, A, C];

export const SEASIDE_SKYWAY = {
  name: 'seaside-skyway',
  key: 'D major',
  tempo: 112,
  beatsPerBar: 4,
  sounds: { lead: 'triangle', chords: 'arpeggio' },
  loop: {
    lead: ORDER.map((part) => part.lead).join(' | '),
    bass: ORDER.map((part) => part.bass).join(' | '),
    chords: ORDER.map((part) => part.chords).join(' | '),
    drums: {
      kick: 'x.......x.......',
      snare: '............x...',
      hat: 'x.x.x.x.x.x.x.x.',
    },
  },
};
