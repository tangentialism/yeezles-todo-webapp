<!-- verified-at: HEAD -->

# feature/topics-proposals-review — in flight

Phase 3b of the topics feature: the webapp proposal review screen at
`/topics/proposals/:id`, plus the pending badge, banner and dashboard
hand-back. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-proposals.md`.

## Next action

Task 2: proposal draft init and selectors.

## Verified

- Task 1: tests written first and RED (client methods "is not a function",
  store module unresolved, sync logged unknown type; 6 failed, 3 files), then
  GREEN: api.proposals 5, useProposalStore 6, useCrossTabSync.proposals 1 (12
  passed). Full check: `TSC_OK`; 468 tests, 468 passed, 0 failing names; lint
  now 5, baseline 5; new failing names empty.
- Task 0: branch from origin/master `621046c` (phase 3a merged as PR #28;
  `src/hooks/useTopicStore.ts` and `src/services/apiError.ts` present on
  master); upstream unset; `npm ci` ok (Node 26.7.0); `tsc -b` exit 0
  (`TSC_OK`); eslint baseline 5 problems; vitest baseline 456 tests, 456
  passed, 0 failing names
  (`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-proposals-review-baseline-tests.txt`,
  not committed).

## Assumed

- The backend at `yeezles-todo` `4db2fab` or later serves the Proposals API as
  documented in its `docs/api/API.md`.

## Deviations

- Ruling M3: `useProposal` also sets `gcTime: 0`; added a test asserting it.
- Ruling L1: store and cross-tab `PROPOSAL_RESOLVED` use `invalidateTopicViews`
  / `invalidateTodoViews` from `./topicInvalidation` (they already take filter
  options, no change needed) instead of hand-listed keys. The brief's tests
  assert the same keys via `objectContaining({ queryKey })`, plus
  `refetchType: 'active'` for the cross-tab test. The brief's "does not retry"
  test is split into apply-once and reject-once tests.

- The checkout is the workspace worktree's own submodule,
  `/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`,
  not `/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-proposals-review`
  (workspace drift `2026-10-13-webapp-work-in-worktree-submodule.md`).
- The full check is
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-proposals-review-check.sh`:
  the plan's Task 0 Step 4 commands with the jq path prefix adapted to the
  nested checkout and temp files in `mktemp -d`.

## Resume

Branch `feature/topics-proposals-review` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`.
Continue at the task named under Next action. Every git command uses `-C`
with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-proposals-review-check.sh`
for the full check; pass is `TSC_OK`, a lint total not above the baseline, and
nothing between the comm markers.
