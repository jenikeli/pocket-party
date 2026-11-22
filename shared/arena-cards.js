// Spirefall's 24 cards, the tokens some of them make, and four preset decks. Data only (docs/arena-plan.md section 6):
// every number to tune is here. Used by the host's rules and by the phone's hand and deck screens.
//
// A unit: cost, count (units per play), hp, damage, hit (seconds), speed (tiles per second), range (0.8 is melee, edge
// to edge), radius, mass (heavier pushes lighter), flying, targets ('both' | 'ground' | 'air' | 'buildings'), splash
// (radius, 0 for none), ranged (fires a projectile), traits (see host/games/arena/sim-*.js).

const SLOW = 0.75;
const MEDIUM = 1;
const FAST = 1.5;
const MELEE = 0.8;

function troop(id, name, faction, cost, stats) {
  return { id, name, faction, type: 'troop', cost, count: 1, flying: false, targets: 'both', splash: 0, ranged: false, traits: {}, mass: 3, ...stats };
}

function building(id, name, faction, cost, stats) {
  return { id, name, faction, type: 'building', cost, count: 1, flying: false, targets: 'both', splash: 0, ranged: true, speed: 0, radius: 0.9, mass: 99, traits: { immovable: true }, ...stats };
}

function spell(id, name, faction, cost, stats) {
  return { id, name, faction, type: 'spell', cost, ...stats };
}

export const CARDS = Object.freeze([
  troop('ember-wisp', 'Ember Wisp', 'cinder', 1, { hp: 85, damage: 50, hit: 1.0, speed: FAST, range: MELEE, radius: 0.35, mass: 1, flying: true }),
  troop('brook-sprite', 'Brook Sprite', 'brook', 2, { hp: 150, damage: 65, hit: 1.2, speed: MEDIUM, range: 5, radius: 0.4, mass: 2, ranged: true, traits: { slowOnHit: { factor: 0.85, seconds: 1 } } }),
  troop('thistle-pups', 'Thistle Pups', 'thorn', 3, { count: 3, hp: 105, damage: 38, hit: 0.9, speed: FAST, range: MELEE, radius: 0.35, mass: 1, targets: 'ground' }),
  troop('bramble-knight', 'Bramble Knight', 'thorn', 3, { hp: 640, damage: 85, hit: 1.1, speed: MEDIUM, range: MELEE, radius: 0.55, mass: 5, targets: 'ground', traits: { thorns: 15 } }),
  troop('moth-swarm', 'Moth Swarm', 'thorn', 3, { count: 4, hp: 48, damage: 28, hit: 0.8, speed: FAST, range: MELEE, radius: 0.3, mass: 0.5, flying: true }),
  troop('powder-cart', 'Powder Cart', 'cog', 3, { hp: 190, damage: 0, hit: 1, speed: FAST, range: MELEE, radius: 0.5, mass: 3, targets: 'ground', traits: { detonate: { radius: 1.8, damage: 210, buildingFactor: 2.5 } } }),
  troop('kestrel', 'Kestrel', 'cog', 3, { hp: 230, damage: 90, hit: 1.0, speed: MEDIUM, range: 6, radius: 0.4, mass: 2, targets: 'air', ranged: true }),
  troop('cinder-hound', 'Cinder Hound', 'cinder', 4, { hp: 600, damage: 125, hit: 1.3, speed: FAST, range: MELEE, radius: 0.5, mass: 4, targets: 'buildings', traits: { leap: true } }),
  troop('pyre-mage', 'Pyre Mage', 'cinder', 4, { hp: 330, damage: 95, hit: 1.4, speed: MEDIUM, range: 5.5, radius: 0.45, mass: 3, ranged: true, splash: 1 }),
  troop('stag-rider', 'Stag Rider', 'thorn', 4, { hp: 520, damage: 160, hit: 1.2, speed: MEDIUM, range: MELEE, radius: 0.6, mass: 5, targets: 'ground', traits: { charge: { distance: 3.5, speedFactor: 2, damageFactor: 2 } } }),
  troop('pikewarden', 'Pikewarden', 'cog', 4, { hp: 540, damage: 120, hit: 1.4, speed: 0.9, range: 2, radius: 0.5, mass: 4, targets: 'ground', traits: { pierce: true } }),
  troop('cogwright', 'Cogwright', 'cog', 4, { hp: 450, damage: 0, hit: 1, speed: SLOW, range: 0, radius: 0.55, mass: 4, traits: { holdGap: 4, spawner: { unit: 'cog-bot', every: 4.5, count: 1, max: 4 } } }),
  troop('rampart-golem', 'Rampart Golem', 'cog', 5, { hp: 1900, damage: 115, hit: 1.5, speed: SLOW, range: MELEE, radius: 0.9, mass: 20, targets: 'buildings', traits: { immovable: true, deathSpawn: { unit: 'rubble', count: 2 } } }),
  troop('tideshell-guardian', 'Tideshell Guardian', 'brook', 5, { hp: 900, damage: 95, hit: 1.3, speed: MEDIUM, range: MELEE, radius: 0.6, mass: 8, targets: 'ground', traits: { shield: { amount: 450, regrowAfter: 5 } } }),
  troop('hexweaver', 'Hexweaver', 'brook', 5, { hp: 380, damage: 70, hit: 1.1, speed: MEDIUM, range: 5.5, radius: 0.45, mass: 3, ranged: true, traits: { hex: { perStack: 0.1, max: 5, seconds: 3 } } }),
  troop('magma-brute', 'Magma Brute', 'cinder', 7, { hp: 2300, damage: 170, hit: 1.6, speed: SLOW, range: MELEE, radius: 1, mass: 25, targets: 'ground', splash: 1, traits: { immovable: true, deathPool: { seconds: 3, dps: 35, radius: 1.5 } } }),
  building('bolt-tower', 'Bolt Tower', 'cog', 3, { hp: 640, damage: 55, hit: 0.8, range: 6, traits: { immovable: true, lifetime: 40 } }),
  building('rootspout', 'Rootspout', 'thorn', 4, { hp: 720, damage: 0, hit: 1, range: 0, traits: { immovable: true, lifetime: 40, spawner: { unit: 'sapling', every: 5, count: 2, max: 99 } } }),
  building('ballista-nest', 'Ballista Nest', 'cog', 5, { hp: 820, damage: 165, hit: 2.0, range: 9.5, targets: 'ground', traits: { immovable: true, lifetime: 30 } }),
  spell('static', 'Static', 'brook', 2, { radius: 2.5, damage: 90, stun: 0.5 }),
  spell('rime', 'Rime', 'brook', 2, { radius: 3, damage: 60, slow: { factor: 0.6, seconds: 4 } }),
  spell('surge', 'Surge', 'brook', 3, { radius: 3, damage: 120, push: 3 }),
  spell('verdant-mend', 'Verdant Mend', 'thorn', 3, { radius: 3, damage: 0, heal: { amount: 260, seconds: 3 } }),
  spell('flare', 'Flare', 'cinder', 4, { radius: 2.5, damage: 330 }),
]);

