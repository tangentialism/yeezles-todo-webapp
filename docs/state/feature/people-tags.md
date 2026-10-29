<!-- verified-at: HEAD -->

# feature/people-tags — in flight

People tags phase 2: the webapp People tab, person chips, People field, and
rename/alias/merge/delete. Spec: workspace
`docs/superpowers/specs/2026-10-28-people-tags-design.md` (rev 2). Plan: workspace
the People tags P2 webapp plan (see workspace `docs/superpowers/plans/`).

## Next action

Task 1: person types and the API client.

## Verified

- Task 0: worktree `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags`,
  branch `feature/people-tags` from `origin/master` `1bb2072` (Merge pull
  request #32; master had not moved since plan time). `node --version` v26.7.0;
  `npm ci` ok. Baseline: `tsc -b` exit 0 (`TSC_OK`); eslint 5 problems; vitest
  595 total, 595 passed, 0 failing names. Comparison run straight after the
  baseline: `TSC_OK`, lint 5 (baseline 5), new failing names empty.
- Check script (outside the repo, never committed):
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-check.sh`; run it
  with no argument to compare, `baseline` to rewrite. Baseline files:
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-baseline-lint.txt`
  and `people-tags-baseline-tests.txt`.
- Pin re-read at `1bb2072`, no drift: `useTodoStore.ts` `invalidateTopicViews`
  at 169, 237, 316; `['topicTodos']` invalidations at 418 and 476; optimistic
  spread at 211-222. `useCrossTabSync.ts` message switch at 67-110 with the
  TODO_* and TOPIC_* cases. `components/navViews.ts` exists (`VIEWS`,
  `ALL_AREAS_SWATCH`). `EditTodoModal.tsx` 68-81 holds the `topicChanged` rule
  and `updateData`.

## Assumed

- The backend at `yeezles-todo` `46b3510` serves `/people` and `people` on todos as documented in its `docs/api/API.md`.

## Deviations

- The full check is the script above rather than loose commands (controller
  ruling); it is the topics UI script with paths and the jq filter prefix
  changed to `people-tags`.

## Resume

Branch `feature/people-tags` in
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags`. Task 0 is done;
continue at the task named under Next action. Every git command uses `-C` with
that path. Run `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-check.sh`
for the full check; pass is `TSC_OK`, a lint total not above 5, and nothing
between the comm markers.
