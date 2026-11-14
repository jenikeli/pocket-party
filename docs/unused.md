# Unused parts of the codebase

Code, assets and tools that the game itself does not use, kept on purpose. Each entry lists what to delete, so a
cleanup is quick when it is wanted. Add an entry whenever something is kept but unused; remove it once it is
deleted or used again. Last checked 2026-11-14 (end of M10b).

## Deleted

- **The Blender pipeline** (M7d4c2's spike: `tools/blender.js` and its Python scripts, the Blender palm
  `assets/models/palm.glb`, its kit-shots pieces, the vendored `GLTFLoader.js` and `SkeletonUtils.js`, the
  `npm run blender` command), deleted on 2026-11-06 at the user's request: every look is built in JS. Blender, Blender
  Lab's MCP server and its add-on were removed from the dev box too. Recoverable from git (the commit before
  "blender removed").
- **The Blender build of Blaze** (M7d5) and its kart, on the branch `worktree-agent-ac20ede945a7b4b57`, was deleted on
  2026-11-04 without merging, since the JS karts were chosen. Its last commit, `94726dd`, can be recovered from the
  reflog for about 90 days (`git branch blender-blaze 94726dd`).

## Small things in the code

- `drawCloseButton` in `host/buttons.js` (a Phaser canvas button, confirmed by colour): only the input lab's
  player card uses it (`host/games/input-lab/player-card.js`). If the input lab's card moves to HTML, delete the
  file and use `shared/confirm-click.js`.
- `isDone()` in the game module interface: all three games return false since M10b (the shell's back arrow is
  the one way out), and `host/game-runner.js` still asks every frame. To delete: the call in `game-runner.js`,
  the three games' functions, the entry in `plan.md`'s interface.
- `test-results/reference/m10b/mockup.html` (ignored by git): the mockup M10b was built from. Delete it once
  the device run is done.
- `test-results/reference/m10/` (ignored by git): the chosen design's pictures and prototype page, used by M10's
  tasks. Delete the folder once the device run is done.

- `isOnRoad` in `host/games/kart-2d/track.js`: used only by its unit test (`test/unit/kart-track.test.js`); the
  2D race's rules use `wallContact` and `lapPosition`.
- About 30 constants and functions are exported but used only inside their own file (for example `GRAVITY` in
  `kart-physics.js`). They are not dead code; the `export` is
  just unneeded. Not worth a change on its own.
- About 45 exports are used only by tests (constants such as `SLIPSTREAM_SECONDS`, `describeResultRow` and `tuningValueText` of the 3D race's panels).
  That is expected: tests read the same numbers as the code.

How these were found: a scan of every `export` in `host/`, `controller/`, `shared/`, `server/` and `tools/`
for its name in the other files (tests counted apart), and a check that every vendored file is imported by
something.
