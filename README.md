# Ordered FP Selector

A Power BI custom visual for selecting, ordering, and re-ordering **Field Parameter** dimensions — click catalog items in the order you want them, reorder your selection with the ↑/↓ buttons, and have that exact order (plus expand/collapse state and catalog scroll position) reliably persist across refresh, filters, bookmarks, page navigation, resize, and report reopen.

<img src="docs/icon-preview.png" width="96" height="96" alt="Ordered FP Selector icon" />

**Current release: [v3.2.0.0](releases/v3.2.0.0/)** — see [Releases](#releases--version-history) below.

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
- [Development](#development)
- [License](#license)

---

## Why this visual exists

Power BI's native **Field Parameters** feature lets report authors expose a set of measures or dimensions that end users can swap in and out of a chart. What it does *not* give you out of the box is:

- a way for the end user to pick **more than one** field parameter value, in a **specific order**, and reorder that selection;
- a catalog view that groups those values into **areas** and **groups** for easier browsing;
- state that actually **survives** Power BI's update lifecycle instead of resetting on every filter change, bookmark, or page navigation.

This visual is a slicer-like selector built specifically for that gap: pick items from a grouped catalog, reorder them, and have that exact order persist reliably across every scenario a real report goes through in production.

## Features

- **Ordered multi-selection** — click catalog items to add them to a selection list; the order you click in is preserved and exposed to the report as the field parameter's active order.
- **Reordering** of the selected list with up/down move buttons, plus per-item removal.
- **Two-level grouping** (optional `domain` / `group` roles) so large catalogs of dimensions are easier to scan.
- **Persistent state**: selection order and expansion state survive refresh, filter changes, cross-filtering, bookmarks, *Reset to default*, page navigation, resize, and report reopen. The catalog scroll position is saved together with the next selection or expansion change (scrolling alone never marks the report as modified).
- **Configurable behavior**: maximum number of selections, "require at least one selection", "select first item on load".
- **Expand/collapse controls**: toolbar with expand-all / collapse-all, auto-expand the path to the current selection, expand fully on first load.
- **Deep formatting control**: typography, spacing/density, colors, controls sizing, and scrollbar styling — all exposed through the standard Power BI formatting pane.
- **Keyboard navigation**: Tab to the catalog, then ↑/↓, Home/End, ←/→ to collapse and expand, Enter/Space to select. Buttons expose `aria-pressed` / `aria-expanded`.
- **Localized UI** (English, Spanish).

## Installing

1. Download `orderedFieldParameterSelector.3.2.0.0.pbiviz` from [`releases/v3.2.0.0/`](releases/v3.2.0.0/) (or from the GitHub Release). It replaces any earlier version in existing reports, because the GUID is unchanged.
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

This table matches [`visual/capabilities.json`](visual/capabilities.json), which is unchanged from the v2.7.1.0 binary except that `state.orderJson` is now typed as text.

### Behavior notes

- **Default item** (for *Select first child on load*, *Require at least one dimension* and **Reset**) is the first item by **Catalog order**, or by the Field Parameter's own order when Catalog order is not bound.
- With **Catalog order** bound, areas and groups follow the lowest catalog order of their items; otherwise they are alphabetical.
- If the visual's filter is removed from outside (Reset to default, Clear all slicers, filter pane): with *Require at least one dimension* on, the selection is re-applied; otherwise it is cleared.
- Items are identified by their label. Renaming a Field Parameter label drops it from saved selections.

## Releases / version history

All shipped `.pbiviz` binaries are archived in [`releases/`](releases/), one folder per version, so any previous build can be recovered exactly.

| Version | Folder | Status |
|---|---|---|
| **3.2.0.0** | [`releases/v3.2.0.0/`](releases/v3.2.0.0/) | ✅ **Current release.** First build from the editable source in [`visual/`](visual/). Same look as 2.7.1.0; fixes the refresh, bookmark, persistence and filter-sync issues found in the audit. See [CHANGELOG](CHANGELOG.md). |
| 2.7.1.0 | [`releases/v2.7.1.0/`](releases/v2.7.1.0/) | Superseded. Re-branded republish of 2.3.0.0 (same JS/CSS). |
| 2.3.0.0 | [`releases/v2.3.0.0/`](releases/v2.3.0.0/) | Historical. Added catalog scroll-position persistence on top of 2.2.0.0. Briefly re-published as an intermediate "v2.4.0.0" GitHub Release on 2026-09-07; that release has been superseded by 2.7.1.0 and should not be used going forward. |
| 2.2.0.0 | [`releases/v2.2.0.0/`](releases/v2.2.0.0/) | Historical. Adds race-safe saved-filter restoration, persistent click order, fixed selected-order panel, catalog scrolling (no persisted position yet), configurable styling, expansion controls, required-selection support. |
| 3.1.0.0 | *(not archived)* | ❌ Built from an unrelated rewrite (different DOM and sizes) and reverted the same day, 2026-09-07. Its GitHub Release is outdated; do not use it. |
| ≤ 2.1.0.0 | *(not archived)* | Earlier iterations, superseded. |

### Why "3.2.0.0"?

It is higher than every version published so far, including the reverted 3.1.0.0 GitHub Release, so Power BI always treats it as the newest build of this GUID.

## Repository layout

```
├── README.md                    This file
├── CHANGELOG.md                 Detailed, chronological version history
├── assets/icon.png              Visual icon
├── visual/                      Buildable source of the visual (TypeScript, pbiviz)
│   ├── src/                     Visual, controller, state, filter, rendering
│   ├── test/                    Jest tests (update-sequence simulations)
│   ├── style/visual.less        Shipped v2.7.1.0 CSS + focus outline
│   ├── stringResources/         en-US, es-ES
│   ├── capabilities.json
│   └── pbiviz.json
├── docs/
│   ├── ARCHITECTURE.md          Modules and state model
│   └── decompiled/v2.7.1.0/     CSS/JS extracted from the v2.7.1.0 binary (reference)
└── releases/                    Every shipped .pbiviz, one folder per version
```

## Development

```bash
cd visual
npm install
npm run verify     # typecheck + lint + tests
npm run package    # dist/orderedFieldParameterSelectorD10670849B7345FAA12E5EBB2AD0E3BA.<version>.pbiviz
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how state and filters are handled. Keep the GUID in `pbiviz.json` unchanged.

## License

Independent personal project by Ludovic Delot Bravo. Not published to the Microsoft AppSource marketplace; distributed via this repository's [Releases](releases/) as a manually-imported custom visual.
