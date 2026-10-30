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

Task 1 of the plan: types and draft state (`src/types/proposal.ts`,
`src/types/person.ts`, `src/utils/proposalDraft.ts`), failing test first.

## Verified

- Task 0 (2026-10-29): worktree `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p3`,
  branch `feature/people-tags-p3` from `origin/master` `2fc4a99` (Merge pull
  request #33; master had not moved since plan time). Upstream unset so a bare
  push cannot reach `master`. `npm ci` ok. Baseline: `tsc -b` exit 0
  (`TSC_OK`); eslint 5 problems; vitest 703 total, 703 passed, 0 failing names.
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
