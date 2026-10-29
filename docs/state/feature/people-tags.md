<!-- verified-at: HEAD -->

# feature/people-tags — in flight

People tags phase 2: the webapp People tab, person chips, People field, and
rename/alias/merge/delete. Spec: workspace
`docs/superpowers/specs/2026-10-28-people-tags-design.md` (rev 2). Plan: workspace
repo `docs/superpowers/plans/2026-10-29-people-tags-webapp.md`.

## Next action

Task 2: invalidation, query keys and the people store (the optimistic `people` drop in `useTodoStore` onUpdate `onMutate` already landed in Task 1; Task 2 only needs its test).

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
- Task 1: RED `npx vitest run src/services/__tests__/api.people.test.ts`: 6 failed,
  `TypeError: client.getPeople is not a function` (and the other five methods),
  as expected before implementing. GREEN: 6/6 passed. Check script: `TSC_OK`,
  601 total, 601 passed, 0 failing names, lint 5 (baseline 5), new failing names
  empty. New files lint clean (`npx eslint` on person.ts, personFactories.ts,
  api.people.test.ts: no output).

## Assumed

- The backend at `yeezles-todo` `46b3510` serves `/people` and `people` on todos as documented in its `docs/api/API.md`.

## Deviations

- The full check is the script above rather than loose commands (controller
  ruling); it is the topics UI script with paths and the jq filter prefix
  changed to `people-tags`.
- Task 1: the `getTodos` test reads the query through `URLSearchParams` rather
  than asserting the literal string `person_id=7&completed=false`. `person_id` is
  appended after `completed` (the `topic_id` pattern), so the literal string would
  be `completed=false&person_id=7`; order does not matter to the backend.
- Task 1: `Todo.people?` plus `UpdateTodoRequest.people?` broke `tsc` in
  `useTodoStore.ts` (the optimistic update spread typed `PersonIdRef[]` onto a
  `Todo`). The `people` drop (spec discrepancy 6) was therefore made here, in
  `onMutate`, ahead of Task 2; no test pins it yet (Task 2 adds it).

## Resume

Branch `feature/people-tags` in
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags`. Task 0 is done;
continue at the task named under Next action. Every git command uses `-C` with
that path. Run `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-check.sh`
for the full check; pass is `TSC_OK`, a lint total not above 5, and nothing
between the comm markers.
