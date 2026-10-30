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

Task 3 of the plan: wire `ProposalPersonChip` into the review rows (new todo
rows and the People section), with the removal chips and "+ person". Failing
test first.

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
  script: TSC_OK, lint 5 (baseline 5), 766 tests total, 766 passed, 0 new
  failing names. Chip colours use existing tokens (`ok`, `accent`), no
  deviation. Not yet used by any screen (Task 3 wires it).
- Check script (outside the repo, never committed):
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p3-check.sh`, a copy
  of P2's with paths and prefix changed; run it with no argument to compare,
  `baseline` to rewrite. Baseline files `people-tags-p3-baseline-lint.txt` and
  `people-tags-p3-baseline-tests.txt` sit beside it.

## Assumed / not run

- The plan's file and line references are as of plan time; `master` is the
  same commit, so they should hold, but no task has checked them yet.
- Backend CI for #84 failed on both the PR and the `main` push run, on one
  test, `BackupManager.test.ts:385` (next scheduled backup 24.53 h, expected
  <= 24; both runs near 01:25 UTC, so it looks time-of-day dependent). Not
  investigated; David said to go ahead with P3b anyway.
- No real backend has been called. Every test in this plan uses mocks.
