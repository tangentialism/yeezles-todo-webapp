<!-- verified-at: HEAD -->

# feature/logo-lockup — ready to land

The Rising Hash mark goes in front of the "Yeezles" wordmark in the app header, the standalone page header (`PageShell`: consent and Obsidian imports) and the sign-in card. This follows the logo work in webapp #38. That work's spec (workspace `docs/superpowers/specs/2026-10-29-logo-and-today-color-design.md` §1) had put a header lockup out of scope. David asked for it on 2026-10-30, picked option A from three mockups, and approved this description in chat as a small change, without a separate spec.

## Next action

David reviews and merges the PR against `master`. After the merge, bump the webapp pin on workspace `main` (pushed `HEAD:main` from a workspace worktree, per the global rules).

## What was decided (David, 2026-10-30)

- **Option A:** the bare mark (ink bars on paper), at about the height of the letters. It is not the app-icon tile, and not larger than the letters.
- It goes in all three places the wordmark appears.
- Font, size and color of the wordmark, the nav, the icons and the consent screen's "Y" avatar are unchanged.

**Claude's calls:**
- One shared `src/components/ui/Wordmark.tsx`, sized in `em`: the mark is 1.1em tall with a 0.4em gap. That gives 24px/22px in the headers (approved) and about 44px on the 40px sign-in heading.
- The geometry is copied from workspace `docs/brand/yeezles-mark.svg`.
  - Bars use `stroke-ink` and strands `stroke-accent`.
  - The sun is the literal logo orange `#F4893A` (`--today-logo`). It is not a CSS token, because the spec keeps `--today-logo` out of the UI's CSS.
  - The svg is `aria-hidden`, so assistive tech hears "Yeezles" once.
- The spec's "below 24px prefer the tile" rule is read as covering the mark standing alone. Here, on phones, the mark is 22px beside the word.
- `PageShell`'s linked lockup keeps its hover dimming through `group-hover:text-ink-2`, because the lockup sets its own ink color.
- The consent screen's "Y" circle is left alone.

## Verified (2026-10-30, by running it)

- Branch cut from `origin/master` `e1f148f` (webapp #38 merged).
- `src/components/__tests__/Wordmark.test.tsx` has 5 tests: the component, the app header, `PageShell` with and without a link, and the sign-in heading.
  - RED first: the module didn't exist. With the component written, the 4 screen tests still failed because the mark was missing.
  - GREEN: 5/5.
- Full check:
  - `tsc -b` OK.
  - Lint 5 (0 errors, 5 warnings; the same as master).
  - Vitest 828/828 in 90 files (master is 823 plus these 5).
  - `npm run build` OK.
- The sign-in page was rendered from the dev server in headless Chrome at 1280 wide and looked at. The lockup is centered and the mark is the height of the letters.

## Assumed / never executed

- **The app header and `PageShell` were never seen rendered.** Both need sign-in, and there is no local sign-in path. They are covered by tests only, at the sizes approved in the mockup.
- **The 390-wide sign-in capture clipped the buttons on the right.** This is believed to be headless Chrome's minimum window width, not this change (only the heading changed), but that was not proven.
- The `group-hover` restore has no test.
- No real phone was used.
