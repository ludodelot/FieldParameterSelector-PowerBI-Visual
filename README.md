# Ordered FP Selector

A Power BI custom visual for selecting, ordering, and re-ordering **Field Parameter** dimensions — click catalog items in the order you want them, drag to reorder your selection, and have that exact order (plus expand/collapse state and catalog scroll position) reliably persist across refresh, filters, bookmarks, page navigation, resize, and report reopen.

<img src="docs/icon-preview.png" width="96" height="96" alt="Ordered FP Selector icon" />

**Current definitive release: [v2.7.1.0](releases/v2.7.1.0/)** — see [Releases](#releases--version-history) below.

---

## Authorship

This is an **independent personal project** designed and built by **Ludovic Delot Bravo**, originally for a Power BI reporting need at **LVMH Beauty Tech Iberia**. It is not an official LVMH product, is not maintained or endorsed by LVMH, and carries no LVMH branding inside Power BI itself (visual name, author, and description shown in the Power BI UI are all independent of LVMH). This authorship note exists here in the repository for transparency and historical context only.

---

## Table of contents

- [Why this visual exists](#why-this-visual-exists)
- [Features](#features)
- [Installing](#installing)
- [Data roles](#data-roles)
- [Formatting options](#formatting-options)
- [Releases / version history](#releases--version-history)
- [Repository layout](#repository-layout)
- [Source code status — please read](#source-code-status--please-read)
- [Development](#development)
- [License](#license)

---

## Why this visual exists

Power BI's native **Field Parameters** feature lets report authors expose a set of measures or dimensions that end users can swap in and out of a chart. What it does *not* give you out of the box is:

- a way for the end user to pick **more than one** field parameter value, in a **specific order**, and reorder that selection by drag-and-drop;
- a catalog view that groups those values into **areas** and **groups** for easier browsing;
- state that actually **survives** Power BI's update lifecycle instead of resetting on every filter change, bookmark, or page navigation.

This visual is a slicer-like selector built specifically for that gap: pick items from a grouped catalog, drag to reorder them, and have that exact order persist reliably across every scenario a real report goes through in production.

## Features

- **Ordered multi-selection** — click catalog items to add them to a selection list; the order you click in is preserved and exposed to the report as the field parameter's active order.
- **Drag-and-drop reordering** of the selected list, plus up/down move buttons and per-item removal.
- **Two-level grouping** (optional `domain` / `group` roles) so large catalogs of dimensions are easier to scan.
- **Persistent state**: selection order, expansion state, and catalog scroll position all survive refresh, filter changes, bookmarks, page navigation, resize, and report reopen.
- **Configurable behavior**: maximum number of selections, "require at least one selection", "select first item on load".
- **Expand/collapse controls**: toolbar with expand-all / collapse-all, auto-expand the path to the current selection, expand fully on first load.
- **Deep formatting control**: typography, spacing/density, colors, controls sizing, and scrollbar styling — all exposed through the standard Power BI formatting pane.
- **Full keyboard navigation** (arrow keys, Enter/Space) and screen-reader-friendly interaction.

## Installing

1. Download `orderedFieldParameterSelector.2.7.1.0.pbiviz` from [`releases/v2.7.1.0/`](releases/v2.7.1.0/).
2. In Power BI Desktop: **Visualizations → … (More) → Import a visual from a file**, and select the downloaded `.pbiviz`.
3. Drag the new visual onto the canvas.
4. Bind your Field Parameter to the **Field Parameter** data role (see [Data roles](#data-roles) below).
5. Optionally bind grouping columns to **Area / domain** and **Group / level** to organize the catalog.

## Data roles

| Role | Name | Cardinality | Purpose |
|---|---|---|---|
| Field Parameter | `fieldParameter` | required, exactly 1 column | Visible label column from the Field Parameter. |
| Area / domain | `domain` | optional, 0–1 column | Optional top-level catalog grouping, such as Product, Customer, or Order. |
| Group / level | `group` | optional, 0–1 column | Optional second-level catalog grouping, such as Geo or Commercial Line. |
| Catalog order | `catalogOrder` | optional, 0–1 column | Optional numeric order used only to display catalog items — independent from the user's selection order. |

## Formatting options

All exposed in the Power BI formatting pane, organized into cards:

| Card | Properties |
|---|---|
| **Behavior** | `maxSelections`, `requireSelection`, `selectFirstOnLoad` |
| **Visibility** | `showInstructions`, `showSelectedPanel`, `showAreas`, `showGroups`, `showHeader`, `showCatalogTitle`, `showGroupCounts`, `showPositionBadges`, `showMoveButtons` |
| **Typography** | `fontFamily`, `itemFontSize`, `domainFontSize`, `groupFontSize`, `counterFontSize`, `sectionTitleFontSize`, `lineHeight`, `letterSpacing`, `itemBold`, `groupBold`, `areaBold`, `italic` |
| **Spacing and density** | `rowMinHeight`, `verticalPadding`, `horizontalPadding`, `outerPadding`, `rowGap`, `groupGap`, `controlGap`, `domainIndent`, `itemIndent` |
| **Controls** | `badgeSize`, `buttonSize`, `iconFontSize`, `cornerRadius`, `selectedPanelPadding`, `badgeBorderWidth` |
| **Colors** | `backgroundColor`, `textColor`, `secondaryTextColor`, `accentColor`, `selectedTextColor`, `selectedRowBackground`, `hoverBackground`, `areaBackground`, `groupBackground`, `panelBackground`, `panelBorderColor`, `badgeBorderColor`, `buttonHoverBackground` |
| **Vertical scrolling** | `scrollbarWidth`, `scrollbarThumb`, `scrollbarTrack`, `alwaysShowScrollbar` |
| **Expansion controls** | `showToolbar`, `stickyToolbar`, `expandSelectedPaths`, `expandAllOnLoad`, `toolbarButtonSize`, `toolbarIconSize`, `toolbarGap`, `toolbarBackground`, `toolbarButtonColor` |

> The internal `state` object (`stateJson` / `orderJson` / `expandedJson`) is **not** exposed in the formatting pane — it's Power BI's storage backend for click order, expansion, and scroll-position persistence, not a user-facing setting.

This table was generated directly from the real `capabilities.json` embedded in the [v2.7.1.0](releases/v2.7.1.0/) binary (see [`docs/decompiled/`](docs/decompiled/)), so it's guaranteed accurate for what you actually install — not the experimental rewrite described below.

## Releases / version history

All shipped `.pbiviz` binaries are archived in [`releases/`](releases/), one folder per version, so any previous build can be recovered exactly.

| Version | Folder | Status |
|---|---|---|
| **2.7.1.0** | [`releases/v2.7.1.0/`](releases/v2.7.1.0/) | ✅ **Current definitive release.** Same tested visual/CSS/JS as 2.3.0.0 (byte-identical behavior), re-branded: no "LVMH Beauty Tech Iberia" in the name/author/description shown inside Power BI, new list icon, author set to Ludovic Delot Bravo, links point at this repository. |
| 2.3.0.0 | [`releases/v2.3.0.0/`](releases/v2.3.0.0/) | Historical. Added catalog scroll-position persistence on top of 2.2.0.0. Briefly re-published as an intermediate "v2.4.0.0" GitHub Release on 2026-09-07; that release has been superseded by 2.7.1.0 and should not be used going forward. |
| 2.2.0.0 | [`releases/v2.2.0.0/`](releases/v2.2.0.0/) | Historical. Adds race-safe saved-filter restoration, persistent click order, fixed selected-order panel, catalog scrolling (no persisted position yet), configurable styling, expansion controls, required-selection support. |
| 3.1.0.0 | *(not archived — see below)* | ❌ **Built and immediately reverted on 2026-09-07.** An AI-assisted session rewrote the rendering layer (different CSS class names, different default sizes: 12px fonts vs the real 9px, 18px badges vs 13px, 8px padding vs 3px, etc.) without reference to the real shipped binary, producing a visually broken result ("todo con tipografías... super diferente"). The underlying git commit was reverted (`git revert`) before this documentation pass; the code is preserved only as [`experimental-v3-rewrite/`](experimental-v3-rewrite/) for possible future reconciliation — **do not build or ship from it as-is.** |
| ≤ 2.1.0.0 | *(not archived)* | Earlier iterations, superseded. |

### Why "2.7.1.0" and not, say, "2.4.0.0" or "3.0.0.0"?

The version number was bumped past the last known-good release (2.3.0.0) to a round definitive number, both to clearly outrun the brief, superseded "2.4.0.0" GitHub Release, and to unambiguously signal that this is a distinct, deliberately re-branded and re-packaged milestone rather than "just another patch." The functional visual/JS payload of 2.7.1.0 is intentionally identical to 2.3.0.0 — see [`docs/decompiled/`](docs/decompiled/) for the extracted CSS/JS used to verify this byte-for-byte.

## Repository layout

```
├── README.md                    This file
├── CHANGELOG.md                 Detailed, chronological version history
├── assets/
│   └── icon.png                 Current visual icon (20×20, list glyph, #0F6CBD)
├── docs/
│   ├── icon-preview.png          Icon at a larger preview size
│   ├── ARCHITECTURE.md           Honest account of source-vs-binary state (read this)
│   └── decompiled/
│       └── v2.7.1.0/
│           ├── visual.css        CSS extracted from the shipped v2.7.1.0 binary
│           └── visual.js         JS extracted from the shipped v2.7.1.0 binary
├── releases/
│   ├── v2.2.0.0/orderedFieldParameterSelector.2.2.0.0.pbiviz
│   ├── v2.3.0.0/orderedFieldParameterSelector.2.3.0.0.pbiviz
│   └── v2.7.1.0/orderedFieldParameterSelector.2.7.1.0.pbiviz   ← install this one
└── experimental-v3-rewrite/     A separate, NOT-shipped TypeScript rewrite (see its own README)
    ├── README.md
    ├── src/…
    ├── test/…
    └── …
```

## Source code status — please read

**There is currently no editable TypeScript source that reproduces the shipped v2.7.1.0 / v2.3.0.0 binary.** Those binaries were built from a project that has been lost; only the compiled, minified `.pbiviz` packages survive (archived in [`releases/`](releases/) and extracted for reference in [`docs/decompiled/`](docs/decompiled/)).

The [`experimental-v3-rewrite/`](experimental-v3-rewrite/) folder contains a **different, from-scratch TypeScript reimplementation** (modular `StateManager`/`StateRepository`/`PersistScheduler` state engine, fully tested) that was built during an earlier session under the mistaken assumption that it matched the shipped visual. It does not: its CSS class names, DOM structure, and default sizing all differ from the real thing, and building it produces a visually different result (this is exactly what happened with the reverted 3.1.0.0 build). Its persistence logic is arguably more robust than what actually ships today, so it's kept as a reference for a *future*, carefully-verified reconciliation — but it must not be built and distributed as if it were this visual.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full explanation and a recommended path if/when someone wants to properly rebuild an editable source that matches the shipped binary pixel-for-pixel.

## Development

There is no build step for the shipped visual today — see [Source code status](#source-code-status--please-read). To experiment with the unrelated rewrite:

```bash
cd experimental-v3-rewrite
npm install
npm run verify     # typecheck + lint + test
npm run package     # produces its OWN .pbiviz — NOT a rebuild of the shipped visual
```

## License

Independent personal project by Ludovic Delot Bravo. Not published to the Microsoft AppSource marketplace; distributed via this repository's [Releases](releases/) as a manually-imported custom visual.
