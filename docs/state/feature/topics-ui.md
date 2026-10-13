<!-- verified-at: HEAD -->

# feature/topics-ui — in flight

Phase 3a of the topics feature: the webapp topics UI. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-ui.md`.

## Next action

PR review (gated on David); then the workspace pin bump to the merge commit; then plan 3b (workspace docs/superpowers/plans/2026-10-13-topics-webapp-proposals.md).

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
- Final-review fix wave (the commit after `0ad693c`, "Fix wave: ..."): B1-B4,
  I5 and the note-trim minor, each with a test run RED before the fix (see
  "Known issues (fixed in the final-review fix wave)"). Full check:
  `TSC_OK`, tests 456 total / 456 passed, 0 failing names, lint 5 (baseline
  5), new failing names empty. Named suites plus every touched suite: 28
  files, 163 tests passed. `npm run build` (tsc -b && vite build) succeeded,
  234 modules. Browser re-check of the fix wave: see the next bullet.
- Browser re-check at 17cbae0 (local backend yeezles-todo 4db2fab, src compiled
  to a scratch dir because the committed backend dist predates topics; minted
  session cookie). B1: GETs per list per mutation are at most 1 in-tab and at
  most 2 server-side across two tabs (was 13-14). B2: no "Missing queryFn" or
  skipToken errors in the console after any mutation, and the Today nav count
  updated ("Today 2" to "Today 1"). B3: one DELETE (409) and the toast present
  in the DOM at +270 ms. B4: one DELETE (400); toast text exactly `Failed to
  delete area: Cannot delete area with incomplete todos. Complete or move todos
  first.` (single prefix). B5: UI updates at about 440-470 ms (create topic
  +473 ms, complete in detail +437 ms). Note-draft switch (I5) passed in both
  directions (Garden draft then Kitchen reno chip, and the reverse). Caveat: the
  tab reported visibilityState 'hidden' throughout, so the timings are from a
  throttled tab.

## Known issues (fixed in the final-review fix wave)

Found in the browser walkthrough; all fixed in the fix-wave commit after
`0ad693c`. Each fix has a unit test that failed before it and passes after; B1-B5
and the note-draft switch were then re-checked in a browser (see the "Browser
re-check at 17cbae0" bullet under Verified).

- B1 (fixed): every topic or todo mutation caused a refetch storm (13-14
  refetches per list), because each `useCrossTabSync()` instance had its own
  tab id, so instances in one tab handled each other's posts. Now one
  module-level `TAB_ID` per tab, plus a one-key guard so a receiving tab handles
  each message once, not once per instance. Test:
  `src/hooks/__tests__/useCrossTabSync.sameTab.test.tsx` (4 tests; RED: tab ids
  differed, a local broadcast caused 5 invalidations, another tab's message was
  handled twice).
- B2 (fixed): `useTodayOpenCount` observed `['todayView']` with `skipToken`, so
  an invalidation refetch could run with its options and fail with "Missing
  queryFn". It now carries the real function (`fetchTodayView`, shared with
  `useTodayViewStore`) with `enabled: false`. Test: `useNavCounts.test.tsx`
  "lets an invalidation refetch the Today view without a missing-queryFn error"
  (RED: the real fetch ran once, not twice).
- B3 (fixed): the global mutation `retry: 1` repeated 4xx refusals. App.tsx now
  uses `retryMutationUnlessClientError` (`src/services/apiError.ts`): no retry
  for an ApiError with status 400-499, one retry for network, 5xx and other
  errors. Test: `apiError.test.ts` "retryMutationUnlessClientError" (RED: not a
  function).
- B4 (fixed): the delete toast doubled its prefix. An ApiError's server message
  now shows as is; AREA_HAS_TOPICS keeps "Move or delete this area's topics
  first."; other errors keep the "Failed to delete area: " prefix. Tests:
  `useAreaStore.delete.test.tsx` generic-ApiError toast (RED: doubled prefix)
  and non-ApiError toast (guard; passed before and after). The other half of
  B4, an area with topics and open todos getting the todos error, is backend
  check order and stays as is.
- B5 (re-checked): the 3-8 s lag was B1's refetch storm. At 17cbae0 updates show
  at about 440-470 ms, even in a hidden tab (see the "Browser re-check at
  17cbae0" bullet under Verified).
- I5 (fixed, from the final review): TopicDetail had no key, so opening topic B
  while A's detail was mounted kept A's unsaved note draft and Save wrote it to
  B. Now `key={openTopicId}`. Test: `TopicsView.switchTopic.test.tsx` (RED: B's
  box held "Bulbs in. Draft for A.").
- Minor (fixed, from the final review): after a save that the backend trimmed
  (surrounding whitespace, or blank to null), Save stayed enabled. The editor
  now sets its text from the saved note (null to ''). Tests:
  `TopicNoteEditor.test.tsx`, two new (RED: the box kept the untrimmed text).

## Assumed

- The backend at `yeezles-todo` `4db2fab` serves the topics API as documented
  in its `docs/api/API.md`.
- Not run: the deployed app and the hosted backend.
- Google sign-in is not exercised; the walkthroughs used the persistent-session
  cookie path.
- Visible-tab timing: the walkthrough and the re-check both ran in a hidden,
  throttled tab, so the timings (B3 to B5) are not visible-tab numbers.
- The fix wave was re-checked in a browser at 17cbae0 (see the "Browser
  re-check at 17cbae0" bullet under Verified).

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
- Final-review ruling: the "Topic not found" flash after a topic delete is
  accepted as is. `onBack` runs before the refetch, so no flash shows; the cost
  is one wasted `GET /topics/:id` 404 per delete.
- Final-review ruling: EditTodoModal sending `topic_id: null` (when the todo's
  `topic_id` is undefined, or from a stale cached todo) is deferred to 3b.
- Final-review ruling: the TopicCard `highlighted` background clash
  (`bg-surface` with `bg-accent-soft`) is deferred to 3b, its first user.

## Resume

Branch `feature/topics-ui` in
`/Users/davidyee/Code/yeezles-todo-workspace/.claude/worktrees/topics-phase3/yeezles-todo-webapp`.
Tasks 0-10 and the final-review fix wave are done and the final check is green. Continue at the task named under Next action. Every git command uses
`-C` with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-ui-check.sh` for the full
check; pass is `TSC_OK`, a lint total not above the baseline, and nothing
between the comm markers.
