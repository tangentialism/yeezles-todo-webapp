<!-- verified-at: HEAD -->

# chore/green-suite (webapp)

Branch from origin/master b52ba1d. Part of the workspace test suite cleanup.

## Baseline
- The cluster brief measured d298926: 63 failures, 8 clusters.
- Measured here at b52ba1d: 338 tests, 293 passed, 45 failed, identical in 3 runs (no flaky tests), 6 clusters.
- W1 (AddTodoModal) and W8 (AccomplishmentsView) were fixed on master by PRs #18/#19, so no issues were filed for them. W4 (ToastContext) fell from 6 to 1 failing test.

## Probe
`it.fails` on a timeout (200ms, never-resolving promise): 1 passed. So timeout clusters (W4, W6) use `it.fails`, not `it.skip`.

## Issues (label test-debt, tangentialism/yeezles-todo-webapp)
| Cluster | Issue | Tests |
|---|---|---|
| W2 AuthContext cannot stub window.google | #20 | 12 |
| W3 AuthContext expects pre-passkey state shape | #21 | 13 |
| W4 ToastContext auto-dismiss test times out | #22 | 1 |
| W5 useCrossTabSync old invalidateQueries | #23 | 5 |
| W6 useTodoCompletion times out | #24 | 8 |
| W7 api service axios.create mock | #25 | 6 |

Total 45, every failure mapped, none unmatched.

## Dry run
```
files edited: 6 (dry run)
markers in edited files: 45
```
(`mark-known-failures.mjs --runner vitest --dry-run` against a located report with `webapp-clusters.json`; no files changed.)

## Verified
- Baseline 45/45/45 across 3 runs; failure-to-cluster mapping totals 45.
- Probe: it.fails passes on a timeout.
- Dry run: 6 files, 45 markers, no UNMATCHED.

## Assumed
- Markers not yet applied; lint, types and Node 22 not yet checked on this branch.

## Next action
Task 5: apply markers, lint, Node 22 (D1 decided by David 2026-10-13), CI, docs, then ask David to open the PR

## Resume
Worktree /Users/davidyee/Code/yeezles-todo-wt/webapp-green-suite on chore/green-suite. Cluster file at /Users/davidyee/Code/yeezles-todo-wt/webapp-clusters.json (outside repo). Run the marking script without --dry-run against webapp-loc.json (regenerate with --includeTaskLocation), then do Task 5. Do not push until David approves.
