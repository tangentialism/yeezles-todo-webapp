<!-- verified-at: HEAD -->

# feature/people-tags-p4 — in flight

People tags phase 4, webapp half: the Peopler connection modal, link state on
chips and the person page, link and relink search, and the per-open link
check. Spec: workspace `docs/superpowers/specs/2026-10-30-people-tags-p4-design.md`
(§4.4–§4.7). Plan C: workspace `docs/superpowers/plans/` (webapp plan for P4).
Backend half: yeezles-todo #88, merged as `2af55ea`.

## Next action

Task 8: local browser walkthrough. It needs David to sign in with Google (and a
real Peopler token). Do not push or open a PR without his go.

## Sequence

0. Worktree, baseline, check script, state file (this commit).
1. [x] `peopler_link` on person shapes, `PeoplerConnection`/`PeoplerSearchResult`, `peoplerLinkOf`/`isFilledLink`, chip and list badge look. (`peoplerErrorMessage` is not in this task's brief; assumed to land with the task that first needs it.)
2. [x] API client methods for the four `/peopler/*` routes, `peopler-check` and `peopler_id` on `PUT /people/:id`; the logging interceptor must not log a request body.
3. [x] Connection store hook with the `PEOPLER_CONNECTION_CHANGED` broadcast (`usePeoplerStore`, `peoplerInvalidation`, `usePeopleStore` link-change invalidation, cross-tab case).
4. [x] `PeoplerConnectionModal` and the `Peopler` account menu item.
5. [x] Link check once per person page open; stale and dormant lines.
6. [x] Link and relink dialog (search, already-linked result, merge button), Unlink.
7. [x] Docs (FEATURES, STATUS), final check, `npm run build`. (The chip and badge look landed in Task 1 and `PersonList`/`PersonChip`; this list's old Task 7 text was stale.)
8. Browser walkthrough (needs David to sign in with Google).

## Verified

- Task 0 (2026-10-30): worktree `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p4`,
  branch `feature/people-tags-p4` from `origin/master` `04685ad` (Merge pull
  request #41, search; the plan said `e1f148f` and the workspace pins
  `d2aa8e8`, so master has moved). Upstream unset. Plan B merged: yeezles-todo
  `origin/main` `2af55ea` (Merge pull request #88). `npm ci` ok. Baseline:
  `tsc -b` exit 0 (`TSC_OK`); eslint 5 problems; vitest 877 total, 877 passed,
  0 failing names.
- Contract (Step 2): checked against the merged `docs/api/API.md` at
  `2af55ea`; the Wire contract matches except the Deviations below.
- Pins (Step 5): all ten re-read on `04685ad`; none has drifted. The line
  ranges still hold what the plan says: `AccountMenu.tsx:72-79` (passkeys and
  tokens items), `Dashboard.tsx:112-115` (search button) and `171-181` (modals
  after the provider), `PersonPane.tsx:126-139` (menu with Open in Peopler),
  `PersonChip.tsx:20`, `PersonList.tsx:48`, `PeopleField.tsx:40-45,57`,
  `PersonChooser.tsx:38-52`, `ProposalPersonChip.tsx:25,30`,
  `api.ts:169-186` (interceptor, `logger.error('API Error:', error)` at 173),
  `usePeopleStore.ts:82-93` (update mutation).
- Check script (outside the repo, never committed):
  `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p4-check.sh`, a copy
  of P3's with `people-tags-p3` changed to `people-tags-p4`; run with no
  argument to compare, `baseline` to rewrite. Baseline files
  `people-tags-p4-baseline-lint.txt` (5) and `people-tags-p4-baseline-tests.txt`
  (empty) sit beside it.
- Task 1 (2026-10-30): RED on the four touched test files: 11 failed, 61 passed, plus `peoplerLink.test.ts` unresolved (module missing). GREEN: check script `TSC_OK`, lint 5 (baseline 5, new files clean), vitest 895 total, 895 passed, 0 failing names (baseline 877; +18). Existing tests that built `peopler_id: N` people now set `peopler_link: 'ok'`.
- `makeCandidate` has no `peopler_link` default (optional on candidates; a default of `'none'` would break P3's "in Peopler" tests). `PersonPane` untouched (Task 5).

- Task 2 (2026-10-30): RED: `api.peopler.test.ts` 7 failed, 1 passed (`updatePerson` null already worked); `peoplerErrors.test.ts` unresolved (module missing). After the methods landed, the token-log test alone failed (old interceptor logged the whole error). GREEN: check script `TSC_OK`, lint 5 (baseline 5, new files clean), vitest 914 total, 914 passed, 0 failing names (+19). Request interceptor and other `logger.*` calls in `api.ts` log no body (login logs status only).
- Task 3 (2026-10-30): RED: `usePeoplerStore.test.tsx` unresolved (module missing), `useCrossTabSync.peopler.test.tsx` 1 failed of 2 (the ignore-own-tab test passed), `usePeopleStore.test.tsx` 1 failed of 11. GREEN: check script `TSC_OK`, lint 5 (baseline 5, new files clean), vitest 933 total, 933 passed, 0 failing names (+19). `connect`/`disconnect` call the api directly with `useState` flags, so no mutation cache entry exists and the token appears in no cache or broadcast (asserted).
- Task 4 (2026-10-30): RED: `PeoplerConnectionModal.test.tsx` unresolved (module missing), `AccountMenu.test.tsx` 2 failed of 3 (the unchanged-items test passed). GREEN: check script `TSC_OK`, lint 5 (baseline 5, new files clean), vitest 949 total, 949 passed, 0 failing names (+16). Modal returns `null` when closed; token is held in `useState` only, passed once to `connect(token.trim())`, cleared on success and kept on a rejected connect; tests assert no `Storage.setItem` call contains it and that close/reopen empties the input.
- Task 5 (2026-10-30): RED: `PersonPane.peopler.test.tsx` 9 failed, 3 passed (the none/disconnected cases pass trivially). GREEN: check script `TSC_OK`, lint 5 (baseline 5, new files clean), vitest 961 total, 961 passed, 0 failing names (+12). `PersonPane` calls `usePeoplerCheckOnOpen(person)` itself (the keyed pane remounts per open). `LinkPeoplerDialog` is a stub returning `null` (Task 6). Existing tests: `PersonPane.test.tsx` and `PeopleView.test.tsx` gained `usePeoplerStore` and `usePeopleMutations` default mocks; one fixture in `PersonPane.test.tsx` got `peopler_link: 'ok'` (no assertion changed), as in Task 1.
- Task 6 (2026-10-30): RED: `LinkPeoplerDialog.test.tsx` 17 failed (stub returned null), `PersonPane.peopler.test.tsx` 3 failed, `MergePersonDialog.test.tsx` 1 failed (the without-`initialIntoId` test passed): 21 failed. GREEN: check script `TSC_OK`, lint 5 (baseline 5, new files clean), vitest 984 total, 984 passed, 0 failing names (+23). Holder name comes from `usePeople({ limit: 100 })`; a holder outside that list reads `another person`. `PersonPane` hides an unlink error once the link state changes and clears it when a link dialog opens.

- Task 7 (2026-10-30, docs only, no RED): check script `TSC_OK`, lint 5 (baseline 5), vitest 984 total, 984 passed, 0 failing names, no new failing names. `npm run build` ok: `dist/assets/index-D6Frg6MS.js` 519.32 kB (gzip 156.43 kB), css 40.39 kB; only the existing >500 kB chunk warning. The webapp has no `docs/API.md`, so no client-method doc was added.

## Known limits

Deferred findings from the task reviews:

- A holder outside the first 100 people shows "Already linked to another person", and the merge dialog cannot preselect them (the holder name comes from `usePeople({ limit: 100 })`).
- A failed `/peopler/search` logs its URL, including the `q` name, to the dev console only. The logger is a no-op in production.
- No browser walkthrough has run yet (Task 8).

## Deviations

Contract differences found in Task 0 (merged API.md vs the plan's wire contract):

- `DELETE /peopler/connection` answers `{ success: true }` as data, not "no data". `disconnectPeopler` ignores the data. Harmless.
- REST `409 PERSON_LINK_CANDIDATE` / `PERSON_AMBIGUOUS` candidates carry no `peopler_link` (backend ruling 7); proposal and `find_people` candidates do. The plan's optional `PersonCandidateDetail.peopler_link?` covers it.
- `GET /peopler/search` also answers `400 PEOPLER_NOT_CONNECTED` (no or broken connection, or a 401 during the call) and `400 VALIDATION_ERROR` (empty `q`, bad `limit`); `502` also covers an answer for another account.
- `PUT /peopler/connection` answers `400 VALIDATION_ERROR` for an empty token (the UI disables Connect on empty anyway).
- `POST /people/:id/peopler-check` is session-only (`403 SESSION_REQUIRED` for access tokens); `force` must be a boolean.
- `/people` shapes also carry `peopler_account_id`, `peopler_created_at`, `link_status`, `link_checked_at`; the webapp need not type them.
- Also noted: the check skips Peopler for an `ok` link checked under 24 hours ago (without `force`), so a fresh page open often changes nothing; a `stale` link is always rechecked. An unstamped link reads `ok` until its first check.
- `PEOPLER_UNAVAILABLE` 503 is documented for the `/peopler/*` routes; `PEOPLER_NOT_CONNECTED` 400 can also come from a `{ peopler_id }` ref without a name.
- Task 2: the response interceptor now logs one line, `API Error:` METHOD url status message, and nothing else (no error object, config or response data), for every request. The old extra lines `Response status:` and `Request configuration error:` are gone. No existing test asserted the old log shape, so none changed.
- Task 3: `usePeoplerCheckOnOpen` takes the person's `peopler_link` from the argument, skips `none`, and treats an absent cached person as a changed link (invalidates and broadcasts). `PEOPLER_CONNECTION_CHANGED` also invalidates `['peoplerConnection']` with `refetchType: 'active'`.
- Plan copy deviates from the spec's "connect in Settings": the webapp has no Settings (Global Constraints).

## Assumed

- The backend at the merged P4 commit serves §4.4–§4.7 as its API.md documents.
- The backend has never called a real Peopler: Plan B's walkthrough was skipped, so every response shape here comes from API.md and the backend's mocks.
- No browser walkthrough has run yet.
- No real backend has been called by the webapp; every test in this plan uses mocks.

## Resume

Branch `feature/people-tags-p4` in
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p4` (webapp, default
branch `master`; use `git -C <abs path>` always; do not push or open a PR
without David's go). Read this file, the Global Constraints and the Task 1
brief in the workspace plan, then start Task 1 with a failing test. Check
command: `/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p4-check.sh`
(baseline: `TSC_OK`, lint 5, 877 tests, 0 failing names).
