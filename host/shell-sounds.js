// The shell's small sounds: a blip when a player joins, another when one leaves, a click when a game is chosen
// and a rise on Play. The roster comparison is a plain function (unit tested in Node); the rest plays through
// host/audio/synth.js. Used by host/lobby.js and host/join-window.js.

import { tone } from './audio/synth.js';

// The player ids seen at the last check, null until the first one (and again after forgetRoster).
let knownPlayerIds = null;

// Which blips a change of players calls for: ['join'] when someone is new, ['leave'] when someone is gone, both
// when both happened in the same interval, [] for no change or for the first look (`before` null), so a lobby
// that opens with people in it is not a burst of blips. Ids are arrays or sets of player ids.
export function rosterCues(before, after) {
  if (!before) {
    return [];
  }
  const was = new Set(before);
  const is = new Set(after);
  const cues = [];
  if ([...is].some((playerId) => !was.has(playerId))) {
    cues.push('join');
  }
  if ([...was].some((playerId) => !is.has(playerId))) {
    cues.push('leave');
  }
  return cues;
}

// Called on every refresh of a screen that shows the players (the lobby, the join window). Both call it, and
// they share the one baseline, so a join seen by one is not played again by the other.
export function playRosterSounds(players) {
  const playerIds = [...players.keys()];
  rosterCues(knownPlayerIds, playerIds).forEach(playShellSound);
  knownPlayerIds = playerIds;
}

// The next check is a first look again. Called when the players have not been watched for a while (a game ran,
// the join window was shut), so the joins and leaves of that time do not all play at once.
export function forgetRoster() {
  knownPlayerIds = null;
}

// A join is a short sine blip sliding up, a leave the same blip sliding down. The click is a very short square
// tick; Play is a triangle sweep that climbs about two octaves in 0.3 s.
const SHELL_SOUNDS = {
  join: () => {
    tone({ type: 'sine', frequency: 600, endFrequency: 950, length: 0.14, attack: 0.01, volume: 0.22 });
  },
  leave: () => {
    tone({ type: 'sine', frequency: 700, endFrequency: 430, length: 0.18, attack: 0.01, volume: 0.2 });
  },
  click: () => {
    tone({ type: 'square', frequency: 1200, length: 0.035, volume: 0.1 });
  },
  play: () => {
    tone({ type: 'triangle', frequency: 260, endFrequency: 1100, length: 0.3, attack: 0.02, volume: 0.25 });
  },
};

export function playShellSound(name) {
  SHELL_SOUNDS[name]();
}
