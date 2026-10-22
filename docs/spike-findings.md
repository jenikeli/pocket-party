# Spike findings (measured with spike.js)

Setup: server on a spare Android phone in Termux (Node v26.3.1), hotspot interface `swlan0` at 10.60.55.71. Clients joined that hotspot: an Android phone running Chrome, and an iPad running Safari. Single runs on one device of each kind, so treat as indicative, not final. iPhone and iPad Chrome were tried later (see section 2).

## 1. Plain HTTP: tilt and Wake Lock are unavailable

On both Chrome (Android) and Safari (iPad), over `http://`:
- `isSecureContext` = false
- `window.DeviceOrientationEvent` does not exist at all (not just "no events")
- `navigator.wakeLock` does not exist

So tilt and Wake Lock require HTTPS on both platforms. This matches MDN's secure-context notes.

## 2. HTTPS with a self-signed cert (click-through warning) works

Cert: self-signed, with the hotspot IP (10.60.55.71) in the subject alternative name. Accepted by clicking through the browser warning.

On both Android Chrome and iPad Safari:
- `isSecureContext` = true
- `wss://` WebSocket opened normally after accepting the page
- Wake Lock request: granted
- Tilt permission: granted (Android has the permission API available in a secure context)
- iPad tilt rate: about 59 Hz, values changing as the iPad was moved
- Android tilt: the first reading showed 2 Hz with the phone apparently still (beta 2, gamma 0). Re-tested while moving the phone: about 60 Hz (user-reported). The low first reading is consistent with Chrome only firing events when the orientation changes, but that was not confirmed.

iPhone and iPad Chrome (user-reported, details not itemised): iPad Chrome works. With the first cert (only `subjectAltName` added), Safari on the iPhone could not reach the page (the exact error was not captured), while Chrome on the iPhone worked and iPad Safari accepted it. Regenerating the cert with `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment` added fixed it: Safari now works on both iPhone and iPad, and tilt runs at about 60 Hz on both (user-reported). Only those two extensions changed, so one of them was the cause; which one was not isolated. Use this command for every cert:

```
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 30 -subj "/CN=10.60.55.71" -addext "subjectAltName=IP:10.60.55.71" -addext "extendedKeyUsage=serverAuth" -addext "keyUsage=digitalSignature,keyEncipherment"
```

A cert only matches the IPs listed in `subjectAltName`, so it must be regenerated if the hotspot IP changes. Wake Lock grant on the iPhone was not explicitly reported. Chrome on iOS uses Apple's WebKit engine, so the sensor APIs should behave like Safari's once the page loads. Not yet known: how often the browser warning reappears for each player (per visit, per day?). The cost of this option is that every player must tap through a certificate warning. Options A (local root CA) and B (real domain) in plan.md M2 would remove the warning but need more setup.

## 3. Latency (WebSocket ping/pong round trip, through the Termux hotspot)

| Device | Protocol | avg ms | min | max | samples |
|---|---|---|---|---|---|
| Android Chrome | HTTP | 45 | 15 | 63 | 11 |
| iPad Safari | HTTP | 27 | 9 | 72 | 8 |
| Android Chrome | HTTPS | 40 | 17 | 74 | 30 |
| iPad Safari | HTTPS | 27 | 11 | 55 | 30 |

Round trip, so one way is roughly half. Jitter of tens of ms is visible. Not yet tested with several devices sending at once.

## 4. WebSocket behaviour when the page is hidden

Observed from the server log (the spike does not record whether "hidden" meant screen lock, app switch, or tab switch, so the cause is unknown):
- Android: hidden at 22:51:57, server saw the socket die at 22:52:11 (14 s later, code 1006, no clean close).
- iPad: hidden at 22:53:21, socket closed at 22:53:51 (30 s later, code 1006).
- Android (second attempt): hidden at 22:53:47, socket stayed open until the page became visible again at 22:55:17 (about 90 s), then closed with 1001 and the page reconnected within about 1 s on its own.
- After resume, `ws.readyState` still read 1 (open) even though the socket was closing. Do not trust `readyState` on resume.
- Code 1006 means the connection ended without a close frame (OS suspended or killed it); 1001 means the page went away cleanly (reload, navigation, or close).
- Survival time is inconsistent (14 s to 90+ s on the same phone). Design for drops at any time.

## 5. Hotspot client limit

The Termux phone's hotspot settings allow at most 10 connected devices (user-checked in the settings, not yet filled to the limit). The host display counts as one when it joins the hotspot, so at most 9 phones can play. This sets `MAX_PLAYERS` in `shared/protocol.js`.

## 6. Not yet tested

- Lock behaviour and Wake Lock grant on iPhone (tilt rate is done: about 60 Hz)
- Actually filling the hotspot to 10 devices (the most simultaneous clients seen was 2)
- Hotspot auto-off when idle, and the Termux screen-off soak test
- Latency with nine devices sending at 30-60 Hz
- How often the certificate warning reappears
