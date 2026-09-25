# Changelog

All notable version history for the Ordered FP Selector Power BI custom visual. Dates use the timezone/date of the authoring session (2026-09-07 for the entries added that day).

## [3.2.1.0] — 2026-09-25 — Current release

Documentation and packaging release. The README now provides a guided setup, an explanation of catalog order versus selected order, controls, limits, and troubleshooting. The [detailed release notes](docs/RELEASE_NOTES_v3.2.1.0.md) document installation, upgrade expectations, verification, and the behavior inherited from v3.2.0.0.

The visual version changed to `3.2.1.0` and npm package version to `3.2.1`. Its parsed `.pbiviz` payload is identical to v3.2.0.0 except for `visual.version`: no runtime, CSS, capabilities, translation, or asset changes. The GUID and saved-state schema remain unchanged. Typecheck, lint, and all 81 Jest tests passed; the new package has not been tested in a live Power BI report during this release process.

## [3.2.0.0] — 2026-09-24 — Superseded by 3.2.1.0

First version built from an editable, tested source (`visual/`), rebuilt from the decompiled v2.7.1.0 bundle. Same look as v2.7.1.0 (same CSS, class names, defaults and formatting options), with the refresh and persistence problems from the audit fixed. Same GUID, so existing reports upgrade in place.

### Fixed
- **Selection order wiped on refresh or cross-filter.** Updates without rows no longer touch the state, and items hidden by a cross-filter keep their place in the click order.
- **Saved state read only once.** Bookmarks, *Reset to default* and Desktop undo now restore click order, expansion and scroll position.
- **UI/filter desync when the filter is removed from outside** (Reset to default, Clear all slicers, filter pane). With *Require at least one dimension* the selection is re-applied. Otherwise the visual clears it.
- **Collapsed groups springing back open** about 300 ms after collapsing, and *Collapse all* not working with a selection. Selected paths now expand only when an item becomes selected.
- **"Expand catalog fully on load" overwriting the saved expansion** on every page change or report reopen. It now only seeds visuals without saved state.
- **Visual stuck in "restoring"** until a resize or another update: the default selection was not applied and changes were not saved. Load now finishes on the first data update with a filter, or 500 ms after it.
- **`renderingFinished` skipped** on some updates, which affects export to PDF/PPTX, subscriptions and Performance Analyzer.
- **Scrolling persisted state**, which rebuilt the visual, marked the report as modified and added undo steps. Scroll position is now saved with the next real change.
- **Wrong fields after row indices shift** (new Field Parameter row, cross-filter): the filter targets are resolved through the keys recorded when the filter was applied.
- **Ambiguous echo detection.** Signatures are now unambiguous, a stale update can no longer undo a click, and quick consecutive clicks no longer override each other.
- `state.orderJson` declared as a font family in `capabilities.json` (now `text`). Only `stateJson` is written now.
- *Require at least one dimension* now works even when *Select first child on load* is off. The default item is the first by catalog order (the Field Parameter's own order), not the first alphabetically.
- The same label in two areas/groups now shows as two items instead of silently dropping one. Expansion keys no longer collide when names contain `:`.
- `destroy()` no longer persists before the visual is ready.
- Removed leftover "LVMH Beauty Tech Iberia v2.3" and "Cognos" strings from the bundle.

### Changed
- When a **Catalog order** column is bound, areas and groups are ordered by the lowest catalog order of their items (they are still alphabetical when it isn't bound).
- Re-renders keep keyboard focus and scroll position. Renders are skipped when nothing changed.
- Keyboard navigation in the catalog: arrow keys, Home and End; Left and Right collapse and expand headers. Adds `aria-pressed` / `aria-expanded` and a visible `:focus-visible` outline for keyboard users.
- UI strings are localized (English, Spanish).
- Persisted state schema v3, migrated automatically from v1/v2. Downgrading to v2.7.1.0 keeps the selection (it comes from the filter) but loses the saved expansion and scroll position.

### Repository
- New buildable source in `visual/` with 81 Jest tests (93% statement coverage), including simulated refresh, bookmark, reset, cross-filter and row-shift update sequences.
- `docs/ARCHITECTURE.md` rewritten. Its earlier claim that the shipped binary had no state engine was wrong.
- Removed `experimental-v3-rewrite/` (it remains in git history).

## [2.7.1.0] — 2026-09-07 — Superseded by 3.2.0.0

Re-branded, re-packaged republish of the real, verified-working 2.3.0.0 binary. No functional/visual changes — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for exactly what was and wasn't touched.

### Changed
- Removed all "LVMH Beauty Tech Iberia" branding visible inside Power BI: visual display name, author, and description no longer reference it. (The project's authorship history is still documented in this repository's `README.md`, just not inside the product itself.)
- New visual icon: a clean, flat "ordered list" glyph (three numbered rows) on a `#0F6CBD` rounded-square background, replacing the previous low-detail generic placeholder icon.
- `author` set to Ludovic Delot Bravo.
- `supportUrl` / `gitHubUrl` now point at this repository instead of the generic Microsoft Power BI visuals documentation page.
- Version bumped to 2.7.1.0 (see README's "[Why 2.7.1.0](README.md#why-271-0-and-not-say-240-0-or-300-0)" for the reasoning).

### Repository
- Full repository reorganization: shipped binaries archived per-version under `releases/`, decompiled CSS/JS of the real binary under `docs/decompiled/`, and the (separate, unrelated, not-shipped) TypeScript rewrite moved into `experimental-v3-rewrite/` with its own clarifying README.
- Added `docs/ARCHITECTURE.md` documenting the source-vs-binary situation in detail.

## [3.1.0.0] — 2026-09-07 — Built and reverted same day

An AI-assisted session, working from `experimental-v3-rewrite/` under the mistaken belief it was the source of the real v2.3.0.0 visual, added catalog scroll-position persistence to that rewrite and packaged it as "v3.1.0.0". Because the rewrite's CSS/DOM never matched the real shipped visual (different class names, ~30–50% larger default fonts/paddings/badges), the result looked broken compared to the visual the user was used to.

**Reverted the same day** via `git revert` before it caused further confusion. Not archived under `releases/`. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full postmortem and the CSS class name / sizing diff that revealed the mismatch.

## [2.3.0.0] — (original build date unknown, prior to this repository)

- Added catalog scroll-position persistence on top of 2.2.0.0's feature set (it uses the debounced StateManager/StateRepository/PersistScheduler engine, but reads the saved state only once via `hasLoadedPersistedState`; see v3.2.0.0).
- CSS unchanged from 2.2.0.0 (verified identical via decompilation, 2026-09-07).

Briefly re-published, unmodified except for a version/name relabel, as an intermediate "v2.4.0.0" GitHub Release on 2026-09-07, before being superseded within the same session by the more deliberate 2.7.1.0 rebrand. That 2.4.0.0 release should be treated as superseded.

## [2.2.0.0] — (original build date unknown, prior to this repository)

- Race-safe saved-filter restoration.
- Persistent click order (selection order survives update cycles).
- Fixed (non-scrolling-away) selected-order panel.
- Catalog scrolling (no persisted scroll position yet — added in 2.3.0.0).
- Configurable styling (typography, spacing, colors, controls — the formatting cards documented in `README.md`).
- Expansion controls (expand/collapse toolbar, auto-expand to selection).
- Required-selection support.

## ≤ [2.1.0.0] and earlier

Earlier iterations predating the feature set above; not archived in this repository. Superseded by 2.2.0.0.
