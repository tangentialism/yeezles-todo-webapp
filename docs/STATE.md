# yeezles-todo-webapp — state

Repo-specific state. **The cross-cutting source of truth is the superproject's
`docs/STATE.md`** — read that first for phase, architecture, and anything
spanning more than this repo. This file carries only what is specific to the
webapp.

Created 2026-07-28, when David decided STATE should live per-submodule as well
as in the superproject.

## Right now

- **Branch:** `feature/passkey-auth-phase1` (draft PR #11), merged up to date
  with `master`.
- **The default branch is `master`, not `main`.** Scripts and habits that
  assume `main` will fail here — `git fetch origin main` errors outright.
- **Was built on a badly stale base.** This branch was cut from `ab37b72`
  (2025-12-10) while `master` was **25 commits** ahead, including a docs/test
  cleanup and a build-error fix. Merged 2026-07-28; the only conflicts were
  import blocks in `Dashboard.tsx` and `LoginButton.tsx`, resolved by keeping
  both sides. **Check `git rev-list --left-right --count origin/master...HEAD`
  before starting work here.**
- **Tests: 8 files failed / 14 passed of 22; 63 failed / 169 passed of 232.**
  Every one of those failures is **pre-existing and identical on `origin/master`**
  — verified 2026-07-28 by running master in a scratch worktree, not assumed.
- `npx tsc -b --noEmit` exit 0.

## Known-failing suites (all pre-existing, none auth-related)

`AuthContext` 14, `AddTodoModal` 12, `AuthContext.simple` 11,
`useTodoCompletion` 8, `ToastContext` 6, `api` 6, `useCrossTabSync` 5,
`AccomplishmentsView` 1. Mostly axios mocking (`this.api.interceptors`
undefined) and context-provider setup.

Healthier than the backend suite — repairing it is not currently planned, but
it is the smaller job of the two.

## Traps specific to this repo

- **`src/services/__tests__/api.test.ts:587` asserts a stale base URL**
  (`https://yeezles-todo-production.up.railway.app`). Production code defaults
  to `https://api.yeezlestodo.com` in both `api.ts` and `passkeyApi.ts`. That
  assertion will need updating when the axios mocking is fixed — it currently
  dies before reaching the assertion, so the staleness is hidden.
- **`passkeyApi.ts`'s `call()` helper has a load-bearing spread order**:
  `...init` first, then `credentials: 'include'` and merged headers. Reordering
  it would let a caller silently override cookie auth. There is a comment
  saying so; heed it.
- The app is served **only at `yeezlestodo.com`** — no `www`. That is what
  makes a single exact `WEBAUTHN_ORIGIN` correct on the backend.

## Passkey UI entry points

`PasskeyLoginButton` (in `LoginButton`), `PasskeyManagementModal` (in
`Dashboard`), which wraps `PasskeyEnrollment`. All three are mounted — verified
after the `master` merge, since a component built but never rendered was a real
defect found in the Phase 1 review.

Enrollment can now return **403 `STEP_UP_REQUIRED`** when the user is on a
persistent session. The message surfaces verbatim through the existing error
envelope, but there is no "re-authenticate" button — the user must sign out and
back in with Google. Worth improving.
