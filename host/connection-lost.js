// The overlay drawn over whichever scene is running once the host's socket has closed: "Room closed" after
// the host pressed Close room, "Lost connection" otherwise. Used by the scenes' handleConnectionLost().

import { drawButton } from '/host/buttons.js';

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

// The room is gone with the socket (the server deletes it when the host leaves), so a new room means reloading.
export function drawConnectionLost(scene, closedByHost) {
  const message = closedByHost ? 'Room closed.' : 'Lost connection to the server.';
  // Covers the whole screen and takes the clicks, so nothing underneath can be pressed any more.
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0).setInteractive();
  drawButton(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, {
    width: 460,
    height: 90,
    label: 'Open a new room',
    onClick: () => location.reload(),
  });
  scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, message, {
      fontFamily: 'sans-serif',
      color: '#ffffff',
      fontSize: '56px',
      align: 'center',
    })
    .setOrigin(0.5);
}
