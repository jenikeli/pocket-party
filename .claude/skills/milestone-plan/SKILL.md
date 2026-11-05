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
4. **Reference pictures for any task that builds a look** (a character, a kart, a prop, a course piece): before spawning, decide whether the spec's words are enough for the builder to match MK8DX's style. If not, find reference pictures online yourself (fan wikis' galleries), save them under `test-results/reference/<milestone>/` (ignored, not committed), and give the builder their paths; or ask the user for pictures when you cannot find good ones. M7d5's first kart, built without pictures, looked nothing like its target until the references were sent.
5. Keep work in the main session when it is small (a few lines), touches shared files, or needs a decision while building. Spawning an agent costs a cold start; it pays for work of about half an hour or more.
6. **Parallel work is for speed, not a rule** (the user, after M7e): split into parallel tasks only where they really are independent and each is worth an agent; one task, or none, is fine. The main aim is that nothing waits on long runs: while browser tests or kit-shots run in the background, keep building (the main session's own share, the next task's review or merge, the docs), and start the next task's agent while the last one's tests run.
7. Show the plan to the user (the tasks in a short table: goal, files, model) with any decisions that are theirs, and wait for one approval. Before it, ask every question you can foresee (rules, numbers, looks, what to do when an old test meets the new behaviour), so the build can run without the user. After it, stop again only for decisions that are the user's.

## 2. Build in parallel

- Spawn one `implementer` per task with the Agent tool: `subagent_type: "implementer"`, `isolation: "worktree"`, `model` as planned, in the background. At most 3 at a time: the dev box has 4 threads and 7 GB, and every agent's commands run on it (kit-shots also lets only 2 runs draw at once across all worktrees, `tools/machine-slots.js`). Ten at once (tried in M7d4c3) used up the user's 5-hour usage limit within minutes and stopped every agent mid-task; six at once (M7d5) queued every kit-shots run and timed several out. Keep to 3 even when asked for more for one batch: the user decided so after M7d5. The 3 counts every subagent running at once, reviewers and browser-test tasks included (confirmed by the user before M8): with 3 implementers building, a finished task's reviewer waits for one of them to finish.
- Give each the whole task as written in the plan (goal, files, interfaces, tests) plus the milestone id for the commit message. It starts with no context: say what it needs to know.
- While they build, do the main session's own share (shared files, small edits) in the main checkout, without touching the files a task owns.

## 3. Integrate

For each finished task, in the order of its dependencies:
1. **Review:** read its report, then spawn a `reviewer` subagent (`.claude/agents/reviewer.md`, read-only, Sonnet) with the task's spec (its letter, in a queue), its branch and the report. The reviewer reads the whole diff against the spec's files and interfaces and `CLAUDE.md`'s rules, and gives a verdict and findings. Read them and the diff's stat (`git diff --stat main...<branch>`); open the code yourself where a finding points, and where the task meets another task's interface. Fix small things yourself after merging, or send the task back to its implementer with SendMessage.
2. Merge it into `main` as one commit: `git merge --squash <branch>`, then commit with the task's message (the repo's style: milestone id, then what it does, lowercase; ending with the attribution lines for commits). Then remove its worktree and branch.
3. Run `npm test` after each merge.

Then run the browser tests the change calls for, picked by `CLAUDE.md`'s Testing map, one file at a time (`--test-concurrency=1`), in the background. Only the main session runs browser tests, except a browser-test task (below). Fix what breaks (the code, not the tests, unless the behaviour changed on purpose) and commit each fix.

**Browser-test tasks** (decided before M8): writing a new browser test file and getting it to pass may be a task of its own, given to an implementer spawned when nothing else builds or draws on the machine. It may run its one file, and no other. The main session still runs every other browser file.

## 4. Review and hand off

- For changes to the 3D look: picture sheets of the changed pieces for the user to review before the device run, made with `npm run kit-shots` (`--name before` at the start of the part, before anything changes, and `--name after` at the end; new pieces go in `host/kit-shots/pieces.js`).
- Then the `handoff` skill.

## Queue (several milestones in one chat)

When the user asks for several similar milestones in one chat (CLAUDE.md), plan them all at once as a queue:
- Write every task's spec, with the rules shared by all, into `docs/queue.md`, with a status table (queued, building, merged, dropped). Spawn each implementer with only its task letter and the file's path, so the spawn costs little of the main session's context; the file also keeps the queue's state if the conversation is summarized.
- First a prep task where needed, so later tasks each own their own files (for the M7d4 look: each piece makes its own materials). Tasks that share a file never run at the same time.
- A rules task may run beside a look task (M8's I beside H) only when they share no files and nothing the rules task decides changes how the look task is defined (the state it reads, the pieces it draws). Where there might be such a dependency, run them in order (the user, after M8).
- At most 3 subagents at once, reviewers included; when an implementer finishes, its reviewer takes its place, then the next queued task whose dependencies are merged.
- Implementers judge their own work (kit-shots before and after) and report; a `reviewer` reads each diff (step 3); the main session reads both and the after sheet, merges, and sends the user the after sheet (SendUserFile) for feedback, or, when the user reviews only at the end (M8), keeps the sheets for the handoff.
- Browser tests when no implementer is drawing (they time out beside kit-shots runs); while they run, only tasks that do not draw build. The census at the end of each part; one handoff and one device run at the end, after which `docs/queue.md` is folded into `docs/history.md` and deleted.

## The main session's context

The main session plans, reviews, merges and hands off a whole milestone, or a whole queue, in one conversation, so it handles its context with care: the aim is that its judgement stays as sharp at the end as at the start, not a line count. (The user, before M8: reports and reviews should be complete; the waste to avoid is raw output.)
- Specs live in the plan's file (`docs/queue.md` in a queue); a spawn names the task rather than repeating it.
- A `reviewer` reads each task's whole diff; the main session reads the findings and opens code where they point.
- Long output goes to a file in the session's scratchpad, and only its summary is read: the test runner's last lines (`ℹ pass`, `ℹ fail`) and the failing tests' lines (`✖`), for `npm test` and for the browser tests, which run in the background.
- A failure whose cause is not plain from its message goes to an implementer as a fix task, with the path of the failing output, rather than being chased through the code in the main session.
- The plan's status is written down at every spawn and merge (the Status table in a queue), so an automatic summary of the conversation loses nothing.

## When the user is away (a queue run to the end)

- Questions that come up are decided by the main session where they are not the user's (the choice that fits `plan.md` and MK8DX best), and logged in the queue's "Decisions made during the run" for the review at the end. Stop only for what `CLAUDE.md` says must be asked (a new dependency, logic in the server, a hard constraint).
- After an interruption (the usage limit, a crash), pick up from the Status table: for each task marked building, look at its worktree (`git worktree list`, then `git -C <path> status` and `log`): merge it if committed, otherwise send its implementer on with SendMessage if it still runs, or spawn the task again in a fresh worktree.

## Commits

- Commit; never push (the user pushes). Before every commit: `npm test` passes, and `git status` shows nothing secret (certs, keys, `.env`) and nothing that is not the task's.
- One commit per task, one per integration fix, one for the handoff.
