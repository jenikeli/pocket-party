// A player's 8-card deck as a cycle: four cards in hand, the next one shown, the played card going to the back.
// Pure functions, unit tested. Used by match.js and the phone's view.

import { shuffled } from './rng.js';

export const HAND_SIZE = 4;

// `cardIds` is 8 card ids; `random` the seeded generator. The first four of the shuffle are the hand.
export function createDeck(cardIds, random) {
  const order = shuffled(cardIds, random);
  return { hand: order.slice(0, HAND_SIZE), queue: order.slice(HAND_SIZE) };
}

// The card that will fill the hand next.
export function nextCard(deck) {
  return deck.queue[0];
}

// Plays the card in `slot`: it goes to the back of the queue and the front of the queue takes its place.
// Returns the played card id.
export function playSlot(deck, slot) {
  const played = deck.hand[slot];
  deck.hand[slot] = deck.queue.shift();
  deck.queue.push(played);
  return played;
}
