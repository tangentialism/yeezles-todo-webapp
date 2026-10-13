<!-- verified-at: HEAD -->

# feature/topics-ui — in flight

Phase 3a of the topics feature: the webapp topics UI. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-ui.md`.

## Next action

Task 2: topic store, sync and todo-store invalidation.

## Verified

- Task 0: branch from origin/master `e2ba5db` (the plan was written against
  `b52ba1d`; master gained the green-suite PR #26 since); `npm ci` ok;
  `tsc -b` exit 0; eslint baseline 5 problems (5 warnings, 0 errors);
  vitest baseline 338 tests, 338 passed, 0 failing names
  (`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-baseline-tests.txt`,
  not committed).
- Task 1: apiError 7/7, api.topics 8/8 green (RED first for apiError: unresolved
  import; api.topics RED step not run separately). Full check: `TSC_OK`, tests
  353 total / 353 passed, lint 5 (baseline 5), new failing names empty.

## Assumed

- The backend at `yeezles-todo` `4db2fab` serves the topics API as documented
  in its `docs/api/API.md`.

## Deviations

- The checkout is the workspace worktree's own submodule,
  `/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`,
  not `/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui`. The Claude
  session's worktree-isolation hook refuses git commands aimed at the shared
  submodule checkout.
- The full check is `/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-check.sh`:
  the plan's Task 0 Step 4 commands with the jq path prefix adapted to the
  nested checkout.
- `deleteArea` doc comment keeps its existing sentence "Todos in the deleted
  area are reassigned to the default area" (controller ruling) alongside the
  new AREA_HAS_TOPICS line.

## Resume

Branch `feature/topics-ui` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`.
Continue the plan at the task named under Next action. Every git command uses
`-C` with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-check.sh` for the full
check; pass is `TSC_OK`, a lint total not above the baseline, and nothing
between the comm markers.
