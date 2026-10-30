<!-- verified-at: HEAD -->

# feature/people-tags-p4 — ready for PR

People tags phase 4, webapp half: the Peopler connection modal, link state on
chips and the person page, link and relink search, and the per-open link
check. Spec: workspace `docs/superpowers/specs/2026-10-30-people-tags-p4-design.md`
(§4.4–§4.7). Plan C: workspace `docs/superpowers/plans/2026-10-30-people-tags-p4-webapp.md`.
Backend half: yeezles-todo #88, merged as `2af55ea`.

## Next action

All of Plan C is done, including Task 8 (the walkthrough) and Task 8a (its
two fixes). Next: David decides on the push and on `gh pr create` against
`master`. After merge, the workspace pin bump is a separate `HEAD:main` commit.

## Sequence

0. [x] Worktree, baseline, check script, state file.
1. [x] `peopler_link` on person shapes, `PeoplerConnection`/`PeoplerSearchResult`, `peoplerLinkOf`/`isFilledLink`, chip and list badge look. (`peoplerErrorMessage` is not in this task's brief; assumed to land with the task that first needs it.)
2. [x] API client methods for the four `/peopler/*` routes, `peopler-check` and `peopler_id` on `PUT /people/:id`; the logging interceptor must not log a request body.
3. [x] Connection store hook with the `PEOPLER_CONNECTION_CHANGED` broadcast (`usePeoplerStore`, `peoplerInvalidation`, `usePeopleStore` link-change invalidation, cross-tab case).
4. [x] `PeoplerConnectionModal` and the `Peopler` account menu item.
5. [x] Link check once per person page open; stale and dormant lines.
6. [x] Link and relink dialog (search, already-linked result, merge button), Unlink.
7. [x] Docs (FEATURES, STATUS), final check, `npm run build`. (The chip and badge look landed in Task 1 and `PersonList`/`PersonChip`; this list's old Task 7 text was stale.)
8. [x] Browser walkthrough with David, 2026-10-30 (results under Verified).
8a. [x] Walkthrough fixes: recheck on every person open; clear the stale link-dialog error.

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

- Task 7 (2026-10-30, docs only, no RED): check script `TSC_OK`, lint 5 (baseline 5), vitest 984 total, 984 passed, 0 failing names, no new failing names. `npm run build` ok: `dist/assets/index-D6Frg6MS.js` 519.32 kB (gzip 156.43 kB), css 40.39 kB; only the existing >500 kB chunk warning. The webapp has `docs/api/API.md`, but it lists only `getTodos` client examples and no people or Peopler methods, so it was left unchanged.

- Final review fixes (2026-10-30): RED: 6 failed across 5 files (search cache kept after connect/disconnect, after a cross-tab `PEOPLER_CONNECTION_CHANGED`, after link/unlink; search `staleTime` not 0; a 503 `PEOPLER_UNAVAILABLE` retried; the disabled result had no accessible description). GREEN: check script `TSC_OK`, lint 5 (baseline 5, changed files clean), vitest 989 total, 989 passed, 0 failing names (+5); `npm run build` ok. Fixes: `usePeoplerSearch` `staleTime: 0` / `gcTime: 60s`; `clearPeoplerSearches` (in `peoplerInvalidation`) runs from `invalidateAfterLinkChange` (connect, disconnect, cross-tab, check) and the `peopler_id` branch of `updatePerson`; Peopler modal body padded `px-7 pt-3.5 pb-6`; no retry for 503 `PEOPLER_UNAVAILABLE`; `peoplerLinkOf` in `shouldCheck`; merge-offer row `flex-wrap` and `aria-describedby`. `LinkPeoplerDialog` was already padded like `MergePersonDialog`. Padding has no unit test.

- Task 8a (walkthrough fixes, 2026-10-30): RED: 3 failed in 3 files (`Dashboard.people` re-opening the same person did not bump the counter; `PeopleView` same-person remount on counter change; `LinkPeoplerDialog` stale error stayed after typing). GREEN: check script `TSC_OK`, lint 5 (baseline 5), vitest 992 total, 992 passed, 0 failing names (+3); `npm run build` ok (existing >500 kB chunk warning only). Fix 1: `Dashboard` keeps `openPersonSeq`, bumped by every `openPerson` call; passed through `ViewContainer` to `PeopleView`, and `PersonPane` is keyed `id:seq`, so each explicit open remounts it and `usePeoplerCheckOnOpen` runs again. Fix 2: `LinkPeoplerDialog` clears `error` when the search text changes.
  - Re-run by the controller at `7b84ff5`: the check script printed `TSC_OK`, `tests: 992 total, 992 passed, 0 failing names`, `lint now: 5  baseline: 5`. Task review (spec and quality): approved, with two Minors deferred: no test covers the `openPersonSeq` passthrough from `Dashboard` through `ViewContainer`, and the Fix 2 test types only one character.
- **Task 8, browser walkthrough (2026-10-30), run against real local services.** David signed in with Google, and pasted each Peopler token straight into the modal; no token entered the conversation or any log.
  - **Setup.** Throwaway data only; nothing from it is committed.
    - Peopler `1ace42d`, on a fresh data directory, at `http://localhost:8080`. User `walk-a@example.test` had Avery Quill (1), Avery Q. Quill (2) and Tomas Brandt (3). User `walk-b@example.test` (display name "Walk B") had Avery Quill (1).
    - Backend: yeezles-todo `origin/main` `d6bb222` (docs-only past `2af55ea`), on its own Postgres DB `yeezles_todo_walk_p4`, migrations 15 applied, with `PEOPLER_PUBLIC_URL=http://localhost:8080` and a fresh `PEOPLER_TOKEN_KEY`.
    - Webapp: this branch, `vite` on `:5173`.
  - **Steps:**
    1. Connect: **PASS.** A wrong token got a real 422 and the rejected sentence. A's token showed `Connected as walk-a@example.test` (A has no display name). The connection survived a reload. Local Storage held only `user`; Session Storage was empty. Extra check: **Chrome offered to save the token as a password** despite `autoComplete="off"` (recorded, not changed).
    2. Link: **PASS.** "Avery" listed both Averys with title and company. Picking one filled the todo chip without a reload. Open in Peopler pointed at `http://localhost:8080/people/1`. Extra check **PASS**: a Link right after an Unlink showed the result as pickable.
    3. Merge in Peopler, then the quiet id update: **PASS after a fresh mount.** `peopler_id` went 1→2 with the survivor's `created_at`, still `ok`, with no message, and Open in Peopler pointed at `/people/2`. **FAIL first:** reopening the same person sent no check (finding F1, fixed in Task 8a).
    4. Not-a-person in Peopler, then stale: **PASS.** The stale line with Relink… and Remove link showed. The chip was bare with a warning mark and the label `(Peopler link out of date)`. The list badge is `role="img"` with that label.
    5. Relink, then already linked: **PASS with a substitution.** The plan's relink of Yeezles "Avery Quill" to Peopler "Tomas Brandt" was refused with 422 and the name-mismatch sentence. That is correct: the backend name-tests `PUT /people/:id { peopler_id }`. Relinking to the restored Avery Q. Quill gave `ok`. A second Yeezles person, Priya Raman, then saw it disabled with `Already linked to Avery Quill` and `Merge into Avery Quill…`.
    6. Second account, then stale: **PASS.** Reconnecting as B showed `Connected as Walk B (walk-b@example.test)`. The A-stamped link read stale at once, without opening the page. Extra check **PASS**: Relink searched B's account only. Relinking to B's Avery Quill gave `ok` (`peopler_id 1`, account 2).
    7. Disconnect, then dormant: **PASS.** After the in-page confirm, the chips went bare, and the person menu dropped Open in Peopler and Unlink. The page showed only `Linked to Peopler — connect Peopler from the account menu to use it.` A second signed-in tab updated without a reload.
    8. At 390px: **PASS, judged by David's eye in DevTools device mode.** The connected and disconnected modals fit. The link dialog opens as a full-height sheet, and the merge button wraps onto its own line.
  - **After Task 8a, in the browser:** opening Avery from the chip, then All, then the chip again sent a second `POST /people/1/peopler-check`. The backend log count went 5→6→7, and `link_checked_at` advanced both times from an aged value. Fix 2 was not re-run in the browser; only its unit test covers it.
  - The P2 and P3 browser walkthroughs (still not run) are now unblocked by this same local setup. They are not P4 scope.

## Known limits

Deferred findings from the task reviews:

- A holder outside the first 100 people shows "Already linked to another person", and the merge dialog cannot preselect them (the holder name comes from `usePeople({ limit: 100 })`).
- A failed `/peopler/search` logs its URL, including the `q` name, to the dev console only. The logger is a no-op in production.
- Chrome offers to save the Peopler token as a password, even though the input sets `autoComplete="off"`.
- Returning to the People tab with a person already open does not re-check that person's link; only an explicit open does (a chip, the list, or merge navigation). This was the controller's ruling in Task 8a.
- Re-opening the same person remounts the pane, which resets its local state ("Show completed", any open dialog).
- Locally, "Stay signed in" does not work, so every page reload signs you out. This is a backend dev-mode cookie problem: yeezles-todo #91.

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
- Plan copy deviates from the spec's "connect in Settings": the webapp has no Settings (the plan's Global Constraints section, in workspace `docs/superpowers/plans/2026-10-30-people-tags-p4-webapp.md`).
- Task 8a: re-opening the same person remounts `PersonPane` through an open counter (`openPersonSeq`) in the key, because the dashboard keeps views mounted and `openPersonId` alone does not change. `usePeoplerCheckOnOpen` is unchanged (once per mount).

## Assumed

- **Production is untested.** Nothing here has run against the deployed backend (api-todo.yeezles.com) or the production Peopler. The walkthrough used local services only.
- **Fix 2 is covered only by its unit test.** The stale-error clear was not re-run in the browser.
- **The 390px check was by eye**, through DevTools device emulation, not on a phone.
- **API.md is stricter than the code.** It says `PEOPLER_PUBLIC_URL` "must be a bare https origin", but the backend accepted `http://localhost:8080`; the code only strips trailing slashes. This is a doc mismatch, not a webapp concern.
- **The redirect fingerprint ran once, live.** `redirected_from_created_at` matched exactly against a running Peopler in step 3, and was not exercised further.

## Resume

Branch `feature/people-tags-p4` in
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p4` (webapp, default
branch `master`; use `git -C <abs path>` always; do not push or open a PR
without David's go). Plan C is complete: Tasks 0–8, the final-review fixes,
and Task 8a (walkthrough fixes). What remains is David's call: push, then
`gh pr create` against `master`, then after merge the workspace pin bump as
its own `HEAD:main` commit. Check command:
`/Users/davidyee/Code/yeezles-todo-webapp-wt/people-tags-p4-check.sh`
(now: `TSC_OK`, lint 5, 992 tests, 0 failing names; `npm run build` ok).
Plan: workspace `docs/superpowers/plans/2026-10-30-people-tags-p4-webapp.md`.
