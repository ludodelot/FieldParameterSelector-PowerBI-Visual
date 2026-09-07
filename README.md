# Ordered Field Parameter Selector

A Power BI custom visual for selecting, ordering, and re-ordering **Field Parameter** dimensions — with click order, expand/collapse state, selection, and scroll position that reliably survive everything Power BI's lifecycle can throw at it: refresh, filters, slicers, bookmarks, page navigation, resize, re-render, report reopen, and publish to the Service.

Built by **LVMH Beauty Tech Iberia**.

[![Power BI Custom Visual](https://img.shields.io/badge/Power%20BI-Custom%20Visual-F2C811?logo=powerbi&logoColor=black)](https://learn.microsoft.com/power-bi/developer/visuals/)
[![apiVersion](https://img.shields.io/badge/pbiviz%20apiVersion-5.11.0-0F6CBD)](pbiviz.json)
[![version](https://img.shields.io/badge/version-3.1.0.0-0F6CBD)](pbiviz.json)

---

## Table of contents

- [Why this visual exists](#why-this-visual-exists)
- [Features](#features)
- [Screenshot / layout overview](#screenshot--layout-overview)
- [Getting started](#getting-started)
- [Data roles](#data-roles)
- [Formatting options](#formatting-options)
- [State persistence architecture](#state-persistence-architecture)
- [Project structure](#project-structure)
- [Development](#development)
- [Building the .pbiviz package](#building-the-pbiviz-package)
- [Accessibility](#accessibility)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why this visual exists

Power BI's native **Field Parameters** feature lets report authors expose a set of measures or dimensions that end users can swap in and out of a chart. What it does *not* give you out of the box is:

- a way for the end user to pick **more than one** field parameter value, in a **specific order**, and reorder that selection by drag-and-drop;
- a catalog view that groups those values into **areas** and **groups** for easier browsing;
- state that actually **survives** Power BI's update lifecycle instead of resetting on every filter change, bookmark, or page navigation.

This visual is a slicer-like selector built specifically for that gap: pick items from a grouped catalog, drag to reorder them, and have that exact order (plus expand/collapse state and catalog scroll position) persist reliably across every scenario a real report goes through in production.

## Features

- **Ordered multi-selection** — click catalog items to add them to a selection list; the order you click in is preserved and exposed to the report as the field parameter's active order.
- **Drag-and-drop reordering** of the selected list, plus up/down move buttons and per-item removal.
- **Two-level grouping** (optional `domain` / `group` roles) so large catalogs of dimensions are easier to scan.
- **Deterministic, race-safe state persistence** — see [State persistence architecture](#state-persistence-architecture) below. This is the core engineering focus of this visual.
- **Configurable behavior**: maximum number of selections, "require at least one selection", "select first item on load".
- **Expand/collapse controls**: toolbar with expand-all / collapse-all, auto-expand the path to the current selection, expand fully on first load.
- **Deep formatting control**: typography, spacing/density, colors, controls sizing, and scrollbar styling — all exposed through the standard Power BI formatting pane.
- **Full keyboard navigation** (arrow keys, Enter/Space) and screen-reader announcements via a live region.

## Screenshot / layout overview

```
┌───────────────────────────────────────────────────────────┐
│  Click catalog items to add them to your ordered selection.│  ← instructions (toggle)
├───────────────────────────────┬─────────────────────────────┤
│  [ Expand all ] [ Collapse ]  │                             │  ← toolbar (toggle)
├───────────────────────────────┼─────────────────────────────┤
│ Catalog                       │ Selected order              │
│ ▸ Area A                      │  1. Item C          [↑][↓][x]│
│   ▾ Group 1                   │  2. Item A          [↑][↓][x]│
│      ☑ Item A            1    │  3. Item F          [↑][↓][x]│
│      ☐ Item B                 │                             │
│   ▸ Group 2                   │                             │
│ ▸ Area B                      │                             │
└───────────────────────────────┴─────────────────────────────┘
```

The left pane is the scrollable catalog (tree of areas → groups → items); the right pane is the user's live ordered selection, reorderable by drag-and-drop.

## Getting started

1. Download the latest `.pbiviz` package from the [Releases](../../releases) page.
2. In Power BI Desktop, go to **Visualizations → ... (More) → Import a visual from a file**, and select the downloaded `.pbiviz`.
3. Drag the new visual onto the canvas.
4. Bind your Field Parameter to the **Field Parameter** data role (see [Data roles](#data-roles)).
5. Optionally bind grouping columns to **Area / domain** and **Group / level** to organize the catalog.

## Data roles

| Role | Name | Cardinality | Purpose |
|---|---|---|---|
| Field Parameter | `fieldParameter` | required, exactly 1 column | The visible label column of the Field Parameter the user is selecting from. |
| Area / domain | `domain` | optional, 0–1 column | Top-level catalog grouping (e.g. *Product*, *Customer*, *Order*). |
| Group / level | `group` | optional, 0–1 column | Second-level catalog grouping (e.g. *Geo*, *Commercial Line*). |
| Catalog order | `catalogOrder` | optional, 0–1 column | Numeric sort key used only to control the *display* order of catalog items — independent from the user's selection order. |

The visual reads up to 1000 categorical rows (`dataReductionAlgorithm.top.count = 1000`).

## Formatting options

All exposed in the Power BI formatting pane, organized into cards:

| Card | Highlights |
|---|---|
| **Behavior** | Maximum number of selectable dimensions, require at least one selection, select the first catalog item automatically on load. |
| **Visibility** | Toggle instructions, selected-order panel, areas, groups, header, catalog title, group counts, position badges, and move buttons independently. |
| **Typography** | Font family/size per level (item/area/group/counter/section title), line height, letter spacing, bold/italic per level. |
| **Spacing and density** | Row height, vertical/horizontal/outer padding, row/group/control gaps, indentation per level. |
| **Controls** | Badge/checkbox size, button size, icon size, corner radius, selected-panel padding, badge border width. |
| **Colors** | Background, text, secondary text, accent, selected badge, selected row, hover, area/group backgrounds, panel background/border, badge border, button hover. |
| **Vertical scrolling** | Scrollbar width, thumb/track color, always-show toggle. |
| **Expansion controls** | Show/pin the expand-all/collapse-all toolbar, auto-expand path to selection, expand fully on load, toolbar sizing and colors. |

> The internal `state` object (`stateJson` / `orderJson` / `expandedJson`) is intentionally **not** exposed in the formatting pane — it is Power BI's storage backend for the engine described below, not a user-facing setting.

## State persistence architecture

This is the part of the visual that took the most engineering care, because it is also the part that is easiest to get subtly wrong in a way that only shows up intermittently in production (a filter change here, a bookmark there, and the user's carefully built order silently reverts).

### The problem with naive approaches

A common first implementation reads persisted state once (`hasLoadedPersistedState = true`, never checked again), reconstructs state from `dataView.metadata.objects` on every `update()`, and calls `host.persistProperties()` directly from every user action. That combination produces exactly the symptoms this visual is built to avoid:

- **Lost/stale order** because a later `update()` re-derives state from metadata that hasn't caught up yet with the visual's last write.
- **Race conditions** between the debounce-free `persistProperties()` call and the next `update()` Power BI fires in response to it.
- **No single source of truth** — is the real state in `metadata.objects.state`, in the selection manager, or in local variables? Depending on which one wins, behavior differs by scenario.
- **Redundant persistence calls** flooding `persistProperties()` on every intermediate drag step.

### This visual's approach: an in-memory canonical state manager

```
Power BI metadata.objects.state  (storage backend only, never read directly by the UI)
        │
        ▼
 StateRepository.readRaw()  →  deserializeState()  →  validateState()
        │
        ▼
   StateManager  (the ONE canonical, in-memory source of truth)
        │
        ├── Renderer (catalog + selected-order panel)
        ├── Drag & drop reorder
        ├── Expand / collapse
        └── Reset / remove
                 │
                 ▼
     markDirty() → PersistScheduler (debounced 350ms)
                 │
                 ▼
          persistState() → StateRepository.write()
                 │
                 ▼
        host.persistProperties()  (single call site, everywhere)
```

`metadata.objects.state` is treated purely as a **storage/serialization backend**. The visual never operates directly on it during its lifetime — `StateManager` is what every other part of the code reads from and writes to.

### How each failure mode is addressed

| Concern | Mechanism |
|---|---|
| One-shot load flag causing stale state | Replaced by `hasValidCanonicalState` (a real state-machine flag, not a load-once gate) combined with signature comparison — the canonical state *can* reload later if metadata genuinely changes externally (bookmark, filter, reopen). |
| Race between `persistProperties()` and the next `update()` | `lastWrittenSignature` lets `syncFromDataView()` recognize the echo of its own write on the next `update()` and skip reconstruction entirely — the in-memory canonical state stays authoritative. |
| Multiple sources of truth | `StateManager` is the single runtime source of truth. `StateRepository` only reads/writes the persisted properties; it never becomes the thing other code reads from. |
| Redundant `persistProperties()` calls on rapid actions | `PersistScheduler` debounces at **350ms** (within the 250–500ms target) — a burst of drags/clicks collapses into one write. |
| Unnecessary writes when nothing changed | `statesAreEqual()` compares the candidate state against the last written state before calling `persistProperties()`; identical states are skipped. |
| Corrupted or stale persisted data | `validateState()` / `validateStateAgainstTree()` check JSON validity, array shape, referenced-key existence, and duplicates. Anything invalid is dropped and a clean state is rebuilt — **never** throws. |
| Versioning / future-proofing | State is persisted as `{ version, timestamp, order, expanded, catalogScrollTop }` (`PersistedStateV1`). An unrecognized `version` is treated as absent and a clean state is built instead of trusting unknown data. |
| Scroll position loss on reload | `catalogScrollTop` is tracked in the same canonical state, debounced and validated exactly like order/expansion, and restored only on the first render of a fresh DOM (report reopen / page navigation) — never fighting the user's live scrolling on unrelated re-renders. |
| Mixed responsibilities inside `update()` | `update()` **never persists**. Its only job: read data → build tree → sync state if changed → validate → apply → render. Persistence happens exclusively from `PersistScheduler`'s debounced callback, in response to explicit user actions. |
| Multiple call sites for `persistProperties()` | There is exactly **one**: `StateRepository.write()`, called only from `StateManager.persistState()`. Every user action (select, drag, expand, reset) flows through `markDirty()` → `schedulePersist()` → (debounce) → `persistState()`. |
| Debuggability | Every state transition logs through a single `stateLog()` helper, consistently prefixed `[STATE]` (see `src/state/stateLog.ts`) — trivially strippable by flipping `DEBUG_STATE` to `false`. |

### Key files

| File | Responsibility |
|---|---|
| [`src/state/stateManager.ts`](src/state/stateManager.ts) | The canonical in-memory state: dirty tracking, debounced persistence, echo/staleness detection, all user-action entry points. |
| [`src/state/stateRepository.ts`](src/state/stateRepository.ts) | Thin read/write seam to `dataView.metadata.objects.state` — the only place that touches `host.persistProperties()`. |
| [`src/state/persistScheduler.ts`](src/state/persistScheduler.ts) | Generic debounce primitive used for the 350ms persist window. |
| [`src/state/serialize.ts`](src/state/serialize.ts) | `serializeState` / `deserializeState`, `statesAreEqual`, `validateStateAgainstTree` — pure functions, unit-tested independently of Power BI. |
| [`src/state/stateLog.ts`](src/state/stateLog.ts) | Single-point-of-truth `[STATE]`-prefixed diagnostic logger. |
| [`src/visual.ts`](src/visual.ts) | Wires `StateManager` into the visual lifecycle (`update()`, `destroy()`) and the renderer's user-action callbacks. |

## Project structure

```
├── src/
│   ├── formatting/        Formatting-pane model (settings.ts)
│   ├── model/             Catalog tree building, ordered-selection model, shared types
│   ├── rendering/         DOM construction and all render/interaction logic (no persistence here)
│   ├── state/             The state-persistence engine described above
│   └── visual.ts          IVisual entry point
├── style/                 visual.less
├── test/                  Jest unit tests (state serialization, validation, equality)
├── capabilities.json      Data roles, data view mappings, persisted objects schema
├── pbiviz.json            Visual metadata (name, guid, version, api version)
└── package.json
```

## Development

Requirements: Node.js 18+ and npm.

```bash
npm install        # install dependencies
npm start           # pbiviz start — live-reload dev server against Power BI Desktop/Service
npm run typecheck    # tsc, no emit
npm run lint         # eslint over src/
npm run test         # jest unit tests
npm run verify       # typecheck + lint + test, in one shot
```

## Building the `.pbiviz` package

```bash
npm install
npm run package     # → dist/*.pbiviz
```

This produces a single importable `.pbiviz` file in `dist/`, ready to import into Power BI Desktop or upload to the Power BI Service as an organizational custom visual.

## Accessibility

- Full keyboard support in the catalog tree: <kbd>↑</kbd>/<kbd>↓</kbd> to move focus, <kbd>→</kbd>/<kbd>←</kbd> to expand/collapse a group, <kbd>Enter</kbd>/<kbd>Space</kbd> to activate a row.
- `role="tree"` / `role="listbox"` semantics on the catalog and selected-order panel respectively.
- A polite live region announces selection changes ("*X added to selection*", "*X removed from selection*", limit/required-selection messages) for screen readers.

## Roadmap

The visual currently does **not** implement some of the optional features Power BI recommends for all custom visuals — tracked here for future work:

- Allow Interactions
- Bookmarks support (beyond state persistence — dedicated bookmark object model)
- Report Color Palette integration
- Context menu
- High Contrast mode
- Landing page
- Localization
- Sync slicers
- Tooltips

## License

Internal LVMH Beauty Tech Iberia project. Not published to the Microsoft AppSource marketplace; distributed as an organizational custom visual via GitHub Releases.
