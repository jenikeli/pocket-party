// Every tune the music can play (host/audio/music.js), by the name the lobby and the races ask for: the 3D
// courses' tunes are named by course id. One tune per file in this folder, all our own.
//
// How a tune file is written (the same in every file):
//   key: 'F major'        the key; every note and chord stays in it (test/unit/music.test.js checks)
//   tempo: 96             beats per minute
//   beatsPerBar: 4        every bar of every part must add up to this many beats
//   sounds: { lead, chords }   the lead's wave ('triangle' soft, 'square' bright, 'sawtooth' buzzy) and how
//                         the chords are played ('held' long notes, 'arpeggio' one note at a time in
//                         sixteenths, 'offbeat' short stabs between the beats)
//   intro: { ... }        optional, played once before the loop (the results' fanfare)
//   loop: { lead, bass, chords, drums }   played over and over
// lead and bass are notes, `name:beats`, bars split by `|`: `A4:1.5 C5:0.5 F5:2 |` is A for a beat and a half,
// C for half a beat, F for two beats. The number after the letter is the octave (C4 is middle C); # is sharp,
// b flat. `-:1` is a beat of rest. chords are chord names the same way: `F:2 Dm:2 |` (m minor; 7, maj7, m7,
// sus2 and sus4 work too). drums is one bar for each drum, repeated every bar: one character per sixteenth
// note, `x` a hit, `.` nothing, so 'x...x...x...x...' is a kick on every beat. Leave a drum out for none.

import { LOBBY } from './lobby.js';
import { KART_2D } from './kart-2d.js';
import { PALM_BAY_AIRPORT } from './palm-bay-airport.js';
import { SEASIDE_SKYWAY } from './seaside-skyway.js';
import { TEST_TRACK } from './test-track.js';
import { RESULTS } from './results.js';
import { ARENA, ARENA_DOUBLE, ARENA_OVERTIME, ARENA_FINAL } from './arena.js';

export const TUNES = Object.fromEntries(
  [LOBBY, KART_2D, PALM_BAY_AIRPORT, SEASIDE_SKYWAY, TEST_TRACK, RESULTS, ARENA, ARENA_DOUBLE, ARENA_OVERTIME, ARENA_FINAL].map((tune) => [tune.name, tune]),
);
