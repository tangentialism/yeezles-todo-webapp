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
- Final review fix wave: UNAUTHENTICATED and PASSKEY_INVALID copy, Try again keeps ticks
  (1 test), doc comment; final check: build exit 0; lint `✖ 57 problems (52 errors, 5 warnings)`;
  tests `8 failed | 23 passed (31)` files, `63 failed | 248 passed (311)` tests.
- Backend facts (404 REQUEST_NOT_FOUND, cookie-only session, port-less redirectHost,
  failed approval does not consume the request, each GET supersedes the challenge,
  RATE_LIMITED 429 envelope) documented in the backend landing record and spot-checked
  in backend code at yeezles-todo `feature/oauth-mcp` 22307b2 (`src/routes/oauthConsent.ts`,
  `src/middleware/oauthHttp.ts`, `src/models/WebAuthnChallenge.ts`, `src/middleware/oauthSession.ts`)
  by the final review; not exercised end-to-end.

## Assumed

- The backend implements the §6.2 "Consent HTTP contract" exactly, as
  implemented by yeezles-todo PR #29 (not merged, not deployed, never
  exercised against this webapp).
- Discrepancy 3: cookie-only authentication is acceptable to the backend —
  the backend's landing record says it reads the `__Host-remember_token`
  cookie only, but this has not been confirmed end-to-end against this webapp.
- Consent page and Connected apps not yet exercised against a real backend;
  unit-tested against mocked contract only.
- An empty `allowCredentials` means the account has no passkey (backend
  semantics; the R1 "no passkey yet" view is unit-tested).
- The backend's 429 body on the consent paths stays `RATE_LIMITED` (R2
  mapping is unit-tested).
- In dev, React StrictMode fires the consent GET twice; if the two complete
  out of order on the server, the first Approve can fail PASSKEY_INVALID and
  the retry succeeds. Production builds do not double-invoke. During the
  smoke, also test a Google sign-in without "Remember me" (expects the
  passkey sign-in prompt).

## Resume

Branch complete pending review. If David approved: push, open PR (commands in plan Task 6 Step 8).
