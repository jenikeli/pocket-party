// Spirefall's colour tokens as Phaser numbers (docs/arena-plan.md, section 3.3). Nothing in the arena is coloured
// outside these. Used by the arena drawing, the sprites and the effects.

export const COLORS = Object.freeze({
  ink: 0x1d1b2e,
  night: 0x10131c,
  dawn: 0xffc53d,
  dawnDeep: 0xc98a12,
  dusk: 0x8e6bff,
  duskDeep: 0x5a3fc4,
  meadowLight: 0x5ba55b,
  meadowBase: 0x3f7f4a,
  meadowShade: 0x2c5e38,
  path: 0xd9c08a,
  river: 0x3ba3d9,
  foam: 0xbeebff,
  plank: 0x9b6b3e,
  plankDark: 0x6e4a29,
  cliff: 0x6c5b7b,
  elixir: 0xe24bd0,
  ok: 0x2ecc71,
  danger: 0xe0483a,
  lamp: 0xfff2b8,
});

export const TEAM_COLORS = Object.freeze([COLORS.dawn, COLORS.dusk]);
export const TEAM_DEEP = Object.freeze([COLORS.dawnDeep, COLORS.duskDeep]);
export const TEAM_NAMES = Object.freeze(['Dawn', 'Dusk']);
export const FACTION_COLORS = Object.freeze({ cinder: 0xe8552f, brook: 0x35b6c9, thorn: 0x5fae3b, cog: 0x9aa6b5 });
