# Device runs still to do

## Ready shows your controls

Server with the cert (`CERT_PATH=certs/cert.pem KEY_PATH=certs/key.pem npm start`), the iPad as host, an iPhone and an Android phone. After pulling, reload every phone: they keep the old controller code otherwise.

1. **Ready goes to the controls** (Kartwheel, on both phones). The line above Ready reads "Ready shows your controls. Turn your phone sideways." Press Ready: the phone shows the race controls you picked, with your chip, a green ✓ Ready, "Waiting for the race to start" and Back to setup in the middle column. Everything fits the middle column on the iPhone, held sideways, with a portrait page (rotation lock on) and a landscape one.
2. **The controls stay still.** On the waiting screen press Go, Brake, Drift and Item, and put a thumb on the steer area: nothing lights up, no stick ring appears, and the kart on the iPad stays put. With Tilt, the iPhone asked for motion access at Ready; the wheel in the middle column turns as you turn the phone, and Recenter works.
3. **Back to setup.** One tap brings the choices back and the iPad's row loses its Ready tick. Change something (Auto-accelerate, Left-handed), press Ready again: the controls show the new layout.
4. **The race starts.** With both phones waiting, Start race on the iPad: Ready and Back to setup give way to the place and lap; the countdown and GO work as before, and the buttons drive.
5. **Tilt refused.** On an iPhone whose motion access is denied (Settings, or a fresh site), press Ready with Tilt: the waiting screen switches to the stick's layout. Note whether that is clear enough without the note, which stays on the setup screen ("Tilt is not available: permission denied. Using the stick.").
6. **Kartwheel Mini** (the 2D race): the same, on both phones.
7. Anything that looks broken or reads wrong: a screenshot and a line on what you did.
