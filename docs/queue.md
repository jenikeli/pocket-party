# M7d5 queue: the other 11 drivers

The user approved Blaze, built in JS (2026-11-02; the Blender build was compared and dropped). The kart, its
wheels, anti-gravity and Blaze are merged (`eb515dd`). Each task below adds one driver, built to Blaze's standard.
At most 3 build at once. This file holds the queue's state; it is folded into `docs/history.md` at the handoff
and deleted.

## Status

| Task | Driver | Slot | Status |
|---|---|---|---|
| A | Pip | 1 | building |
| B | Fern | 2 | merged |
| C | Bolt | 3 | merged |
| D | Grimble | 4 | building |
| E | Rusty | 5 | building |
| F | Inky | 6 | queued |
| G | Mochi | 7 | queued |
| H | Sprout | 8 | queued |
| I | Bruno | 9 | queued |
| J | Rhino | 10 | queued |
| K | Wisp | 11 | queued |

## Rules for every task

- **Read first:** `CLAUDE.md` (Readability rules) and these files:
  - `host/games/kart-3d/karts/kart-designs.js`: the design contract.
  - `host/games/kart-3d/karts/drivers/blaze.js`: the approved driver; copy its structure.
  - `host/games/kart-3d/karts/driver-parts.js` (head, onHead, headDirection, body, arm, leg, scarf), `driver-face.js` (eyes, eyebrows, nose, cheeks, smile) and `part-shapes.js` (partList, ball, limb, painted, along, facing, emblemDisc, the material kinds).
- **Files you own:**
  - `host/games/kart-3d/karts/drivers/<id>.js`, which exports the design as Blaze's file does. If it grows past about 200 lines, split the driver's own parts into `drivers/<id>-parts.js`.
  - One import and one entry in `host/games/kart-3d/karts/kart-designs.js`'s `KART_DESIGNS`, in slot order. Other tasks edit that list at the same time, so change nothing else in it; the main session settles the one-line merge.
  - Nothing else. Do not edit `driver-parts.js`, `driver-face.js`, `part-shapes.js` or any kart file: two other drivers are being built at the same time.
  - A part only your character has (a beak, ears, a tail, tentacles, a beard) is built in your own file. If a shared function needs an option it lacks, build your own version in your file and say so in your report; the main session may fold repeats into the shared files later.
- **The design:**
  - `slot` as in the table.
  - `palette.main` close to the slot's lobby colour, so the player sees their colour on their kart: `host/roster.js`'s `PLAYER_COLORS[slot]` for slots 0 to 8, the colour given in the task for slots 9 to 11.
  - `second` and `third` from the character's own colours, as Blaze's are cream and charcoal.
  - `drawEmblem` draws the character's own simple emblem on a disc.
- **The standard:** Blaze's sheet `test-results/reference/m7d5/blaze-approved.png` and his close-up `blaze-approved-close.png`, both in the main checkout `/home/ruijia/projects/pocket-party/`, not your worktree. The style references are the other pictures in that folder.
  - Faces in the references' style, not any one character's, and never a horror look. Use the shared eyes, brows, nose and smile, sized for the character: large tall eyes set close, mostly iris, with highlights; soft rounded shapes; a friendly open smile. An animal gets its own muzzle, beak or snout in that same soft style.
  - The head is about as wide as the shoulders and sits down on them, like Blaze's. The driver sits in the seat with both hands on the wheel and both feet in the nose, using `seat`: an animal's arms and legs still reach the seat's hands and feet.
  - Smooth big shapes over many small ones. Every part must read from the chase camera (the `above` views) as well as up close: something seen from behind should say who it is.
  - The character should look different from the others at a glance, by its silhouette as well as its colour.
