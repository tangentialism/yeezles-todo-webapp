<!-- verified-at: HEAD -->

# feature/oauth-consent — state

Webapp half of the backend-as-OAuth-AS spec
(workspace repo `docs/superpowers/specs/2026-09-23-backend-oauth-mcp-design.md`, §6.2).
Plan: workspace repo `docs/superpowers/plans/2026-09-23-backend-oauth-mcp-webapp.md`.

## Next action

Ask David: push feature/oauth-consent and open PR against master? Webapp PR lands after the backend PR (spec §9 step 3).

## Verified

- Worktree cut from `origin/master` at `e59d630 Merge pull request #15 from tangentialism/feat/phase3-access-tokens`.
- Baseline: build exit 0; lint `✖ 57 problems (52 errors, 5 warnings)`;
  tests `8 failed | 18 passed (26)` files, `63 failed | 185 passed (248)` tests.
- Task 1: `oauthConsentApi`, 26 tests (includes R2's `RATE_LIMITED` row); check at
  63 failed / 211 passed.
- Task 2: consent page happy path, 11 tests; check at 63 failed / 222 passed.
- Task 3: consent error states + refetch-before-retry + R1's no-passkey-yet
  state, 13 tests (10 from the brief's error matrix, the R1 no-passkey test,
  and two fix-round-1 tests covering a failed retry refetch); check at
  63 failed / 235 passed (298 total, 21 passed files of 29).
- Task 3 fix round 1: a failed retryable refetch (`fetchDetails`'s catch)
  now also clears `details`, so Approve never re-enables against a stale or
  spent challenge -- the page falls to the terminal or load-failure view
  instead.
- Task 4: /oauth/consent route + return-to characterization, 5 tests; check at
  63 failed / 240 passed.
- Task 5: Connected apps, 7 tests; check at 63 failed / 247 passed (310 total,
  23 passed files of 31) -- the brief's 243 plus the 4 extra tests earlier
  rulings (R1/R2) added.
- Task 6 (docs only, no new code): final check unchanged --
  build exit 0; lint `✖ 57 problems (52 errors, 5 warnings)`;
  tests `8 failed | 23 passed (31)` files, `63 failed | 247 passed (310)` tests.
- Backend facts (consent HTTP contract, error codes, RATE_LIMITED behavior, etc.) are
  confirmed by the backend's landing record (yeezles-todo `docs/state/feature/oauth-mcp.md`, PR #29).
- Each `GET /oauth/requests/:id` returns currently valid `passkeyOptions`, and a failed
  approval does not consume the request (plan discrepancy 6) — confirmed by the backend's
  own tests (yeezles-todo PR #29 landing record), not yet end-to-end against this webapp.

## Assumed

- The backend implements the §6.2 "Consent HTTP contract" exactly, as
  implemented by yeezles-todo PR #29 (not merged, not deployed, never
  exercised against this webapp).
- Discrepancy 3: cookie-only authentication is acceptable to the backend —
  the backend's landing record says it reads the `__Host-remember_token`
  cookie only, but this has not been confirmed end-to-end against this webapp.
- Consent page and Connected apps not yet exercised against a real backend;
  unit-tested against mocked contract only.
- R1: empty `allowCredentials` renders "no passkey yet" and offers only Deny
  (Task 3).
- R2: `RATE_LIMITED` recognised as retryable (Task 1).

## Resume

Branch complete pending review. If David approved: push, open PR (commands in plan Task 6 Step 8).
