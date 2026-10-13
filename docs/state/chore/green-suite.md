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
- Dry run: `files edited: 6 (dry run)`, `markers in edited files: 45`, no UNMATCHED. Apply: `files edited: 6`, 45 markers.
- `grep -rn KNOWN-FAILURE src | wc -l` = 45.
- Lint before: 52 errors, 5 warnings. After: `npx eslint .` exit 0, 0 errors, 5 react-hooks/exhaustive-deps warnings left untouched (fixing them changes behaviour).
- `npx tsc -b` exit 0; `npx eslint .` exit 0; `npx vitest run` exit 0; `npm run build` exit 0.
- Three further `npx vitest run`: each `Test Files 36 passed (36)`, `Tests 338 passed (338)`. No flaky marked test.
- No eslint-disable for no-explicit-any was used, so no lint-debt issue was filed.

## Assumed
- Node 22 not run locally: local `node -v` is v26.7.0. `engines` is 22.x, nixpacks uses nodejs_22, CI uses node 22; none of that was exercised here.
- The CI workflow has not run yet; it first runs on the PR.
- `tsc -b` does not appear to typecheck test files (it passed while an edit broke tests at runtime), so `as never` casts in tests are checked only by vitest/esbuild, not by tsc.
- Railway picks up nixpacks.toml for the Node 22 build: not verified.

## Next action
Ask David to open the PR (Task 5 Step 8)

## PR body notes
Clusters (all `it.fails`, marker count):
- W2 #20 AuthContext cannot stub window.google: 12
- W3 #21 AuthContext expects pre-passkey state shape: 13
- W4 #22 ToastContext auto-dismiss test times out: 1
- W5 #23 useCrossTabSync old invalidateQueries: 5
- W6 #24 useTodoCompletion times out: 8
- W7 #25 api service axios.create mock: 6
Total 45. Also: lint fixed mechanically, Node 22 (D1, David 2026-10-13), CI check workflow added. No tests deleted, no behaviour-changing updates.

## Resume
Worktree /Users/davidyee/Code/yeezles-todo-wt/webapp-green-suite on chore/green-suite, pushed. Only remaining step: David approves opening the PR, then `gh pr checks <n> --watch`.
