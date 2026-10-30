<!-- verified-at: HEAD -->

# feature/white-app-icon — ready to land

Every webapp icon is now the Rising Hash mark on a white tile instead of the dark tile. Ink bars, blue strands and the orange sun are unchanged. David asked for this on 2026-10-30: in the macOS dock, the Safari "Add to Dock" web app's dark tile muddied at small sizes. The brand art and the drift entry live on workspace branch `feat/white-app-icon`: `docs/brand/` and `docs/drift/2026-10-30-white-app-icon.md`. The browser-plugins half is a separate PR.

## Next action

David merges the PR against `master`. Then:
- bump the webapp pin on workspace `main`;
- David removes Yeezles from his dock and re-adds it from Safari, because the dock captured the old icon when the app was added.

## What was decided (David, 2026-10-30)

- The white icon everywhere. The dock can hold only one icon for both modes, and David chose white over the dark tile with white strands.
- The dark variant is kept in `docs/brand/yeezles-app-icon-dark.svg` (dark tile, the whole `#` white) but is not shipped.

**Claude's calls:**
- The rounded and favicon tiles get a faint ink edge (16–22% opacity) so they hold their shape on white tabs and pages.
- Flattened icons (maskable, apple-touch) flatten onto white.
- A new 1024px full-bleed maskable icon, the size WebKit recommends for Add to Dock.
- The approved pixel-snapped 16px favicon keeps its layout, recolored.

## Verified (2026-10-30, by running it)

- Branch cut from `origin/master` `dd1c646` (#39 merged).
- `src/test/brandIcons.test.ts`:
  - Two new expectations: the manifest lists `maskable-1024x1024.png`, and every flattened icon's corner pixel is white `[255,255,255]`.
  - RED first: 2 failed with the dark icons and the old manifest.
  - GREEN: 8/8.
- Full check:
  - `tsc -b` OK.
  - Lint 5 (0 errors, 5 warnings; unchanged).
  - Vitest 829/829 in 90 files.
  - `npm run build` OK, and `dist/icons/maskable-1024x1024.png` is emitted.
- `scripts/brand-icons.mjs check`:
  - every `icon-*` and favicon: `type=6 corner=0`;
  - every maskable and the apple-touch icon: `type=2`.
- A contact sheet of the new art was rendered in headless Chrome at 16/32/128 on white, light grey and dark, and looked at.

## Assumed / never executed

- **That Safari's Add to Dock picks the maskable manifest icon** (and so this white 1024) comes from field reports, not Apple documentation. The dock icon hasn't been seen until David re-adds the app.
- **How macOS dark, tinted or clear modes treat a white flat web-app icon** is unknown.
- **The 16px favicon wasn't seen in a real tab strip** (headless renders only).
