<!-- verified-at: HEAD -->

# feature/topics-ui — in flight

Phase 3a of the topics feature: the webapp topics UI. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-ui.md`.

## Next action

Task 6: topic detail.

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
- Task 2: useTopicStore 7/7, useCrossTabSync.topics 2/2, useTodoStore.topics 3/3,
  each RED first (unresolved import; missing invalidations). Full check:
  `TSC_OK`, tests 365 total / 365 passed, lint 5 (baseline 5), new failing
  names empty.
- Task 3: topicStaleness 4/4, formatRelative 9/9, TopicChip 4/4, AccomplishmentsView
  Done-chip test, each RED first (unresolved imports / missing export). Full check:
  `TSC_OK`, tests 383 total / 383 passed, lint 5 (baseline 5), new failing names
  empty.
- Task 4: Navigation Topics tab, PhoneTabBar Topics tab, Dashboard.topics, each
  RED first (3 failing tests). Full check: `TSC_OK`, tests 386 total / 386
  passed, lint 5 (baseline 5), new failing names empty.
- Task 5: TopicsView 8/8, NewTopicDialog 5/5 (incl. portal-bubbling test), each RED
  first (unresolved import / no cards). Full check: `TSC_OK`, tests 399 total /
  399 passed, lint 5 (baseline 5), new failing names empty.

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
- Task 2: `topicKeys` and the invalidation helpers (`invalidateTopicViews`,
  `invalidateTodoViews`) live in `src/hooks/topicInvalidation.ts`, re-exported
  from `useTopicStore`, to avoid an import cycle with `useCrossTabSync`.
  Rulings M3/M4: todo create/update/delete and the cross-tab TODO_* handler also
  invalidate `['topic']`; moveToToday/removeFromToday invalidate `['topicTodos']`.
- Task 3 (ruling M1): spec §5.3 wants the chip on every row, Done included.
  `DoneItem` in `AccomplishmentsView.tsx` renders the same `TopicChip` (area
  colour, open-topic context); test added in `AccomplishmentsView.test.tsx`.
- Task 4 (ruling L4/L5): Dashboard's `openTopic` routes through `handleViewChange`
  (now `useCallback` on `currentView`; `openTopic` is `useCallback` on it), so
  the fade and scroll save apply. The PhoneTabBar test "renders the three views"
  is renamed "renders the four views".
- Task 5: TopicsView filters topics to the selected area itself (the brief's
  component did not, so two of its tests failed). NewTopicDialog's form stops
  propagation of submit and Cmd/Ctrl+Enter keydown so it cannot reach an
  enclosing todo form. The query error message is read with an `instanceof
  Error` guard because `error` is typed `{}` here.

## Resume

Branch `feature/topics-ui` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`.
Continue the plan at the task named under Next action. Every git command uses
`-C` with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-check.sh` for the full
check; pass is `TSC_OK`, a lint total not above the baseline, and nothing
between the comm markers.
