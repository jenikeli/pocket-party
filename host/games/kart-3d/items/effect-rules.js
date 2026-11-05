// The item of a kart's running effect (magnet or push; `item.effect` is { item, left }, set by kart-effect.js).
// Used by field-forces.js. A kart with no `item` at all (the physics tests' karts) has no effect.

// The item of the kart's running effect, or null.
export function runningEffect(kart) {
  return kart.item?.effect?.item ?? null;
}
