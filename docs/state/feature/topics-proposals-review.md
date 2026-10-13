<!-- verified-at: HEAD -->

# feature/topics-proposals-review — in flight

Phase 3b of the topics feature: the webapp proposal review screen at
`/topics/proposals/:id`, plus the pending badge, banner and dashboard
hand-back. Spec: workspace
`docs/superpowers/specs/2026-10-13-topics-webapp-design.md`. Plan: workspace
`docs/superpowers/plans/2026-10-13-topics-webapp-proposals.md`.

## Next action

PR review; then the workspace pin bump to the merge commit; then phase 4
(remove dead tags). Push and `gh pr create --base master` are gated on David.

## Verified

### Run by the Task 8 session (2026-10-13)

- Final full check (the steps of
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-proposals-review-check.sh`
  run from a copy without its temp-dir cleanup, as the session's permission
  classifier refused the script itself): `TSC_OK`; 547 tests, 547 passed, 0
  failing names; lint now 5, baseline 5; new failing names empty.
- Named suites (the brief's list plus Ruling L16's Dashboard, useNavCounts,
  TodoForms.topics and all of `src/components/topics/__tests__`): 25 files,
  176 tests passed.
- `npm run build` (`tsc -b && vite build`): succeeded, 245 modules, no errors.
- Ruling T7-M1: two edit-flow tests added to `TodoForms.topics.test.tsx`
  (13 passed). (a) The ruling's test: a todo with topic 7 in area 1, area
  changed to Work, save sends `area_id: 2, topic_id: null`. It passes, and it
  still passes with `topicCleared ||` deleted from `EditTodoModal.tsx`: an
  area change sets `topicId` to null, which already differs from the loaded 7.
  (b) Added so the clause is pinned: a todo with no topic, Kitchen reno picked,
  area changed to Work, save sends `area_id: 2, topic_id: null`. With
  `topicCleared ||` deleted it FAILS (payload has `area_id: 2` and no
  `topic_id`); restored, it passes.
- Browser walkthrough (Claude in Chrome, local backend `yeezles-todo` at
  `e53b2eb` with `src` compiled to a scratch dir, separate database
  `yeezles_topics_review_check`, fake user signed in with a minted
  persistent-session `remember_token` cookie). Proposals were created with
  `POST /proposals` and the session cookie (201; no token needed). Tab
  viewport 606 px; the tab reported `visibilityState: hidden` throughout.
  1. SEEN: "Topics 3 (3 pending)" on the tab bar and a "3 proposals waiting"
     banner above the topics list, one link per proposal.
  2. SEEN: banner link opens `/topics/proposals/1`, "4 of 4 accepted", topics
     as sections.
  3. SEEN: unchecking the new topic unchecks its row and note ("1 of 4
     accepted", row shows "needs a topic"); re-checking restores 4 of 4.
  4. SEEN: redirecting "Fix sink" from Kitchen reno to Garden moves the row
     under a Garden section.
  5. SEEN: renaming "Review test" to "Pantry" renames the rows' topic select.
  6. SEEN: Unassigned (2) tab, "Hang shelf" set to Pantry; By topic shows it
     under Pantry, "5 of 5 accepted", "Apply 5 changes".
  7. SEEN (landing); highlight SEEN on the Review Focus 5 run only: after
     Apply the app landed on the Topics tab with Pantry (2 open, note
     "First."), Garden 1 open, badge "Topics 2". The 2 s highlight had ended
     before the first settled screenshot here; it was recorded on the
     proposal 3 run below.
  8. SEEN: reopening `/topics/proposals/1` shows the read-only view ("Applied
     just now"). The added Unassigned todo reads "Todo #4": the server
     resolves only the original payload's todos (plan discrepancy 5,
     documented in `ReadOnlyProposal`).
  9. SEEN: proposal 2 open in two tabs, applied in one; the other turned
     read-only ("Applied just now", no Apply) without a reload, within the
     3 s wait (MutationObserver timestamp, hidden tab).
  - Review Focus 5 SEEN: with Home selected, applying proposal 3 (Work)
    switched the area to Work (stored area id 3 to 4, blue area dot), opened
    the Topics tab, and gave the "Work review" card `bg-accent-soft` for about
    1.9 s (observer log t=17248 to 19130 ms). Router state was null after.
  - Hand-back consumed once SEEN: reloading after landing showed the All view
    (not Topics), no highlighted card polled from 0.2 s to 2.7 s after load,
    router state null.
  - Screenshots (uncommitted) under
    `/Users/davidyee/.claude/jobs/291300d3/tmp/shots/3b/`: 390 px and 1280 px
    of the review page (same-origin iframes), plus 606 px shots of items 1, 2,
    5, 7, 8, 9 and Review Focus 5.

### Reported by earlier task sessions

- Task 7: the brief's tests written first and RED (6 files, 6 failed:
  unresolved import `../ProposalBanner`; `useTopicsHandoff is not a function`
  x2; no "Topics (2 pending)" / "(3 pending)" button; hand-back left the view
  on `all`; no `proposal-banner`). Ruling M1: with everything else in place the
  TopicsView highlight test was RED on `.not.toHaveClass('bg-surface')`
  against the 3a TopicCard, then GREEN after the fix. GREEN: ProposalBanner 3,
  useTopicsHandoff 2, Navigation 15, PhoneTabBar 5, TopicsView 10,
  Dashboard.topics 2, Dashboard 3 = 40 passed. Two `usePendingProposalCount`
  tests in `useNavCounts.test.tsx` (7 passed) were written after the hook,
  not RED-first. Step 5b (Ruling M2): the "untouched save of a todo with no
  known topic sends no topic_id" test RED (`topic_id` present), then GREEN:
  TodoForms.topics 11 passed. Full check: `TSC_OK`; 545 tests, 545 passed, 0
  failing names; lint now 5, baseline 5; new failing names empty.
- Task 6: `ProposalReview.test.tsx` and the `AppRoutes` describe written first
  and RED (unresolved import `../ProposalReview`; signed-in
  `/topics/proposals/7` rendered the dashboard; the signed-out test already
  passed, as `/*` also renders LoginButton at the same URL), then GREEN:
  ProposalReview 16 (brief's 10 plus rulings M4 x3, L5, L4 x2), ProposalSections
  9, AppRoutes 6 = 31 passed. Full check: `TSC_OK`; 532 tests, 532 passed, 0
  failing names; lint now 5, baseline 5; new failing names empty.
  Fix (Ruling L4b): test "keeps a loaded draft when a background refetch
  returns 404" written first and RED (found "Proposal not found"), then GREEN:
  ProposalReview 17 + AppRoutes 6 = 23 passed. Full check: `TSC_OK`; 533
  tests, 533 passed, 0 failing names; lint now 5, baseline 5; new failing
  names empty.
- Task 5: `ProposalSections.test.tsx` written first and RED (unresolved import
  `../ProposalTopicSection`), then GREEN: 9 passed (brief's 8 plus 1 for
  Ruling L25). Full check: `TSC_OK`; 514 tests, 514 passed, 0 failing names;
  lint now 5, baseline 5; new failing names empty.
- Task 4: `proposalDraft.serialize.test.ts` written first and RED (8 failed,
  `serialize`/`summarizeAccepted` not functions), then GREEN: serialize 8 +
  reducer 18 + init 11 = 37 passed (brief's 6 plus 2 added: takenName absent
  from the payload; second serialize rebuilds pathIndex after partial fixes).
  Full check: `TSC_OK`; 505 tests, 505 passed, 0 failing names; lint now 5,
  baseline 5; new failing names empty.
- Task 3: `proposalDraft.reducer.test.ts` written first and RED (18 failed,
  `draftReducer` not exported), then GREEN: reducer 18 + init 11 = 29 passed
  (brief's 14 plus 4 ruling tests). Full check: `TSC_OK`; 497 tests, 497
  passed, 0 failing names; lint now 5, baseline 5; new failing names empty.
- Task 2: `proposalDraft.init.test.ts` written first and RED (unresolved import
  `../proposalDraft`), then GREEN: 11 passed (brief's 9 plus 2 Ruling L10
  tests). Full check: `TSC_OK`; 479 tests, 479 passed, 0 failing names; lint now 5,
  baseline 5; new failing names empty.
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

- Not run: the hosted connector (`propose_topic_changes` over MCP from Claude)
  and the deployed app and backend. Proposals in the walkthrough came from
  REST with a session cookie.
- The backend at `yeezles-todo` `4db2fab` or later serves the Proposals API as
  documented in its `docs/api/API.md`; the walkthrough ran at `e53b2eb`.
- Google sign-in is not exercised; the walkthrough used the persistent-session
  cookie path.
- Visible-tab behaviour: the tab was hidden throughout, so the timings (cross
  tab read-only within 3 s, 1.9 s highlight) are from a throttled tab.
- The new-topic highlight after a same-area apply (item 7, proposal 1) was not
  seen on screen; only the cross-area run (proposal 3) recorded it.
- Layout at 390 px and 1280 px was seen for the review page only (iframes);
  the badge, banner and landing were seen at 606 px.
- In the automation, the first Apply click after a page navigation sent no
  request (no `POST /apply` in the backend log); a second click applied. Taken
  as a harness artifact of the hidden tab, not reproduced by hand.

## Deviations

- Task 8: FEATURES.md's Topics section is extended as briefed; README's Topics
  bullet under "Completed Features" gains a clause on proposal review (Ruling
  L17). The named-suite run includes Ruling L16's extra suites.
- Ruling T7-M1: the ruling's test cannot fail with `topicCleared ||` deleted
  (see Verified); a second test that does is added beside it.
- Ruling M3: `useProposal` also sets `gcTime: 0`; added a test asserting it.
- Ruling L10: `validateTopicName` refuses a name matching any `resolved.topics`
  or `area_topics` name, whatever the `is_new`/`exists` flags (a Ghost topic is
  refused). `knownNames` skips only a still-free new name (`is_new && !exists`),
  which is checked through `draft.topics` so the topic may keep its own name; a
  taken new topic (`is_new && exists`) still cannot be renamed to its own name.
  No brief test changed behaviour; two tests added.
- Ruling H2: the reducer helper is `mergeIntoExisting` (not `useExisting`, which
  trips rules-of-hooks); the action type string stays `'useExisting'`.
- Ruling L9: `rejectSection` and the `toggleTopic` cascade set `error: null` on
  every row, note and topic they touch; tests added for both.
- Ruling L11: `editNote` sets `cascaded: false`, so re-checking the topic does
  not re-accept an edited note; test added.
- Ruling L14: `DraftTopic` gains `takenName: string | null` (set by `initDraft`
  for a taken new topic). `renameTopic` keeps `taken` (and Use existing) while
  `normName(name) === normName(takenName)`, else plain validation; round-trip
  test added. No brief test changed behaviour.
- Rulings H3, L25, L26, L24, L6, L14 (UI) applied to Task 5: test imports no
  `vi`; open count only when `openCount !== null` (test added); topic headings
  are h2, in `ReadOnlyProposal` too; no Enter-to-add or form on the inline
  new-topic field; duplicate "Topic name" names accepted; Use existing shown
  while `taken`. No brief test changed behaviour.
- Rulings applied to Task 6: H1 (load-error text is
  `error instanceof Error ? error.message : 'Please try again.'`); L4 (the
  "Could not load" view only when `error && !resolved`; tests for both sides);
  L5 ("Apply 1 change" / "Apply N changes"; brief's `Apply ${n} changes`
  replaced, test added); L2 (network test asserts one apply call and Apply
  enabled after, retitled "leaves Apply enabled for a retry"); L21 (409 test's
  `refetch` flips the mock to `status: 'applied'` and asserts the read-only view
  and no Apply, besides the banner); M4 (rename taken topic to "Gate" clears the
  blocker; rejecting every section shows "Nothing accepted. Reject instead.";
  rejected proposal renders read-only); L26 (title is h1, test asserts level 1);
  L23 (reject confirm keeps `primaryButton`). No brief test changed behaviour
  beyond these.
- Ruling L4b: the "Proposal not found" view for a 404/400 ApiError also shows
  only when no proposal data is loaded; a background refetch error of any kind
  keeps the draft. A malformed id still shows not found (no query runs). Test
  added.
- Ruling L12: an existing topic section with no rows left is hidden; spec §6.2
  says one section per topic.
- Ruling L19: `draftTopicFromArea` is the single exported function, no local
  function plus alias.
- Ruling L1: store and cross-tab `PROPOSAL_RESOLVED` use `invalidateTopicViews`
  / `invalidateTodoViews` from `./topicInvalidation` (they already take filter
  options, no change needed) instead of hand-listed keys. The brief's tests
  assert the same keys via `objectContaining({ queryKey })`, plus
  `refetchType: 'active'` for the cross-tab test. The brief's "does not retry"
  test is split into apply-once and reject-once tests.
- Ruling M1 (deferred from 3a): `TopicCard` applies
  `highlighted ? 'bg-accent-soft' : 'bg-surface'` instead of both classes;
  the TopicsView highlight test also asserts `.not.toHaveClass('bg-surface')`.
- Ruling M2 (deferred from the 3a final review, done as Task 7 Step 5b):
  `EditTodoModal` sends `topic_id` only when it differs from the value loaded
  into the form (`todo.topic_id ?? null`, what the effect passes to
  `resetTopic`) or an area change cleared it. An untouched save no longer
  sends `topic_id: null` for a todo whose `topic_id` is undefined (stale
  cache). `area_id` is still always sent. Tests changed deliberately: "always
  sends area_id with topic_id" retitled "sends a changed topic with area_id"
  (it changes the topic, so still sends it); "archived current topic ... kept
  on save" now expects no `topic_id` key (the server keeps the topic while
  `area_id` is unchanged, spec §2.1 item 4). New test for the undefined case.
- Ruling L15: `TopicsView`'s `highlightTopicIds` is optional, default `[]`
  (a module-level constant); `ViewContainer`'s stays required.
- Ruling L20: `Dashboard.topics.test.tsx` had no `useTopicsHandoff` mock; the
  controllable one was added, not replaced. Both Dashboard suites' `useNavCounts`
  mocks gained `usePendingProposalCount`.
- Ruling L3: the hoisted hand-back value is reset in an `afterEach`.
- Ruling L7: the Navigation badge test sits inside `describe('Navigation')`
  (in its `Counts` block).
- Ruling L13: `ProposalBanner` is `src/components/topics/ProposalBanner.tsx`;
  spec §4.2 lists it under `components/proposals/`.
- Ruling L22: `useTopicsHandoff` clears the hand-back with
  `navigate(location.pathname, { replace: true, state: null })` (search/hash
  dropped, harmless at `/`).
- Added beyond the brief: two `usePendingProposalCount` tests in
  `useNavCounts.test.tsx` (null while unknown; counts the list).
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
Tasks 0-8 are done and the final check is green. Continue at Next action:
push and open the PR against `master` only once David says so. Every git
command uses `-C` with that path. Run
`/Users/davidyee/Code/yeezles-todo-webapp-wt/topics-proposals-review-check.sh`
for the full check; pass is `TSC_OK`, a lint total not above the baseline, and
nothing between the comm markers.
