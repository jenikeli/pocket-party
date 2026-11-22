// Spirefall's balance tool: plays many CPU-vs-CPU matches headless (no browser) between random 8-card decks and prints
// each card's play-weighted win rate, plus the share of matches ended by a Keep, by overtime, by tiebreak or drawn,
// and how long they last. A card far from 50% is where to look first (host/games/arena/tuning.js and
// shared/arena-cards.js hold every number). Usage: npm run balance-sim -- [matches] [cpu level 1-3] [seed]

import { pathToFileURL } from 'node:url';
import { CARDS } from '../shared/arena-cards.js';
import { createMatch, stepMatch, playCard } from '../host/games/arena/match.js';
import { createCpu, cpuThink } from '../host/games/arena/cpu-driver.js';
import { createRng, shuffled } from '../host/games/arena/rng.js';

const DT = 1 / 60;
const MAX_SECONDS = 400;
const SEATS = [{ team: 0, playerId: null, cpuLevel: 1 }, { team: 1, playerId: null, cpuLevel: 1 }];

function playOne(seed, level) {
  const random = createRng(seed);
  const decks = [0, 1].map(() => shuffled(CARDS.map((card) => card.id), random).slice(0, 8));
  const match = createMatch({ seed, seats: SEATS, decks });
  const cpus = match.players.map(() => createCpu(level, random));
  const plays = [];
  for (let step = 0; step < MAX_SECONDS * 60 && match.phase !== 'over'; step += 1) {
    stepMatch(match, DT);
    match.players.forEach((player, index) => {
      const action = match.phase !== 'intro' && match.phase !== 'over' && cpuThink(match, player, cpus[index], DT);
      const result = action && playCard(match, index, action.slot, action.x, action.y);
      if (result?.ok) {
        plays.push({ team: player.team, cardId: result.cardId });
      }
    });
    match.world.events.length = 0;
  }
  return { match, plays, length: match.world.time };
}

// Returns { matches, byCard: [{ id, plays, winRate }], reasons, averageSeconds }.
export function runBalance({ matches = 100, level = 2, seed = 1 } = {}) {
  const cards = new Map(CARDS.map((card) => [card.id, { plays: 0, wins: 0 }]));
  const reasons = {};
  let seconds = 0;
  for (let game = 0; game < matches; game += 1) {
    const { match, plays, length } = playOne(seed + game * 7919, level);
    const winner = match.result?.winner ?? null;
    reasons[match.result?.reason ?? 'unfinished'] = (reasons[match.result?.reason ?? 'unfinished'] ?? 0) + 1;
    seconds += length;
    for (const play of plays) {
      const entry = cards.get(play.cardId);
      entry.plays += 1;
      entry.wins += winner === null ? 0.5 : winner === play.team ? 1 : 0;
    }
  }
  const byCard = [...cards].map(([id, entry]) => ({ id, plays: entry.plays, winRate: entry.plays ? entry.wins / entry.plays : 0 })).sort((a, b) => b.winRate - a.winRate);
  return { matches, byCard, reasons, averageSeconds: Math.round(seconds / matches) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [matches, level, seed] = process.argv.slice(2).map(Number);
  const report = runBalance({ matches: matches || 100, level: level || 2, seed: seed || 1 });
  console.log(`${report.matches} matches, CPU level ${level || 2}, about ${report.averageSeconds} s each, endings: ${JSON.stringify(report.reasons)}`);
  for (const card of report.byCard) {
    const flag = card.winRate > 0.56 ? '  <- strong' : card.winRate < 0.44 ? '  <- weak' : '';
    console.log(`${card.id.padEnd(20)} ${String(card.plays).padStart(6)} plays  ${(card.winRate * 100).toFixed(1)}%${flag}`);
  }
}
