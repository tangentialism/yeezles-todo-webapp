<!-- verified-at: HEAD -->

# feature/create-proposals-review — landing record

PR B of "MCP create tools write proposals": the webapp review screen shows
`new_todos` alongside new topics, assignments and note edits. Plan and spec
live in the workspace repo, branch `spec/mcp-create-proposals`:
`docs/superpowers/plans/2026-10-14-mcp-create-proposals.md` and
`docs/superpowers/specs/2026-10-14-mcp-create-proposals-design.md`.

## Next action

Open PR B: a gated ask to David to push and `gh pr create --base master`
(title `Review new todos in proposals`). Then the workspace pin bump, then PR C
(Task 8).

## Verified

### Baseline (Task 5, at `6bf7a1f`, branch cut from `origin/master`)

- `npm ci && npm run lint && npm run build && npx vitest run`: lint 0 errors,
  5 warnings (react-hooks/exhaustive-deps); build succeeded; 68 test files,
  557 tests passed.

### Task 5 (data layer: types, init, selectors, serialize)

- Check command `npm run lint && npm run build && npx vitest run`: lint 0
  errors, 5 warnings (baseline 5); build succeeded; 68 files, 572 tests passed
  (baseline 557, +15 new). The first 13 were RED first (13 failed).
- Two existing tests gained `new_todos: []` in their expected apply payload
  (`proposalDraft.serialize.test.ts`, `ProposalReview.test.tsx`), because
  serialize now always emits `new_todos`.
- Not yet built: components.

### Task 6 (reducer: toggle, redirect, decision 6 cascade)

- Check command: lint 0 errors, 5 warnings (baseline 5); build succeeded; 68
  files, 584 tests passed (Task 5: 572, +12 new in
  `proposalDraft.reducer.test.ts`, 31 tests in that file). RED first: 9 of
  the 11 failed before the implementation; fix round 1 added one (uncheck, reject all, re-check), RED then GREEN.
- New actions `toggleNewTodo`, `redirectNewTodo`, `addTopic.newTodoKey`.
  Invariant: a new todo's target is never a dropped or missing topic
  (`redirectNewTodo` refuses one; drops and `useExisting` retarget); a dropped
  new topic's todos serialize with `topic: null`.

### Task 7 (components, read-only view)

- Check command: lint 0 errors, 5 warnings (baseline 5); build succeeded; 68
  files, 594 tests passed (Task 6: 584, +10 new). RED first: the Sections
  file failed to import (`NoTopicSection` missing) and 2 Review tests failed
  before the implementation.
- New: `NewTodoRow`, `NoTopicSection`; `TopicTargetSelect` gained `noneLabel`
  (default `—`, so assignment rows are unchanged). `ReadOnlyProposal` lists
  `applied.new_todos` by topic with a last "No topic" group, and tolerates a
  payload with no `new_todos`.
- `afterResolve` already called `invalidateTodoViews`; a test now pins it
  (`useProposalStore.test.tsx`), no new code.

### Final review fixes

- Reject all on an existing (or unknown) topic now also unchecks that topic's
  new todos (`accepted: false`, target and `movedFrom` unchanged). RED first:
  the reducer test failed on `accepted: true`. On a new topic the behavior is
  unchanged (todos go to No topic, still checked).
- `ReadOnlyProposal`: the synthetic No topic group has the key `__none__`, so a
  real topic named "No topic" cannot share it. New test, RED first against the
  old key (duplicate-key warning), then GREEN.
- Check command: lint 0 errors, 5 warnings (baseline 5); build succeeded; 68
  files, 595 tests passed (Task 7: 594, +1; the reducer test was changed in place).

### Task 7 Step 5, browser check (by a subagent, not re-run by the controller)

Report: `.superpowers/sdd/2026-10-14-mcp-create-proposals/task-7-browser-report.md`
in the workspace worktree. Result PASS, 8 of 8 items seen.

- Backend: `yeezles-todo` `origin/main` at `8c97a76` (PR #65, detached), built
  with `npm run build`. Separate database `yeezles_create_proposals_check` on
  the shared embedded PostgreSQL (dropped afterwards). Webapp at `f889f75`,
  Vite on port 5184, backend on 3100.
- Browser: Claude in Chrome, viewport 606x723, `document.visibilityState`
  `hidden` throughout. Signed in with a seeded session cookie, not Google.
- Seen on proposal 1 (3 new todos, 1 new topic, 1 assignment): "5 of 5
  accepted" and "Apply 5 changes"; new todos under Patio, Garden and a No topic
  section with New badges, due date and Today; selects offer No topic, assignment
  selects do not; unchecking Patio moved "Buy pavers" to No topic, still
  checked; re-checking restored it; retarget to Kitchen reno and unchecking one
  gave "2 of 5"; Apply sent `POST /proposals/1/apply 200`, landed on Topics;
  todos in the list without a full reload; the applied page is read-only with
  "Applied just now" and no Apply button.
- Seen on proposal 2 (`is_today`, `due_date`, kept new topic): toast "Applied:
  2 new todos, 1 new topic"; Garden 2, Kitchen reno 2, Shed 1; Today tab 1.
- DB verification (`verify.js`): proposal 1 created "Buy pavers" (no topic) and
  "Call plumber" (Kitchen reno) only, no "Prune roses" and no Patio topic;
  proposal 2 created "Prune roses" (Garden, `is_today` true, due 2026-10-20)
  and "Paint shed" in new topic Shed; both proposals `applied`.

## Rulings

- 3: counts and `applyBlocker` count new todos.
- 4: a topic moved to another area counts as missing; an archived topic in the
  same area does not.
- 6: Reject all on an existing topic drops its new todos (unchecks them, target
  kept). On a new topic they move to No topic, still checked.
- 7 (deferred): a deleted topic's name cannot be recreated in review, because
  `knownNames` counts `exists: false` refs. Pre-existing; a follow-up issue.

## Assumed

- The hidden-tab first-Apply drop recurred in the browser check (two clicks
  sent no request, the third worked). It still needs David's hand check in a
  visible tab.
- The deployed webapp and the hosted backend are untested; the check ran
  against a local backend and Vite.
- Google sign-in was not exercised (seeded session cookie).
- Not run: the hosted MCP connector creating a proposal with new todos.

## Resume

Branch `feature/create-proposals-review` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/spec-mcp-create-proposals/yeezles-todo-webapp`.
Every git command uses `-C` with that path. Continue at Next action.
