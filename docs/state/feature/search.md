<!-- verified-at: HEAD -->

# feature/search — ready to land

A command-palette search pop-up: press `/` or ⌘K (Ctrl+K), or click 🔍 in the header, type a few letters, and find a todo by partial words in its title, description, tagged people or topic. Enter opens it in the edit dialog; ⌘Enter or the checkbox marks it done in place. This is the webapp half of workspace `docs/superpowers/specs/2026-10-30-search-design.md` (plan `docs/superpowers/plans/2026-10-30-search.md`, Tasks 6–10, on workspace branch `spec/search`). The backend half is merged as yeezles-todo #87 and pinned on workspace `main` (`e551d41`).

## Next action

David approves the push and PR against `master`. After it merges, bump the webapp pin on workspace `main` (pushed as `HEAD:main` from the `spec/search` worktree), then take a first real look on the deployed site (see Assumed).

## What was decided

David's (spec): command-palette pop-up over a header box or a sixth view; all areas; open before done; title hits first; Enter edits, ⌘Enter toggles done; the row flips in place with no re-sort; closing the editor returns to the same query, refreshed.

**Claude's calls:**
- `useTodoSearch` asks `GET /todos?search=…&completed=all&sort_by=relevance&limit=30` with no `area_id`, 200ms debounce, `keepPreviousData`. It is kept out of the store's invalidations and sets `gcTime: 0` and no focus/reconnect refetch: no stale rows on reopen, and nothing re-sorts under the cursor.
- Toggling uses a local overrides map over `toggleTodoCompletion`; the editor is handed the toggled state, so saving after a tick doesn't reopen the todo. Overrides clear after the post-edit refetch settles.
- Accepted limitation: the toast's Undo, or a failed save, isn't reflected in a pop-up row until the editor closes or the pop-up reopens (`toggleTodoCompletion` doesn't await its mutation).
- Selection resets only when the ordered result ids change; it stays scrolled into view; hover moves selection only when the pointer really moved; Enter is ignored during IME composition.
- `/` is ignored in inputs, textareas, selects and contenteditable; ⌘K/Ctrl+K open from anywhere (not Ctrl+Alt+K, which is AltGr on Windows). ⌘K inside another open modal stacks search on top.
- The 🔍 button is first in the header's right-hand group. On phones the pop-up is full-screen and the dialog's ✕ is the Cancel. The keys footer and the `⌘↵ Done` hint are desktop only and show ⌘ on every platform (plan copy).

## Verified (2026-10-30, by running it)

- Branch cut from `origin/master` `d2aa8e8`. Baseline (`npm run build`, eslint total, vitest): build OK, 829/829 tests, lint 5 warnings, 0 errors.
- Every task went RED then GREEN on its focused tests. Final, at this commit: `npm run build` (`tsc -b` + vite) OK, 877/877 tests, lint 5 (= baseline), no new failing test names.
- The Esc test runs the real `Dialog` stack: with the editor open, Esc closes only the editor; a second Esc closes the pop-up. The IME, hover and Esc tests were each shown to fail with their guard removed.
- Whole-branch review (Opus) found one Critical (edit after tick reopened the todo) and one Important (5-minute search cache across reopen); both fixed with failing-first tests and re-reviewed.

## Assumed / never executed

- **Nothing has been seen in a browser.** Local sign-in is impossible: no `.env` provides `VITE_GOOGLE_CLIENT_ID`, the passkey `WEBAUTHN_RP_ID` is the production domain, and a local dev server defaults to the production API. The first real look is the deployed site.
- Phone layout (header crowding with the new 40px button; the list's `max-h-[60vh]` scroll inside a full-screen sheet with the keyboard up) and dark-mode appearance are judged from class names only.
- `scrollIntoView` and the synthetic-mousemove guard are unit-tested in jsdom, not in a real browser.
- A toggle made while the post-edit refetch is still pending can be wiped by the delayed override clear (narrow, on the accepted-limitation path).
