---
name: handoff
description: Hand off a finished pocket-party milestone - tests, plan.md and the docs updated by topic, the device-run procedure, commits, the walkthrough, and a check on whether the workflow should change. Use at the end of every milestone chat, after the work is merged and tested.
---

# Handing off a milestone

The next chat starts with no memory of this one, so everything it needs must be in the repo, committed.

## 1. Tests

- `npm test` passes, and the browser test files picked by `CLAUDE.md`'s Testing map (all of them only if shared code changed) pass, run one at a time.
- Note which browser files ran and why, and any test changed on purpose (only when the intended behaviour changed).

## 2. The docs

The docs are organised by topic and kept short (`CLAUDE.md`): they hold what the code and the commit messages do not say. There is no per-milestone history; the commits carry the milestone id. Write what the next chat needs, not what happened.

1. `plan.md`: update the section the work changed (a decision, a design section, the game module interface, "Where things live" for new files or patterns, "Things to know" for a pitfall that cost time, "Open issues", "Later ideas"). Edit in place; do not add a milestone section.
2. `docs/3d-findings.md` (3D work): new measurements and pitfalls under their topic, replacing numbers they supersede.
3. `docs/kart-reference.md`: only new research about the reference game itself.
4. `docs/device-run.md`: the device-run procedure, if the work needs one (the `device-run` skill). It holds only runs still to do.
5. `CLAUDE.md`: Commands for any new or changed command, the Testing map for any new browser test file.
6. `plan.md`'s "Open issues": note anything left unused but kept, with what to delete; remove entries for what was deleted or put back to use.
7. In a queue: move the lasting decisions from `docs/queue.md` into the docs above, then delete it.

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
