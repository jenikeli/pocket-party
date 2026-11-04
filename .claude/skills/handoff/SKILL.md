---
name: handoff
description: Hand off a finished pocket-party milestone - tests, plan.md and docs/history.md updated, the device-run procedure, commits, the walkthrough, and a check on whether the workflow should change. Use at the end of every milestone chat, after the work is merged and tested.
---

# Handing off a milestone

The next chat starts with no memory of this one, so everything it needs must be in the repo, committed.

## 1. Tests

- `npm test` passes, and the browser test files picked by `CLAUDE.md`'s Testing map (all of them only if shared code changed) pass, run one at a time.
- Note which browser files ran and why, and any test changed on purpose (only when the intended behaviour changed).

## 2. The docs

1. Tick the milestone's finished checkboxes in `plan.md`.
2. Move the milestone's whole section (checklist, "done when", and detailed notes on files, decisions, deviations and tests changed on purpose) to the end of `docs/history.md`.
3. In `plan.md`, leave a summary of a few bullets under the milestone's heading ending in "(built, device run pending)" (or "(done)" if it needs no device run): what exists now, and only what later milestones must know.
4. Update `plan.md`'s design sections if a decision changed them.
5. Update `CLAUDE.md`'s Commands section for any new or changed command, and its Testing map for any new browser test file.
6. For 3D work, the milestone's section in `docs/3d-findings.md`: what was built, what was measured without a device, and the device-run procedure (the `device-run` skill).
7. `docs/unused.md`: add anything the milestone left unused but kept (a tool, an asset, a spike's pieces), with what to delete; remove entries for what it deleted or put back to use.

## 3. Commit

- Commit the handoff (`<milestone id> handoff`, ending with the attribution lines for commits). Check `git status` first: nothing secret (certs, keys, `.env`), nothing left over (scratch files belong in the session's scratchpad or `test-results/`, which is ignored).
- Never push: the user reviews the commits and pushes.

## 4. Tell the user

A short message with:
- **What was built:** the files added or changed and what each does, and how one message (or one frame, for drawing work) flows through the system end to end.
- **Decisions** worth knowing, with the mechanism briefly explained (`CLAUDE.md`: the user is learning).
- **Tests:** what ran and the result.
- **Device run:** the steps in short, with every **Tune:** step listed.
- **Commits:** the list (`git log --oneline` since the milestone started).
- **The workflow:** ask whether anything in how this milestone was worked should change (the planning, the split into tasks, the models, the review sheets, the commits, this handoff). Whatever the user changes is edited into the skills (`.claude/skills/`), the `implementer` agent (`.claude/agents/implementer.md`) or `CLAUDE.md` in the same chat, and committed: they are the workflow's single source.
