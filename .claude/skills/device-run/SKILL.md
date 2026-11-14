---
name: device-run
description: Write the device-run procedure for a pocket-party milestone, the steps the user follows on real devices (iPad host, phones), and its summary in the chat. Use while handing off any milestone that needs a check on real devices.
---

# Writing a device-run procedure

The user tests each milestone on real devices; automation cannot. The procedure goes in `docs/device-run.md` (made when a run is pending, holding only runs still to do, under a heading with the milestone id), and a short version in the chat's handoff.

## What goes in

- Only what automation cannot check (`CLAUDE.md`, "Still needs a real device"): real touch, real Safari, HTTPS and certificates on the LAN, sensors, network drops, the iPad's frame rates and look, Wake Lock, Termux. Do not ask the user to repeat what the browser tests already prove.
- Frame rates with several views (3D race): use the setup screen's **Watch, no phones: 1 2 3 4** (self-driving karts with a view each, fps in the Tuning readout), not four phones or connections. Phones only where the step is about the phones themselves.
- Numbered steps, each one thing to do and what to look for. Name the device, the course, the quality level and the number of phones.
- Where to find each thing: the panel and group of every slider or switch, the place on the course (by distance along the lap, `s`, and what is there to recognise it).
- What to report back: numbers to note (the Measure report to Copy, fps from the readout, how long the course takes to appear) and questions to answer (which looks closer to MK8DX).
- A last step for anything that looks broken.

## Tuning steps

Mark every step where the user should tune something with a bold **Tune:** at its start, naming:
- the slider or setting, and where it is (panel and group),
- its range and its current default,
- what to look for while moving it.

For example: "**Tune:** Look group, *Light from the course, strength* (0-3, default 0.7): the shade side of the walls and the karts' shine; note the value that looks closest to MK8DX."

In the chat summary, list the **Tune:** steps so the user can find them at a glance.

## After the run

The tuned values become the defaults in code. What the run found goes where it belongs by topic: measurements and pitfalls into `docs/3d-findings.md`, changed decisions and open issues into `plan.md`. Then the run's section is removed from `docs/device-run.md` (the file is deleted when it is empty). Steps that simply passed are not recorded.