// Units that are not cards: made by Cogwright, Rootspout and the Rampart Golem's death.
export const TOKENS = Object.freeze([
  troop('cog-bot', 'Cog Bot', 'cog', 0, { hp: 70, damage: 40, hit: 1, speed: FAST, range: MELEE, radius: 0.3, mass: 1, targets: 'ground' }),
  troop('sapling', 'Sapling', 'thorn', 0, { hp: 60, damage: 35, hit: 1, speed: 1.2, range: MELEE, radius: 0.3, mass: 1, targets: 'ground' }),
  troop('rubble', 'Rubble', 'cog', 0, { hp: 200, damage: 40, hit: 1.2, speed: MEDIUM, range: MELEE, radius: 0.4, mass: 2, targets: 'ground' }),
]);

const BY_ID = new Map([...CARDS, ...TOKENS].map((card) => [card.id, card]));

export function cardById(id) {
  return BY_ID.get(id);
}

export const CARD_IDS = Object.freeze(CARDS.map((card) => card.id));

// One starter deck per faction, 8 distinct cards each.
export const PRESET_DECKS = Object.freeze({
  cinder: ['ember-wisp', 'powder-cart', 'cinder-hound', 'pyre-mage', 'magma-brute', 'flare', 'static', 'bolt-tower'],
  brook: ['brook-sprite', 'kestrel', 'tideshell-guardian', 'hexweaver', 'rime', 'surge', 'thistle-pups', 'ballista-nest'],
  thorn: ['thistle-pups', 'moth-swarm', 'bramble-knight', 'stag-rider', 'rootspout', 'verdant-mend', 'brook-sprite', 'rime'],
  cog: ['powder-cart', 'kestrel', 'pikewarden', 'cogwright', 'rampart-golem', 'bolt-tower', 'ballista-nest', 'static'],
});

export const DECK_SIZE = 8;

// A deck is valid when it is 8 distinct known cards.
export function isValidDeck(ids) {
  return Array.isArray(ids) && ids.length === DECK_SIZE && new Set(ids).size === DECK_SIZE && ids.every((id) => CARD_IDS.includes(id));
}
