<!-- verified-at: HEAD -->

# feature/people-tags-p3 — in flight

People tags phase 3b: people on the proposal review screen (chips per state,
the layout A chooser, a People section for `people_changes`, the "N people
need you" Apply blocker, exact-ref serialize). Spec: workspace
`docs/superpowers/specs/2026-10-29-people-tags-p3-design.md` §6, over rev 2
§5.3. Plan: workspace repo `docs/superpowers/plans/2026-10-29-people-tags-p3-webapp.md`
(on workspace branch `spec/people-tags-p3`). Backend half: yeezles-todo #84,
merged as `a9c7d63`.

## Next action

PR open against `master` (David approved: fix the blocker message, then PR).
David merges. After merge: bump the workspace pin, then open the workspace PR
for `spec/people-tags-p3` (merge `origin/main` into it first).

## Verified

- Task 0 (2026-10-29): worktree `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p3`,
  branch `feature/people-tags-p3` from `origin/master` `2fc4a99` (Merge pull
  request #33; master had not moved since plan time). Upstream unset so a bare
  push cannot reach `master`. `npm ci` ok. Baseline: `tsc -b` exit 0
  (`TSC_OK`); eslint 5 problems; vitest 703 total, 703 passed, 0 failing names.
- Task 1 (2026-10-29): types (`PersonRef`, `PersonCandidateDetail`, `RefState`,
  `ResolvedRef`, `ResolvedPeopleChange`, `PeopleChange`) and draft state
  (`DraftPersonRef`, `DraftPeopleRow`, `choosePerson`/`addPerson`/
  `togglePeopleRow`/`toggleRemoval`, `needsYou`, `peopleNeedingYou`, serialize,
  attachErrors). New `proposalDraft.people.test.ts` 32 tests; RED was 29 failed
  | 3 passed before the implementation, GREEN `proposalDraft.*` 4 files, 97
  tests. Existing `proposalDraft.{init,reducer,serialize}` tests unchanged.
  Deviation: `PathIndex.people_changes` and `refPaths` are optional and left
  out when empty, because an existing serialize test `toEqual`s the whole
  pathIndex. Check script: TSC_OK, lint 5 (baseline 5), 735 tests total, 735
  passed, 0 new failing names.
- Task 2 (2026-10-29): `ProposalPersonChip`, `PersonChooser`, `PeopleField`
  `compact`, `chipConfirmed`/`chipNeedsYou` in `ui/styles.ts`. New
  `ProposalPeople.test.tsx` 30 tests plus 1 `PeopleField` compact test; RED was
  the new file failing to import and the compact test failing, GREEN
  `src/components/proposals` + `src/components/people` all passing. Check
  script: TSC_OK, lint 5 (baseline 5), 771 tests total, 771 passed (after fix round 1), 0 new
  failing names. Chip colours use existing tokens (`ok`, `accent`), no
  deviation. Not yet used by any screen (Task 3 wires it).
- Task 3 (2026-10-29): `PeopleChangesSection`, `PersonRefChips`, people line
  and `+ person` in `NewTodoRow`, section wired into `ProposalReview`, people
  summary line in `ReadOnlyProposal`; `refPerson` helper in `proposalDraft.ts`.
  RED: ProposalSections file failed to import `PeopleChangesSection`, 2
  ProposalReview people tests failed; GREEN `src/components/proposals` 85
  passed. Check script: TSC_OK, lint 5 (baseline 5), 779 tests total, 779
  passed, 0 new failing names. Removal toggle: button `Keep <name>` (aria-label
  `Remove <name>` once kept, aria-pressed); the group's `Remove <name>` label
  applies only while the removal stands.
- Task 4 (2026-10-29): docs only. `docs/FEATURES.md` gains "People on
  proposals (phase 3)" under People; `docs/STATUS.md` gains a "People on
  proposals (phase 3b)" entry and the P3 line comes off the phase 2 "later"
  list. Final check script: TSC_OK, lint 5 (baseline 5), 779 tests total, 779
  passed, 0 new failing names. `npm run build`: `tsc -b` + vite ok, "built in
  863ms", `dist/assets/index-NjQ_UTMX.js` 501.00 kB (150.57 kB gzip); only
  the existing >500 kB chunk-size warning.
- Final-review fix wave (2026-10-29): 422 on a chip now marks its row
  (`data-draft-error`) so the page scrolls to it; the removal toggle has a
  stable `Keep <name>` name with `aria-pressed`; focus lands on the settled
  chip's x after a pick, on the next chip (else "+ person", or the row
  checkbox on people rows) after a Drop, and on "+ person" after an add; a
  people row with nothing left to send no longer counts as accepted; a Link
  pick renders linked; the x names the person; the "+ person" field closes on
  Escape and outside click; a pre-P3 proposal test. Check script: TSC_OK,
  lint 5 (baseline 5), 794 tests total, 794 passed, 0 new failing names.
  The final review found Review Focus 2's premise out of date: unchecking a
  new topic moves its todos to No topic and keeps them accepted (existing
  Decision 6), so their people still count, which is correct.
- Blocker-message fix (2026-10-30, David's call after the final re-review
  found it): a lone accepted people row whose only add still needs a pick now
  counts as accepted, so Apply says "1 person needs you." instead of "Nothing
  accepted. Reject instead." (`peopleRowCounts` in `src/utils/proposalDraft.ts`).
  RED: the new `proposalDraft.people` test failed (1 failed, 33 skipped);
  GREEN: `src/utils/__tests__` 139 passed. Check script: TSC_OK, lint 5
  (baseline 5), 795 tests total, 795 passed, 0 new failing names.
  `npm run build` ok, "built in 917ms", `index-BR8CKS9d.js` 502.18 kB (150.94 kB
  gzip), only the existing >500 kB chunk-size warning.
- Pre-P3 payloads: against the real backend, whose stored payload gives every
  new todo `people: []` (yeezles-todo `src/models/Proposal.ts:142`), a pre-P3
  proposal sends `people: []` per todo (same meaning, harmless). The identical
  round trip holds only for payloads lacking the key (mocks, older rows).
- Check script (outside the repo, never committed):
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p3-check.sh`, a copy
  of P2's with paths and prefix changed; run it with no argument to compare,
  `baseline` to rewrite. Baseline files `people-tags-p3-baseline-lint.txt` and
  `people-tags-p3-baseline-tests.txt` sit beside it.

## Deviations and rulings

Controller rulings, as built:

- P1: a pick from a `PersonCandidateDetail` becomes `TodoPerson { id, display_name, peopler_id, peopler_url: null }`.
- P2: a people row whose change is `missing` inits unaccepted; `togglePeopleRow` is a no-op on it.
- P3: `remove[].kept: true` means the removal stays in the proposal (default true); the UI "keep the person" toggle sets it false; serialize sends only `kept === true` removals.
- P4: serialize leaves an accepted new todo's `people` key out unless the draft has refs or the stored todo had the key; `people_changes` is omitted when empty. Existing `proposalDraft.*` tests unchanged.
- P5: `people_changes[i].remove[j]` / `.todo_id` errors set the row's error; `.add[j]` sets that ref's error; `refPaths` covers `new_todos[i].people[j]` and `people_changes[i].add[j]`.
- P6: Create/New picks carry the original ref's `peopler_id`; New linked person always does.
- P7: `addPerson` keys are `p:<owner>:a<nextSeq>`, bumping `draft.nextSeq`.
- P8: `hasErrors` counts ref errors and people-row errors; `choosePerson` clears that ref's error.
- P9: a removal whose person is null does not count toward the blocker; renders struck through as `person <id>`; still sent if kept.
- P10: a chip whose `chosen` is set renders as its pick (a person or link pick as that person's name; a create pick as `+ <name> · new` in chipConfirmed) with a × remove button.
- P11: `PeopleField` `compact` is match-only; no Create, no POST /people from the review screen. New people are made at apply.
- P12: Escape anywhere while the chooser is open closes only the chooser (capture-phase listener; defers to an open combobox list first).
- P13: keep-removal is a separate toggle per removal chip; un-kept removals render unstruck; one leading "+" per additions group; no "+ person" on people rows.

Other deviations:

- Task 1: `PathIndex.people_changes` and `PathIndex.refPaths` are optional and omitted when empty (an existing serialize test `toEqual`s the whole pathIndex); read with `?.`.
- Task 3: `refPerson` lives in `proposalDraft.ts`, not a component file, to satisfy react-refresh lint.

## Walkthrough (Task 4 step 3): NOT RUN

Reason for all four: David has not chosen a local sign-in path, and creating a
session directly in the DB was refused earlier and must not be tried.

1. NOT RUN: matched, by-name, confirmed-new and ambiguous person; chips render, chooser opens on the row.
2. NOT RUN: choose a candidate; Apply enables; the applied todo carries the right people.
3. NOT RUN: people-only proposal; People section, keep-removal toggle, apply.
4. NOT RUN: chooser fits on screen at 390px (only unit-tested with a stubbed viewport).

P2's owed walkthrough (`docs/state/feature/people-tags.md`) is still owed too.

## Assumed / not run

- Open for David: (a) "+ person" appears on pre-P3 proposals too; spec §6.3
  (every row) vs Review Focus 1 ("no people line"); kept per spec. (b) With two
  unlinked namesakes the link_candidate options "Link Sam Lee to Peopler" /
  "Just tag Sam Lee" repeat identically; adding candidate detail would change
  fixed plan copy, so it is David's call.

- Parked minors from the final re-review, not fixed: (a) picking a person
  already on that todo (dedupe) drops focus to the page body; (b) Escape in
  the "+ person" compact field may close the whole field while its combobox
  list is open, when it should close only the list (not verified); (c) the
  `drop` branch in the settled-chip render is dead code, since a drop removes
  the ref.
- Walkthrough items 1-4 above: not run. The look of the chips, the chooser
  placement and the 390px fit are unseen in a real browser.
- Docs describe the built behaviour from the code and the task reports, not from
  watching the app run.
- Backend CI for #84 failed on both the PR and the `main` push run, on one
  test, `BackupManager.test.ts:385` (next scheduled backup 24.53 h, expected
  <= 24; both runs near 01:25 UTC, so it looks time-of-day dependent). Not
  investigated; David said to go ahead with P3b anyway.
- No real backend has been called. Every test in this plan uses mocks.
