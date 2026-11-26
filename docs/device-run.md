# Device runs still to do

## fps-rebuild

1. Start the server on a laptop or the Termux phone. Connect an iPad host, one
   iPhone, and one Android phone to the same Wi-Fi or hotspot. Open `/host` on the
   iPad and `/` on both phones using the server's LAN address. If using HTTPS,
   accept the certificate warning on each device.
2. On the iPad, choose **Breakwater** and **Play**. Join both phones to the room,
   choose teams, and tap **Ready** on each. Check both players appear in the host
   setup panel.
3. Start the match on the iPad. On the default **Breakwater Port** map, check that
   the host shows two distinct, live first-person views at once, with a weapon and
   readable HUD in each; neither view should be blank or stuck on setup.
4. On the iPhone, move, aim, and fire at the Android player's character. Then swap
   roles. Check that the other player's movement appears in the opposite view and
   that firing updates damage, the score/feed, and respawns.
5. Lock and unlock each phone once during the match. Check that the host keeps the
   match running, the phone reconnects within its grace period, and its controls
   work again. Look for stale or duplicated player views.
6. Observe the iPad host's rendering during play with two phones: note any visible
   stutter, blank frames, overheating, or unreadable split-screen text. Breakwater
   has no selectable graphics-quality setting.
7. Report which phones and host were used, whether both players could play and
   reconnect, and any visual or performance problems. If something looks broken,
   note the exact step and capture a screenshot or short recording.