- **A kind you do not use** (a robot or a frog with nothing in skin) is built empty and draws nothing (fixed on main after Fern; it used to fail).
- **Budgets:** the driver at most about 10,000 triangles (Blaze's is 9,900; the kart and wheels take 15,000 of the 25,000), in the existing material kinds only (no new draw calls). `test/unit/kart-3d-kart-designs.test.js` checks the budget, the colours, the decal and the height for every design in `KART_DESIGNS`. It must pass with yours in the list. It needs no new test unless your driver has its own logic.
- **Check your work:** `npm test`, then kit-shots. The pieces are made for every design in `KART_DESIGNS`, so yours exist once your entry is in the list.
  - Run `npm run kit-shots -- --name <id> kart-<id> kart-<id>-side kart-<id>-close kart-blaze`.
  - Look at the sheet `test-results/review/<id>.png` and the shots in `test-results/review/shots/`.
  - Improve until the driver stands beside Blaze at his standard, or for at most 4 rounds.
  - Draw only through kit-shots: it shares 2 machine-wide slots (`tools/machine-slots.js`). Do not run the browser tests.
- **Commit** on your branch: `m7d5 <id>, the <slot colour> driver: <what they are>`, lower case, with the attribution lines your instructions give.
- **Report briefly:** what you built, the triangle count, the sheet's path, anything you could not get right, and any shared part you made your own version of.

## Tasks

Each builds `drivers/<id>.js` and adds one line to the list, as in the rules. The details are suggestions to make the character read at a glance; change them if something else looks better, and say what changed.

### A: Pip (slot 1, blue)
A round little penguin in a knitted pom-pom beanie (blue with a white band and a big white pom-pom). Black-blue back and head, a white face mask and belly, a small orange beak (soft, rounded, the smile under or within it), orange webbed feet in the nose. Short flipper arms in mittens on the wheel. A small striped scarf. Emblem: a snowflake.

### B: Fern (slot 2, green)
A cheerful frog in a racing vest. A wide flattened head with big eyes on top of it bulging up, a wide smile across the face, no nose, pale yellow throat and belly. A cream racing vest with a green stripe over a darker green body. Long legs folded up into the nose with webbed feet; gloves. Emblem: a lily pad with a flower.

### C: Bolt (slot 3, yellow)
A friendly tin robot. A round glass dome head (glossy, see-through looking: a pale cyan glass over a dark face plate) with two big round glowing eyes and a smile drawn on the plate, a little antenna with a red ball on top. A boxy rounded yellow tin body with rivets and a dial on its chest, jointed ribbed arms (`limb` segments) and metal mitt hands, boots. Use the `metal` kind for its chrome parts. Emblem: a lightning bolt.

### D: Grimble (slot 4, purple)
A garden gnome. A tall pointed floppy purple hat that bends over at its tip (from behind, the hat is what says who it is), a big fluffy white beard in smooth clumps covering the chin and chest, a big round nose, rosy cheeks, eyes peeking under bushy white brows. A blue-grey tunic with a brown belt and gold buckle, brown boots. Emblem: a mushroom.

### E: Rusty (slot 5, orange)
A fox in a bandana. Orange fur with a white muzzle, chest and cheek ruffs, tall pointed ears with dark tips, a long pointed snout with a black nose ball, a big bushy tail with a white tip curling up behind the seat. A teal or navy neck bandana with white dots, a short brown jacket. Emblem: a fox's face or a paw print.

### F: Inky (slot 6, teal)
An octopus in a sailor cap. A big round soft head (the mantle, teal), large eyes, a small smile, pale spots. A white sailor cap with a navy band sitting on top. Eight tentacles, tapering and curling at the tips with paler undersides: two hold the wheel, two reach the pedals, the others curl over the seat's sides and behind. No body or legs, the tentacles come from under the head. A navy sailor collar round where the neck would be. Emblem: an anchor.

### G: Mochi (slot 7, pink)
A round bunny. White and pink fur, long floppy ears falling down to the shoulders (from behind, the ears say who it is), a big pink bow between them, a small pink nose with a little mouth and a hint of buck teeth, round cheeks. A pastel pink jacket, white mittens, small feet. Emblem: a carrot or a heart.

### H: Sprout (slot 8, lime)
A turnip-headed kid. The head is a round white turnip, pale purple toward its top, with a tuft of big green leaves sprouting from the top, and a face on the turnip (the shared face). Lime overalls over a cream shirt, brown boots, gardening gloves. Emblem: a sprouting seed.

### I: Bruno (slot 9, CPU only, main colour brown `0x8b5a2b`)
A big friendly bear in a red-and-black check shirt (the check drawn in vertex colour bands or small boxes, not a texture). Brown fur, a lighter round muzzle with a black nose ball, round ears. Big and wide in the seat, but still inside the height test's limit. Emblem: a paw print.

### J: Rhino (slot 10, CPU only, main colour steel grey `0x7f8c8d`)
A rhino in a motocross helmet. A grey head with a big horn on the snout and a small one above it, small ears, wrinkles at the brow. An open-face motocross helmet (white with an orange stripe and a peak) with goggles. A padded racing suit in grey and orange, chunky boots. Emblem: a horn or a shield.

### K: Wisp (slot 11, CPU only, main colour lavender white `0xe8e4f4`)
A little ghost with a scarf. A soft round white body that tapers into a wavy tail curling down into the seat, no legs, stubby arms reaching the wheel, big friendly eyes and a small open smile, blush. Pale lavender shading. A long red-orange scarf streaming behind. Emblem: a star or a moon.
