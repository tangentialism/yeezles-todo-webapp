<!-- verified-at: HEAD -->

# feature/people-tags — in flight

People tags phase 2: the webapp People tab, person chips, People field, and
rename/alias/merge/delete. Spec: workspace
`docs/superpowers/specs/2026-10-28-people-tags-design.md` (rev 2). Plan: workspace
repo `docs/superpowers/plans/2026-10-29-people-tags-webapp.md`.

## Next action

David reviews; on approval push and open the PR `feature/people-tags` → `master`;
after merge, pin the webapp in the workspace and plan P3.

Before or during review, decide whether to run the browser walkthrough (Task 9
Step 2), which was not run: local sign-in needs a session that could not be
created here (see Assumed).

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
- Task 2: RED `npx vitest run` on the three new suites before implementing: 3 of 3
  suites failed. `usePeopleStore.test.tsx` failed at import (missing
  `usePeopleStore`/`peopleInvalidation` modules), so none of its tests ran; among
  the tests that did run (the other two suites), 7 failed and 1 passed (no
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

- Task 7: Dialog listener checked first: `Dialog.tsx` adds one bubble-phase `document` keydown
  listener (no capture), so `stopPropagation()` in the combobox's React `onKeyDown` (React listens
  on the root and on portal containers, both below `document`) stops Escape before it. Pinned:
  removing that `stopPropagation()` makes both Escape tests fail (2 failed, 9 passed), then restored.
  No debounce helper existed (grep), so `useDebouncedValue` was added; replacing it with the raw text
  makes the "queries once" test fail (1 failed), then restored. RED
  `npx vitest run src/components/people/__tests__/PeopleField.test.tsx src/components/ui/__tests__/Dialog.nested.test.tsx`:
  2 suites failed; PeopleField failed to load (`Failed to resolve import "../PeopleField"`), Dialog
  1 failed (fullScreenOnPhone classes missing), 5 passed. GREEN: 2 suites, 17/17 (PeopleField 11,
  Dialog.nested 6), no stderr. Check script: `TSC_OK`, 691 total, 691 passed, 0 failing names,
  lint 5 (baseline 5), new failing names empty. New and touched files lint clean.

- Task 7 fix round 1: the active option is held by key (`person-<id>` or `create`), not index, so
  matches arriving after the debounce cannot move Enter onto a namesake; a pending Create appends to
  the latest `value` (ref synced each render), so picks and chip removals made meanwhile survive.
  RED `npx vitest run src/components/people/__tests__/PeopleField.test.tsx`: 2 failed, 11 passed
  (Create "Sam" lost `aria-selected` once "Sam Lee"/"sam" arrived; last `onChange` after the create
  still held the removed chip). GREEN: PeopleField 13/13 and Dialog.nested 6/6, no stderr. Check
  script: `TSC_OK`, 693 total, 693 passed, 0 failing names, lint 5 (baseline 5), new failing names empty.
- Task 8: RED `npx vitest run src/components/__tests__/TodoForms.people.test.tsx`:
  8 tests, 5 failed (no People chips/combobox in the forms), 3 passed (the three
  "no people key" cases, which hold before implementing, as expected). GREEN:
  1 suite, 8/8 passed, output pristine (logger mocked). Existing `AddTodoModal.test.tsx`
  and `TodoForms.topics.test.tsx` broke (22 tests, no QueryClient for the field);
  fixed by mocking `usePeopleStore` there, as they already mock `useTopicStore`.
  Check script: `TSC_OK`, 701 total, 701 passed, 0 failing names, lint 5
  (baseline 5), new failing names empty. New and touched files lint clean.
- Task 9 (docs and final check; no TDD, docs only): README People bullet,
  `docs/FEATURES.md` People section, `docs/STATUS.md` People tags (phase 2) entry.
  Final check script on `2178c19` plus this task's doc edits: `TSC_OK`, 701
  total, 701 passed, 0 failing names, lint 5 (baseline 5), new failing names
  empty. Every suite this plan added or touched, by name (23 files, from
  `git diff --name-only 1bb2072..HEAD`): AddTodoModal, Dashboard.people,
  Navigation, PhoneTabBar, TodoForms.people, TodoForms.topics, TodoRow.people,
  ViewContainer, DeletePersonDialog, EditPersonDialog, MergePersonDialog,
  PeopleField, PeopleView, PersonChip, PersonPane, Dialog.nested,
  useCrossTabSync.people, usePeopleStore, useProposalStore, useTodoStore.people,
  useTopicStore, api.people, groupByArea: 23 files passed, 171 tests passed, no
  stderr. `npm run build` (tsc -b && vite build): 261 modules, built, no errors.
- Task 9 browser walkthrough: NOT RUN (0 seen, 0 not seen, 11 not run). A local
  backend did start: a detached `yeezles-todo` worktree at `origin/main`
  `5651d7c` (after `46b3510`), built with `tsc`, against a new local database
  `yeezles_people_tags_browser` on the local test PostgreSQL, port 3010; `/health`
  reported 14/14 migrations, last `add_people`. It logged "No sign-in method is
  configured — nobody can sign in" (no Google client id, no passkey config).
  Signing in would have meant minting a persistent session for a fake user
  directly in the database, which the session's permission check refused, and the
  task rules say not to work around auth. The walkthrough stopped there, before
  Vite was started. The backend was stopped, the database dropped and the
  worktree removed.

