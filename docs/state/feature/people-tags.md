<!-- verified-at: HEAD -->

# feature/people-tags — in flight

People tags phase 2: the webapp People tab, person chips, People field, and
rename/alias/merge/delete. Spec: workspace
`docs/superpowers/specs/2026-10-28-people-tags-design.md` (rev 2). Plan: workspace
repo `docs/superpowers/plans/2026-10-29-people-tags-webapp.md`.

## Next action

Task 7: the People field (typeahead) in the add and edit forms.

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
- Task 2: RED `npx vitest run` on the three new suites before implementing: 7
  failed (missing `usePeopleStore`/`peopleInvalidation` imports, no
  `invalidatePeopleViews` or `personTodos` calls, PERSON_* messages unhandled).
  GREEN: 18/18 passed. The review-focus-4 test passed on the Task 1 drop; with
  `delete optimisticUpdates.people` removed it fails (pinned), then restored.
  Check script: `TSC_OK`, 619 total, 619 passed, 0 failing names, lint 5
  (baseline 5), new failing names empty. New files lint clean.
- Task 2 fix round 1: RED (before the edits) 3 tests failed, one per site group
  (topic store create/update/delete, proposal apply, cross-tab TOPIC_* and
  PROPOSAL_RESOLVED), 20 others passed. GREEN: 3 suites, 23/23 passed. Check
  script: `TSC_OK`, 622 total, 622 passed, 0 failing names, lint 5 (baseline 5),
  new failing names empty.
- Task 3: RED `npx vitest run src/components/people src/components/__tests__/TodoRow.people.test.tsx`:
  2 suites failed. `PersonChip.test.tsx` failed to load (missing `../PersonChip` and
  `useOpenPerson`, as expected); `TodoRow.people.test.tsx` 3 failed, 1 passed (the
  undefined-people no-crash test passes before implementing, as expected). GREEN:
  2 suites, 7/7 passed (3 chip, 4 row/DoneItem). Check script: `TSC_OK`, 629 total,
  629 passed, 0 failing names, lint 5 (baseline 5), new failing names empty. New and
  touched files lint clean.
- Task 3 fix round 1: RED (accessible-name test before the edit) 1 failed, 8 passed:
  `Unable to find ... button ... "Open person Linked Lee (in Peopler)"`. GREEN: 2 suites,
  9/9. Check script: `TSC_OK`, 631 total, 631 passed, 0 failing names, lint 5
  (baseline 5), new failing names empty.

- Task 4: RED `npx vitest run` on Navigation, PhoneTabBar, Dashboard.people, ViewContainer
  suites: 4 suites failed; 6 tests failed (2 Navigation: new order test and the updated
  Topics-order test, 1 PhoneTabBar, 2 Dashboard.people, 1 ViewContainer), 19 passed. Failures
  were the missing People tab, `openPersonId` never passed on, and the missing PeopleView.
  GREEN: 4 suites, 25/25 passed. Check script: `TSC_OK`, 636 total, 636 passed, 0 failing
  names, lint 5 (baseline 5), new failing names empty. New and touched files lint clean.
- Task 5: RED `npx vitest run src/utils/__tests__/groupByArea.test.ts src/components/people`:
  3 suites failed (groupByArea and PersonPane failed to load, missing modules; PeopleView 9
  failed on missing list, pane and layout), 5 passed (PersonChip 4, plus the area-switcher test,
  which passes against the stub's static heading). GREEN: 4 suites, 25/25 passed (groupByArea 4,
  PersonChip 4, PersonPane 7, PeopleView 10, incl. keyed-pane reset and phone class layout).
  Check script: `TSC_OK`, 657 total, 657 passed, 0 failing names, lint 5 (baseline 5), new failing
  names empty. New files lint clean.
- Task 5 fix round 1: RED (loading test before the edit) 1 failed, 7 passed in PersonPane:
  `Unable to find an element with the text: Loading todos...`. GREEN: PersonPane and PeopleView
  suites 18/18 (PersonPane 8, PeopleView 10). Check script: `TSC_OK`, 658 total, 658 passed, 0 failing names, lint 5 (baseline 5), new failing names empty.
- Task 6: RED `npx vitest run src/components/people`: 5 suites failed (EditPersonDialog,
  MergePersonDialog and DeletePersonDialog failed to load, missing modules; PersonPane 2 menu
  tests and PeopleView 1 delete test failed on `Unable to find ... name "Person actions"`), 3 tests
  failed, 22 passed in the suites that loaded. GREEN: 6 suites, 43/43 passed (EditPersonDialog 10,
  MergePersonDialog 5 incl. the PeopleView merge-selects-survivor test, DeletePersonDialog 3,
  PersonPane 10, PeopleView 11, PersonChip 4). Check script: `TSC_OK`, 679 total, 679 passed,
  0 failing names, lint 5 (baseline 5), new failing names empty. New and touched files lint clean.
  Review focus 1 (local `['todos']` row shows the renamed person) and focus 2 (merge selects the
  survivor, list loses the merged person, `['person', A]` removed) are pinned against a real
  QueryClient with a mocked API client.

## Assumed

- Task 4: the five phone tabs do not wrap at 320px (assumed, checked by reading classes;
  browser check in Task 9). Bar is `px-2`, so 304px / 5 = 60.8px per `flex-1` tab; the
  longest label ("Topics"/"People", 6 chars at 11.5px, about 40px) fits, and the widest
  count case ("Today 12", about 58px) is close but only appears with a badge. The 11px
  fallback was therefore not applied. No visual check was run.

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
- Task 2 fix round 1 (controller ruling): spec discrepancy 5 covers every
  `['topicTodos']` invalidation site, so `invalidatePeopleViews` was also added to
  `useTopicStore` (create, update, delete), `useProposalStore` `afterResolve`
  (apply and reject), and the `TOPIC_*` and `PROPOSAL_RESOLVED` cross-tab cases.
  The brief's site list was incomplete.
- Task 4: `PeopleView` ignores its three props (`React.FC<PeopleViewProps> = () =>`),
  because `noUnusedParameters` rejects unused destructured props; Task 5 starts using them.
- Task 5: `PeopleView` header is `ViewHeader` with empty `totals` and no refresh button; the
  brief names no totals. The pane's "Nothing tagged." shows when no open todos, none loaded done,
  and `done_count` is 0, because done todos only load while Show completed is on.
- Task 5: phone/desktop layout is asserted by class (`hidden sm:block`, `sm:hidden`) via
  `data-testid` on the two wrappers; jsdom has no media queries. Not checked in a browser.
- Task 3: `DoneItem` also got `hidePersonId` (the brief names it for `TodoRow`
  only; the person pane renders done rows through `DoneItem`).
- Task 6: `PersonPane` gained required `onMerged` and `onDeleted` props (wired in `PeopleView`
  to `onOpenPerson` and `onClosePerson`); the two existing `PersonPane` test render calls were
  updated. Limits became `PERSON_NAME_MAX`, `PERSON_ALIAS_MAX`, `PERSON_ALIASES_MAX` in
  `constants.ts`. Client-side limit errors show inline under the form (no `maxLength` on the
  field, so over-length input is explained rather than silently cut). Saving an unchanged
  edit closes without a request. Menu, dialogs and phone return-to-list were checked in jsdom
  only, not in a browser.

## Resume

Branch `feature/people-tags` in
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags`. Task 0 is done;
continue at the task named under Next action. Every git command uses `-C` with
that path. Run `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-check.sh`
for the full check; pass is `TSC_OK`, a lint total not above 5, and nothing
between the comm markers.
