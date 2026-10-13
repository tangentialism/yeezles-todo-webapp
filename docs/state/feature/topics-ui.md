<!-- verified-at: HEAD -->

# feature/topics-ui — in flight

Phase 3a of the topics feature: the webapp topics UI. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-ui.md`.

## Next action

Task 9: AREA_HAS_TOPICS on area delete.

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
- Task 6: TopicNoteEditor 5/5, TopicDetail 11/11, TopicDetail.completion 1/1
  (real stores over a fake API: completing moves the todo to Done (2) and the
  counts to "0 open · 2 done"), TopicsView back-to-sections 1 new; each RED
  first (unresolved import / placeholder; the TopicsView test RED by breaking
  the onBack wiring). The M5 and M6 tests were also shown to fail against the
  brief's TodoRow-for-done and `void updateTopic` versions. Full check:
  `TSC_OK`, tests 417 total / 417 passed, lint 5 (baseline 5), new failing
  names empty.
- Task 7: useTopicSelection 4/4, TopicPicker 6/6, Dialog.nested 2/2, each RED
  first (unresolved imports; outer dialog closed on Escape). Full check:
  `TSC_OK`, tests 429 total / 429 passed, lint 5 (baseline 5), new failing
  names empty.
  Fix round 1 (Dialog Escape via a module-level stack, one document listener,
  onClose/closeDisabled in refs): Dialog.nested 5/5, the flushSync test RED
  first. Full check: `TSC_OK`, tests 432 total / 432 passed, lint 5 (baseline
  5), new failing names empty.
- Task 8: TodoForms.topics 10/10 (brief's 7 plus New-topic-does-not-create-todo,
  Escape-closes-only-topic-dialog, late-loading-area), RED first (no Topic label
  on any form); the late-area test also shown RED with the guard removed.
  AddTodoModal.test given a useTopicStore mock (RED: No QueryClient set).
  EditTodoModal/CreateTodoFromExternal have no other suites. Full check:
  `TSC_OK`, tests 442 total / 442 passed, lint 5 (baseline 5), new failing
  names empty.

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
- Task 6 (ruling M5): done todos in topic detail render through `DoneItem`, not
  `TodoRow` (which shows a completed todo as "Completing…" with Undo).
  `DoneItem` moved from `AccomplishmentsView.tsx` to `src/components/DoneItem.tsx`
  and gained `showTopic` (default true). Done todos in detail therefore have no
  "mark incomplete" control. (M6) Archive/Unarchive is awaited; a failure shows
  an error toast via `useToast`. (L10) Only `TOPIC_NOT_FOUND` shows "Topic not
  found"; any other load error shows "Could not load this topic" with Try
  Again. (L1/L2) The no-chip assertion runs inside a `TopicNavigationContext`
  provider and checks the topic name is absent from the list; "archives and
  unarchives" is split into an Archive and an Unarchive test.
- Task 7: Dialog Escape is topmost-only, decided by a module-level stack of open
  dialogs with a single document listener (not DOM order or listener order). TopicPicker's "optional" tag sits beside the
  `<label>` in a `fieldLabel` div, not inside it: the brief's markup gave the
  select the accessible name "Topic optional", so `getByLabelText('Topic')`
  in the brief's own tests failed.
- Task 8 (rulings H3/M2/L11): forms destructure the selection hook's members and
  depend on the stable `resetTopic` (already a useCallback), so lint stays at 5.
  AddTodoModal.test mocks useTopicStore. CreateTodoFromExternal's currentArea
  effect skips the overwrite once a topic is chosen (topic id read via a ref so
  the effect still depends only on currentArea).

## Resume

Branch `feature/topics-ui` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`.
Continue the plan at the task named under Next action. Every git command uses
`-C` with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-check.sh` for the full
check; pass is `TSC_OK`, a lint total not above the baseline, and nothing
between the comm markers.
