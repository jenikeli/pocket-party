---
name: milestone-plan
description: Plan a pocket-party milestone and build it with parallel implementer subagents. Use at the start of every milestone chat, after reading CLAUDE.md and the milestone in plan.md, and whenever a milestone's work is split into tasks.
---

# Planning a milestone and building it in parallel

The main session (Opus) plans, integrates and hands off; `implementer` subagents (`.claude/agents/implementer.md`) build the planned tasks at the same time, each in its own git worktree.

## 1. Plan

1. Read the milestone in `plan.md`, the notes it points to, and the code it touches. Look up only what the plan needs.
2. If the milestone is too big for one chat, propose a split (`CLAUDE.md`: one milestone per chat) and stop.
3. Split the milestone into tasks. For each task write:
   - **Goal:** what it builds, in a sentence or two.
   - **Files it owns:** every file it may create or edit. No file belongs to two tasks. Shared files (for example `tuning.js`, `scenery.js`, `plan.md`) belong to one task, or to the main session, which edits them itself before or after the parallel work.
   - **Interfaces:** what it provides to or takes from other tasks (function names, arguments, return shapes, message types), fixed now, so tasks can be built against each other at the same time.
   - **Tests:** the unit tests it adds or changes. Browser tests are the main session's.
   - **Model:** `sonnet` for well-specified code (the usual), `haiku` for mechanical work (renames, moving text, updating lists), `opus` only where building needs judgement the plan cannot give. Fable is not available.
   - **Depends on:** a task that must be merged first, if any. Prefer tasks that do not depend on each other.
4. Keep work in the main session when it is small (a few lines), touches shared files, or needs a decision while building. Spawning an agent costs a cold start; it pays for work of about half an hour or more.
5. Show the plan to the user (the tasks in a short table: goal, files, model) with any decisions that are theirs, and wait for one approval. After it, stop again only for decisions that are the user's.

## 2. Build in parallel

- Spawn one `implementer` per task with the Agent tool: `subagent_type: "implementer"`, `isolation: "worktree"`, `model` as planned, in the background. At most 3 at a time: the dev box has 4 threads and 7 GB, and every agent's commands run on it (kit-shots also lets only 2 runs draw at once across all worktrees, `tools/machine-slots.js`). Ten at once (tried in M7d4c3) used up the user's 5-hour usage limit within minutes and stopped every agent mid-task.
- Give each the whole task as written in the plan (goal, files, interfaces, tests) plus the milestone id for the commit message. It starts with no context: say what it needs to know.
- While they build, do the main session's own share (shared files, small edits) in the main checkout, without touching the files a task owns.

## 3. Integrate

For each finished task, in the order of its dependencies:
1. Read its report and its diff (`git log -p <branch>` against `main`). Check it against `CLAUDE.md`'s Readability rules and the plan's interfaces; fix or send it back with SendMessage if it strayed.
2. Merge it into `main` as one commit: `git merge --squash <branch>`, then commit with the task's message (the repo's style: milestone id, then what it does, lowercase; ending with the attribution lines for commits). Then remove its worktree and branch.
3. Run `npm test` after each merge.

Then run the browser tests the change calls for, picked by `CLAUDE.md`'s Testing map, one file at a time (`--test-concurrency=1`), in the background. Only the main session runs browser tests. Fix what breaks (the code, not the tests, unless the behaviour changed on purpose) and commit each fix.

## 4. Review and hand off

- For changes to the 3D look: picture sheets of the changed pieces for the user to review before the device run, made with `npm run kit-shots` (`--name before` at the start of the part, before anything changes, and `--name after` at the end; new pieces go in `host/kit-shots/pieces.js`).
- Then the `handoff` skill.

## Queue (several milestones in one chat)

When the user asks for several similar milestones in one chat (CLAUDE.md), plan them all at once as a queue:
- Write every task's spec, with the rules shared by all, into `docs/queue.md`, with a status table (queued, building, merged, dropped). Spawn each implementer with only its task letter and the file's path, so the spawn costs little of the main session's context; the file also keeps the queue's state if the conversation is summarized.
- First a prep task where needed, so later tasks each own their own files (for the M7d4 look: each piece makes its own materials). Tasks that share a file never run at the same time.
- At most 3 implementers at once; when one finishes, review and merge it, then spawn the next queued task whose dependencies are merged.
- Implementers judge their own work (kit-shots before and after) and report briefly; the main session reads the report, the diff's size and the after sheet, spot-checks the code, merges, and sends the user the after sheet (SendUserFile) for feedback.
- Browser tests when no implementer is drawing (they time out beside kit-shots runs); the census at the end of each part; one handoff and one device run at the end, after which `docs/queue.md` is folded into `docs/history.md` and deleted.

## Commits

- Commit; never push (the user pushes). Before every commit: `npm test` passes, and `git status` shows nothing secret (certs, keys, `.env`) and nothing that is not the task's.
- One commit per task, one per integration fix, one for the handoff.
