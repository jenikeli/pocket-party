# Saltline multiplayer procedure

## Start a room

1. On the host computer, open a terminal in the `pocket-party` folder and run:

   ```sh
   npm start
   ```

2. Keep the terminal open. Find the `Reachable on` address it prints, for example
   `http://192.168.1.245:3000`. Use that LAN address, not `localhost`.
   If port 3000 is already occupied, start the server on another allowed port:

   ```sh
   PORT=3018 npm start
   ```

   Then use the address printed with port `3018`.

3. Connect the host computer and every phone to the same Wi-Fi network. Open
   `http://<LAN-IP>:<PORT>/host` on the host computer.
4. Choose **Saltline**, then **Play**. The host opens a room and shows a QR code.
   When the host page was opened through `localhost`, it now replaces that local-only
   QR/link with a LAN address automatically. If it still shows `localhost`, use the
   `Reachable on` address from the terminal to open `/host`.
5. On each phone, scan the QR code or open the shown LAN address and enter the room
   code. On the Saltline setup screen, choose a team, adjust aim settings if needed,
   then tap **Ready**. Saltline uses the original Terminal map and PAC-9 Longshore.
6. When the host setup panel shows every connected player as **Ready**, select
   **Start match**. Each connected human gets a private split-screen view on the
   host. Bots fill remaining seats according to the selected mode.

## Watch a CPU-only match

1. Start a room as above, then close the join window.
2. Leave all phones disconnected, select a PvP mode (Team Deathmatch, Free For All,
   or Search and Defuse), then choose **Watch bots play** on the host setup panel.
3. The host starts a bot-only match and follows one CPU viewpoint while the bots
   fight. Choose the bot skill before starting if you want to adjust the challenge.
   Relay Recovery requires at least one phone to control the crew.

## Phone controls

- Drag the **Move** pad to walk, run, or sprint.
- Drag **AIM** to look around. Holding and dragging **FIRE** also aims while firing.
- Use **ADS**, **Reload**, **Grenade**, **Jump**, **Crouch**, and **Use**
  for the corresponding actions.
- Open **Settings** on the phone to adjust sensitivity, invert vertical aim, or change
  handedness.

## How input and multiplayer reach the original renderer

1. The phone control module sends movement, look, and button inputs over the room's
   WebSocket connection. Each input is associated with the sending player's room slot
   by the server.
2. The host FPS session applies those inputs to its authoritative match simulation:
   movement, collision, weapons, damage, bots, scoring, and respawns.
3. The host sends each player a private HUD view and sends the current match snapshot
   to the renderer.
4. The renderer calls `window.__POCKET_PARTY__.renderFrame(...)` inside the original
   [`saltline-fable-5.2/index.html`](./saltline-fable-5.2/index.html). That bridge
   applies the host camera and player state, clones character models from the original
   scene for the other players, and renders using the original game's Three.js code.

The original page supplies the graphics; the host simulation and phone controller
provide multiplayer rules and input.

## If a phone cannot join or control the match

- **The link says `localhost`:** phones interpret that as the phone itself. Open the
  host page using the LAN IP printed by `npm start`; do not share the localhost URL.
- **The phone cannot connect:** confirm the phone and host are on the same non-guest
  Wi-Fi network, use the exact port printed by the server, and allow the Node server
  through the host computer's firewall.
- **The phone shows “Could not load the game”:** reload the controller page after
  confirming the host room is still open.
- **The phone remains on setup:** tap **Ready** on that phone; the host can start the
  match only after all joined players are ready.
- **The host has no player view:** join with at least one phone and start the match,
  or use **Watch bots play** to start a bot-only match.