## Assumed

- Task 4: the five phone tabs do not wrap at 320px (assumed, checked by reading classes;
  browser check in Task 9). Bar is `px-2`, so 304px / 5 = 60.8px per `flex-1` tab; the
  longest label ("Topics"/"People", 6 chars at 11.5px, about 40px) fits, and the widest
  count case ("Today 12", about 58px) is close but only appears with a badge. The 11px
  fallback was therefore not applied. No visual check was run.

- The backend at `yeezles-todo` `46b3510` serves `/people` and `people` on todos as documented in its `docs/api/API.md`.
  Every API call in this branch is tested against a mocked client; none was made against a real backend.
- Browser walkthrough (Task 9 Step 2) not run; every item below is unverified in a browser and rests on
  jsdom tests only:
  1. Create a todo with a new person (Create …) and with an existing one: not run.
  2. Click a chip in All, then in Today: not run.
  3. People tab list order, the dimmed zero-open person, Show completed: not run.
  4. Complete a todo from the pane: not run.
  5. Rename with a second tab on All, that tab's chip changes: not run (cross-tab is tested by
     `useCrossTabSync.people.test.tsx` with a mocked BroadcastChannel only).
  6. Merge two people: not run.
  7. Delete a person, the todo stays: not run.
  8. At 390px: list, person, back; the People sheet in the add form; the five-tab bar at 320px: not run.
  9. (carried from Task 4) five-tab phone bar at 320px without wrapping: not run; still assumed from
     classes (see the Task 4 bullet above). The 11px fallback was not applied.
  10. (carried from Task 7) the phone full-screen People sheet layout: not run; asserted by class only.
  11. (carried from the Task 5 review) the People list stays scrollable when taller than the viewport:
      not run. Risk, unconfirmed: `PeopleView.tsx` gives the list wrapper `sm:sticky` with no max-height
      or overflow, so from `sm` up the bottom of a long list may be unreachable. Not fixed here (bug
      fixes are out of scope for Task 9); final review should triage it.
- Why it was not run: the local backend has no sign-in method configured (no Google client id, no
  passkey RP config), and creating a session directly in the local database was refused by the
  session's permission check. Running it needs David's choice of a local sign-in path (for example,
  allowing a minted persistent-session cookie for a fake user on the local test database, as the topics
  UI walkthrough did).
- Not run: the deployed app and the hosted backend.

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
  only; the person pane renders done rows through `DoneItem`). Controller ruling.
- Task 3 fix round 1 (controller ruling): a linked `PersonChip`'s accessible name is
  `Open person ‹name› (in Peopler)`, the plan's label plus a suffix, so the screen-reader
  "in Peopler" hint survives `aria-label`. Tests that query a linked chip use a regex.
- Spec discrepancies applied (plan § Spec discrepancies, all eleven): 1 the list asks for
  `limit=100` with the "Showing the 100 most recently tagged." footer; 2 on phones the person opens
  in place of the list, tab bar visible; 3 desktop right pane prompt, no auto-select; 4 person todos
  from two area-less queries, done only while Show completed is on; 5 `['personTodos', id, completed]`
  key, invalidated wherever `['topicTodos']` is (widened by the Task 2 ruling); 6 the optimistic
  update drops `people`; 7 the edit form sends `people` only when the set changed; 8 the shown
  person's chip is hidden in their pane; 9 People-field save errors use the store toast; 10 the
  single-tag routes are unused; 11 Create makes the person at once, even if the form is cancelled.
- Task 6: `PersonPane` gained required `onMerged` and `onDeleted` props (wired in `PeopleView`
  to `onOpenPerson` and `onClosePerson`); the two existing `PersonPane` test render calls were
  updated. Limits became `PERSON_NAME_MAX`, `PERSON_ALIAS_MAX`, `PERSON_ALIASES_MAX` in
  `constants.ts`. Client-side limit errors show inline under the form (no `maxLength` on the
  field, so over-length input is explained rather than silently cut). Saving an unchanged
  edit closes without a request. Menu, dialogs and phone return-to-list were checked in jsdom
  only, not in a browser.
- Task 7: Enter with the list open but no option moved to does nothing (and does not submit the
  form); Enter never picks the first match by itself, so typing "Sam" + Enter cannot tag "Sam Lee".
  The 20 limit is `PEOPLE_PER_TODO_MAX` in `constants.ts`. On phones the "Add people" button carries
  the field `id`, and the label row is plain text (a `<label>` would rename the button to "People");
  the sheet's combobox is `${id}-sheet` with an sr-only "People" label and autofocus. The create error
  shows the `ApiError` message, falling back to "Could not create that person.". `useIsPhone` and
  `useDebouncedValue` have no tests of their own (PeopleField mocks `useIsPhone`); the sheet layout
  is asserted by class only, not checked in a browser.

## Resume

Branch `feature/people-tags` in
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags`. Tasks 0-9 are done; the
branch is not pushed and has no PR. Continue at Next action: David's review, then
(each gated on David) push, `gh pr create --base master`, and after merge the
workspace pin and the P3 plan. If the browser walkthrough is wanted first, it needs a
local sign-in path decided by David (see Assumed). Every git command uses `-C` with
that path. Run `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-check.sh`
for the full check; pass is `TSC_OK`, a lint total not above 5, and nothing
between the comm markers.
