<!-- verified-at: HEAD -->

# fix/chooser-under-apply-bar — in flight

On the proposal review screen the fixed Apply/Reject bar painted over the
bottom of the person chooser and of the compact "+ person" typeahead list when
the chip or row was on the last row (seen in production: at 1280×714 the bar
top was 649 and the chooser's "Drop" sat at 655–695; at 390×844 the bar top was
779 and Drop was 752–796; the "+ person" listbox ran 611–665).

Fix: the bar marks itself `data-viewport-floor`. A new helper,
`src/utils/popoverPlacement.ts` (`viewportFloor`, `shouldOpenUpward`), treats
the top of any laid-out floor element (else the window bottom) as the lowest
point a popover may reach. `PersonChooser` and the `PeopleField` combobox list
measure themselves below their anchor and switch from `top-full mt-1` to
`bottom-full mb-1` when they would cross that line and either fit above or have
more room above than below. Once flipped they stay flipped while open (the
chooser re-measures when "Pick someone…" makes it taller; the list re-measures
on each open and as matches arrive). No z-index or padding change.

## Next action

PR open against `master` (David approved the PR on 2026-10-30). David merges. After it deploys: check in a real browser on production at 1280×714 and 390×844 that the chooser and the "+ person" list on a last-row chip open above the chip and clear the Apply bar, including a chooser opened upward with "Pick someone…" in use; then bump the workspace pin.

## Verified

- Worktree `/Users/davidyee/Code/yeezles-todo-webapp-wt/chooser-under-apply-bar`,
  branch `fix/chooser-under-apply-bar` from `origin/master` `d91b5f1` (Merge
  pull request #34). Upstream unset. `npm ci` ok.
- Baseline (`chooser-under-apply-bar-check.sh baseline`, clean worktree):
  TSC_OK; eslint 5 problems; vitest 795 total, 795 passed, 0 failing names.
- RED, before any implementation change: the three touched test files ran 91
  tests, 7 failed | 84 passed. Failing: 4 `PersonChooser vertical placement`
  tests (class was `top-full`, expected `bottom-full`; the Escape-after-flip
  test failed on a test bug, two dialogs matched, fixed before GREEN), 2
  `PeopleField list placement` tests (listbox class had neither `bottom-full`
  nor `top-full`), and the `ProposalReview` test that the fixed bar carries
  `data-viewport-floor`. The 2 "stays below" chooser tests passed at RED, as
  expected (they guard against flipping when it fits).
- GREEN (`chooser-under-apply-bar-check.sh`): TSC_OK; lint 5 (baseline 5);
  vitest 804 total, 804 passed, 0 new failing names. The existing 390px
  horizontal-fit tests, the chooser Escape tests and the pick/Drop focus tests
  pass unchanged.
- `npm run build`: `tsc -b` + vite ok, `dist/assets/index-Fb7LPlf_.js`
  503.01 kB (151.34 kB gzip); only the existing >500 kB chunk-size warning.

## Assumed / not run

- Not checked in a real browser. jsdom has no layout, so the tests stub
  `getBoundingClientRect` and `innerHeight` with the measured production
  numbers; the controller will confirm in a browser at 1280×714 and 390×844.
- The flipped chooser can still overflow the top of the window if it is taller
  than the space above the chip as well as below; it then takes the larger
  side. Not expected at real sizes (the chooser is ~240px).
- The list placement also applies to the non-compact `PeopleField` in the add
  and edit forms (same combobox). With no floor element there it flips only
  when the list would run off the window bottom; not browser-checked.
