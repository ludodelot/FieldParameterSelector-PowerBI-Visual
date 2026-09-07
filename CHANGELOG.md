# Changelog

All notable version history for the Ordered FP Selector Power BI custom visual. Dates use the timezone/date of the authoring session (2026-09-07 for the entries added that day).

## [2.7.1.0] — 2026-09-07 — Current definitive release

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

- Added catalog scroll-position persistence on top of 2.2.0.0's feature set (though: see architecture note — the actual persistence mechanism is a simple one-shot `hasLoadedPersistedState` load, not a debounced state engine).
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
