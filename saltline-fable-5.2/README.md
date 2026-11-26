# Saltline — Fable 5.2 FPS

A small browser first-person shooter: one level in a rainy container port. Cut three uplink relays while drones ("Gulls") and robot dogs ("Hounds") hunt you.
<img width="1685" height="906" alt="image" src="https://github.com/user-attachments/assets/8dd32149-90f4-4d69-a573-4411a49a9ba9" />


## Demo
https://realcodebear.github.io/saltline-fable-5.2/

## Where it comes from

- Built by **Claude Fable 5.2**. The run was set up by Felix Rieseberg (Anthropic) and shared on X on 2026-11-09:
  https://x.com/felixrieseberg/status/2119925633564463609
- Original playable artifact: https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp
- Per his post: one prompt, no human feedback, about 8 hours, about 2.7M output and 445M input tokens (heavily cached), about $550 at API pricing. Models, sounds and textures are all made in code. These numbers are his own and not checked here.

All credit for the game goes to its original author. This repo is a mirror so people can run it locally. If you are the author and want it taken down, open an issue.

## What changed from the artifact

Nothing in the game code. The claude.ai frame-runtime scripts were removed from `<head>`, and a doctype, charset and viewport tag were added so the file runs as a plain web page.

## Pocket Party's independent multiplayer shooter

The multiplayer game is **Breakwater**, a separate project-authored shooter. It does
not load or embed this single-player page. To play Breakwater, start the Pocket Party
server from the root of the `pocket-party` repository:

```sh
npm start
```

Use the LAN address printed by the server and open `<LAN-address>/host` on the host
display. Choose **Breakwater** and **Play**. Connect phones to the same Wi-Fi, scan
the join QR code, choose a team and tap **Ready** on each phone. When everyone is
ready, select **Start match** on the host. The host renders the project-built map and
one first-person view per connected player.

See the [full multiplayer procedure](../FPS-MULTIPLAYER-PROCEDURE.md) for phone
controls and troubleshooting.

## Run the original solo demo

This standalone command runs the original single-player page only; it does not create
a Pocket Party room or enable phone multiplayer.

```sh
python3 -m http.server 8731
```

Then open http://localhost:8731 and click the page to capture the mouse and start the sound.

The whole game is one file, `index.html` (~1.4 MB). It bundles three.js and loads fonts from Google Fonts. There are no other outside assets.
