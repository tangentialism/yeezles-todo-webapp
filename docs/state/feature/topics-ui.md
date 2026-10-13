<!-- verified-at: HEAD -->

# feature/topics-ui — in flight

Phase 3a of the topics feature: the webapp topics UI. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-ui.md`.

## Next action

Final whole-branch review fix wave (browser bugs B1–B4 plus review findings); then PR review (gated on David); then the workspace pin bump; then plan 3b (workspace `docs/superpowers/plans/2026-10-13-topics-webapp-proposals.md`).

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
- Task 9: useAreaStore.delete 1/1 and AreaManagementModal.delete 1/1, both RED
  first (toast read the generic text; onClose was called). Modal test also
  asserts deleteArea called with 2 (ruling L3). Full check: `TSC_OK`, tests
  444 total / 444 passed, lint 5 (baseline 5), new failing names empty.

- Task 10: README "Completed Features" and docs/FEATURES.md document Topics.
  Final check: `TSC_OK`, tests 444 total / 444 passed, 0 failing names, lint 5
  (baseline 5), new failing names empty. Named-suite vitest run: 22 files,
  121 tests passed. `npm run build` (tsc -b && vite build) succeeded, 234
  modules, no errors.
- Browser walkthrough (2026-10-13, Claude in Chrome, local backend at
  `yeezles-todo` `4db2fab`, fake user, signed in by a minted persistent-session
  `remember_token` cookie, not Google sign-in). SEEN: (1) Topics tab with one
  area, then All areas (one section per area that has topics); (2) create topic
  and case-only duplicate gives the inline message; (3) open, save note,
  archive, unarchive; (4) todo with a topic under Auto, area follows the topic;
  (5) edit todo, change area, "Topic cleared" hint; (6) topic chip in All opens
  topic detail on the Topics tab; (7) completing a todo in detail moves it to
  Done (n) and counts update; (8) area delete refused, dialog stays open, toast
  confirmed in the DOM after forcing focus (see B3/B4); extra: Escape in
  "New topic..." from the add-todo form closes only that dialog. The "Move or
  delete this area's topics first." toast was seen for an area with a topic and
  no open todos (Errands); an area with open todos (Work) is refused first for
  its todos (B4). Screenshots cover the Topics home and topic detail at 390 px
  and 1280 px only (via same-origin iframes); they are uncommitted local files
  under `/Users/davidyee/.claude/jobs/291300d3/tmp/shots/`.
  Caveat: the tab was hidden throughout, so the 3-8 s update lag was NOT
  verified as app or browser behaviour, and item 8's toast was seen only after
  forcing React Query focus, never in a screenshot.

## Known issues (to be fixed before PR)

Found in the browser walkthrough; a later fix wave handles them.

- B1: every topic or todo mutation causes a refetch storm (13-14 refetches per list); `useCrossTabSync()` per store instance opens its own BroadcastChannel, so same-tab hooks hear each other.
- B2: `skipToken` console error on every mutation (22 each): `useTodayOpenCount` observes `['todayView']` with `queryFn: skipToken` and invalidation refetches it.
- B3: a refused area delete (400/409) is retried once (`mutations.retry = 1`), so a second DELETE is sent and the toast is delayed, or withheld in a background tab.
- B4: the incomplete-todos delete toast has a doubled prefix ("Failed to delete area: Failed to delete area: ..."), and an area with topics and open todos shows the todos error because the backend checks todos first.
- Possible B5 (unverified, may be the hidden tab): UI took 3-8 s to reflect stored changes; re-check in a visible tab.

## Assumed

- The backend at `yeezles-todo` `4db2fab` serves the topics API as documented
  in its `docs/api/API.md`.
- Not run: the deployed app, the hosted backend, Google sign-in (the walkthrough
  used a minted persistent-session cookie), the update lag in a visible tab,
  and the toast in a visible tab (item 8 toast timing).

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
- Controller rulings (executed): base is origin/master `e2ba5db`, not `b52ba1d`; the
  webapp worktree is the submodule here; the workspace dirty submodule line is
  never staged (pin bump is separate); esbuild install scripts left unapproved.
- Ruling H1: NewTopicDialog stops submit and Cmd+Enter propagation so it cannot submit an enclosing todo form.
- Ruling H2: TopicsView filters by the selected area; All areas shows one section per area.
- Ruling H3: forms destructure `resetTopic` from useTopicSelection so lint stays at 5.
- Ruling M1: the Done view's DoneItem also renders the topic chip.
- Ruling M2: AddTodoModal.test gets a QueryClient/useTopicStore mock.
- Ruling M3: cross-tab TODO_* and todo create/update/delete invalidate `['topic']` too.
- Ruling M4: moveToToday/removeFromToday invalidate `['topicTodos']`.
- Ruling M5: done todos in topic detail render via DoneItem, no "Completing..."/Undo.
- Ruling M6: Archive/Unarchive awaited in try/catch, failure shown by toast.
- Ruling M7: paths and check script translated (see first two bullets).
- Ruling L1/L2/L3: vacuous or misnamed assertions strengthened.
- Ruling L4: openTopic goes through handleViewChange.
- Ruling L5: PhoneTabBar test renamed "renders the four views".
- Ruling L6: duplicated logic blocks extracted into one shared helper.
- Ruling L7: topicKeys used in the invalidation helper; no unused exports.
- Ruling L8: deleteArea doc comment keeps the "reassigned to the default area" sentence.
- Ruling L9: Topics bullet under README "Completed Features"; Node 22 left as master declares it.
- Ruling L10: topic-detail error state branches on `TOPIC_NOT_FOUND`.
- Ruling L11: CreateTodoFromExternal's area effect does not overwrite once a topic is chosen.
- Ruling L12: blank select after "New topic..." until refetch is cosmetic, deferred to final review.
- Ruling (Task 6): done todos in detail have no "mark incomplete" control.
- Ruling (Task 7): TopicPicker's "optional" hint sits beside the label, not inside it.
- Ruling (Task 10): the walkthrough ran against a local backend at `4db2fab`, separate
  database, signed in by minted persistent-session cookie.

## Resume

Branch `feature/topics-ui` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`.
Tasks 0-10 are done and the final check is green. Continue at the task named under Next action (the fix wave starts from Known issues B1-B4). Every git command uses
`-C` with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-check.sh` for the full
check; pass is `TSC_OK`, a lint total not above the baseline, and nothing
between the comm markers.
