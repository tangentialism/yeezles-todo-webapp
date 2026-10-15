<!-- verified-at: HEAD -->

# feature/create-proposals-review — landing record

PR B of "MCP create tools write proposals": the webapp review screen shows
`new_todos` alongside new topics, assignments and note edits. Plan and spec
live in the workspace repo, branch `spec/mcp-create-proposals`:
`docs/superpowers/plans/2026-10-14-mcp-create-proposals.md` and
`docs/superpowers/specs/2026-10-14-mcp-create-proposals-design.md`.

## Next action

Task 7 (components for new todo rows; the reducer actions are done). Push and `gh pr create --base master` are gated on David.

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

## Assumed

- The backend (`yeezles-todo` PR A, merged) serves `new_todos` on
  `GET /proposals/:id` as documented in its API doc; not run against a live
  backend in this task.
- Not run: the hosted MCP connector creating a proposal with new todos.

## Resume

Branch `feature/create-proposals-review` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/spec-mcp-create-proposals/yeezles-todo-webapp`.
Every git command uses `-C` with that path. Continue at Next action.
