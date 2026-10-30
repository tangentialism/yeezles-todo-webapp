<!-- verified-at: HEAD -->

# fix/chooser-inner-list — in flight

Follow-up to #35. Found by the production browser check (workspace issue
#29, 2026-10-30): in a person chooser that had opened **above** its chip,
"Pick someone…" showed its matches in a list that still hung **below** the
input (`top-full`). That list covered the chooser's own Drop option and the
chip: at 1280×714 it ran 478–572 over Drop at 478–518; at 390×844, 555–657
over Drop at 555–599. It cleared the Apply bar in both cases.

Fix, as David chose ("in-flow list"): `PeopleField` takes `inlineList`
(with `compact`), which renders the matches in the flow under the input
instead of floating, and skips the float's own up/down placement. Only
`PersonChooser` passes it, so the chooser grows to hold its matches and
covers nothing. The row-level "+ person" field (`NewTodoRow`) keeps the
floating list unchanged. Because the chooser now grows as matches arrive,
it re-measures on every resize (`ResizeObserver`, when present) as well as
on "Pick someone…", and flips above the chip if growing would take it to
the Apply bar.

## Next action

David reviews and merges the PR. After it deploys: in a real browser on
production, open "Pick someone…" in a last-row chooser at 1280×714 and
390×844, type a name that matches, and check the matches sit between the
input and Drop and nothing crosses the Apply bar. Then bump the workspace pin.

## Verified

- Worktree `/Users/davidyee/Code/yeezles-todo-webapp-wt/chooser-inner-list`,
  branch `fix/chooser-inner-list` from `origin/master` `507705e` (Merge pull
  request #35). `npm ci` ok.
- Baseline (`chooser-inner-list-check.sh baseline`, clean worktree): TSC_OK;
  eslint 5 problems; vitest 804 total, 804 passed, 0 failing names.
- RED: two new tests in `ProposalPeople.test.tsx` failed, and the other 44
  passed. "lists its matches inside the chooser" got a listbox class
  starting with `absolute`. "flips upward when … matches make a below
  chooser reach the bar" got `top-full`. The second test's first geometry
  (chip at 200) failed after the fix too, because there was more room below
  than above, so it correctly stayed down. That was a test bug: the chip was
  moved to 400. RED was re-confirmed with the fix stashed (2 failed), then
  GREEN (46 passed).
- GREEN (`chooser-inner-list-check.sh`): TSC_OK; lint 5 (baseline 5);
  vitest 806 total, 806 passed, 0 new failing names. The existing compact
  `PeopleField list placement` tests (floating list, up or down) pass
  unchanged.
- `npm run build` ok; only the existing >500 kB chunk-size warning.

## Assumed / not run

- Not checked in a real browser. jsdom has no layout or `ResizeObserver`:
  the test stubs both.
- The in-flow list keeps its card styling (border, shadow, rounded), so in
  the chooser it reads as a card inside a card. Not seen yet.
- An upward chooser that keeps growing can, in principle, reach the top of
  the window. At 8 matches (`max-h-72`) the chooser is about 470px tall, so
  not expected on a last row at the measured sizes.
