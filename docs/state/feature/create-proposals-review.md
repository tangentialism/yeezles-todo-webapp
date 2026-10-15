<!-- verified-at: HEAD -->

# feature/create-proposals-review — landing record

PR B of "MCP create tools write proposals": the webapp review screen shows
`new_todos` alongside new topics, assignments and note edits. Plan and spec
live in the workspace repo, branch `spec/mcp-create-proposals`:
`docs/superpowers/plans/2026-10-14-mcp-create-proposals.md` and
`docs/superpowers/specs/2026-10-14-mcp-create-proposals-design.md`.

## Next action

Task 5 (data layer) in progress; then Task 6 (reducer actions), Task 7
(components). Push and `gh pr create --base master` are gated on David.

## Verified

### Baseline (Task 5, at `6bf7a1f`, branch cut from `origin/master`)

- `npm ci && npm run lint && npm run build && npx vitest run`: lint 0 errors,
  5 warnings (react-hooks/exhaustive-deps); build succeeded; 68 test files,
  557 tests passed.

## Assumed

- The backend (`yeezles-todo` PR A, merged) serves `new_todos` on
  `GET /proposals/:id` as documented in its API doc; not run against a live
  backend in this task.
- Not run: the hosted MCP connector creating a proposal with new todos.

## Resume

Branch `feature/create-proposals-review` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/spec-mcp-create-proposals/yeezles-todo-webapp`.
Every git command uses `-C` with that path. Continue at Next action.
