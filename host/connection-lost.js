// The "lost connection to the server" overlay on the host, drawn over whichever scene is running.
// Used by the scenes' handleConnectionLost() (called by host/room.js when the socket closes).

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

// The room is gone with the socket (the server deletes it when the host leaves), so only a reload helps.
export function drawConnectionLost(scene) {
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0);
  scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Lost connection to the server.\nReload this page.', {
      fontFamily: 'sans-serif',
      color: '#ffffff',
      fontSize: '56px',
      align: 'center',
    })
    .setOrigin(0.5);
}
