# Ordered FP Selector

**Choose Power BI Field Parameter items in the order you want them to appear.** Ordered FP Selector is a custom visual that combines a grouped catalog, an editable selection list, and persistent selection state.

<img src="docs/icon-preview.png" width="88" height="88" alt="Ordered FP Selector icon" />

[Download v3.2.1.0](releases/v3.2.1.0/orderedFieldParameterSelector.3.2.1.0.pbiviz) · [Installation](#quick-start) · [How it works](#how-selection-and-order-work) · [Release notes](docs/RELEASE_NOTES_v3.2.1.0.md)

> **At a glance:** Click **Region → Brand → Product** to make that your selected order. Use the ↑/↓ controls to change it to **Brand → Region → Product** without removing and reselecting fields. The visual applies a Power BI identity filter in that order to the Field Parameter.

## Why use it?

Power BI Field Parameters let report readers choose the fields or measures shown in a visual. A standard slicer can select multiple parameter values, but this project adds explicit **click order and reordering controls**, an optional **two-level catalog**, and saved UI state. It is useful when a reader needs to choose and arrange dimensions in a matrix or another visual that uses a Field Parameter.

| Report reader | Report author |
| --- | --- |
| Select several items in a deliberate sequence. | Organize a long parameter list by area and group. |
| Move an item up or down, or remove it. | Set a selection limit and control the initial selection. |
| Return to a report with the saved order and expanded groups. | Style the catalog and selected-order panel in Power BI's formatting pane. |

The project is distributed as a `.pbiviz` file for manual import. It is **not listed on Microsoft AppSource**.

## Quick start

1. In Power BI Desktop, create a Field Parameter with **Modeling → New parameter → Fields**. Add the fields you want readers to choose. See [Microsoft's Field Parameter guide](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters) if you are starting from a new report.
2. Put that Field Parameter in the field well of the visual you want to control, such as the **Rows** well of a matrix. Keep the same parameter available for the selector.
3. [Download the current `.pbiviz`](releases/v3.2.1.0/orderedFieldParameterSelector.3.2.1.0.pbiviz). Enable **Developer mode** for the current Power BI Desktop session, then choose **… → Import a visual from a file** in the **Visualizations** pane and select the downloaded file. [Microsoft documents the file-import flow and Developer mode requirement here](https://learn.microsoft.com/en-us/power-bi/developer/visuals/import-visual).
4. Add **Ordered FP Selector** to the page. Drag the **visible label column** of your Field Parameter into its required **Field Parameter** role.
5. Click items in the selector and confirm that the other visual changes. If your parameter contains *Region*, *Brand*, and *Product*, clicking them in that order produces a selected list of `Region → Brand → Product`; use ↑/↓ to rearrange it.

The grouping and catalog-order fields are optional. Start with the required role, then add the others if the catalog needs structure.

## How selection and order work

```mermaid
flowchart LR
    A[Field Parameter table] --> B[Ordered FP Selector catalog]
    B --> C[Selected items in click order]
    C --> D[Power BI identity filter]
    D --> E[Visual using the same Field Parameter]
```

**Catalog order** controls where choices appear *before* a reader selects them. **Selected order** comes from the reader's clicks and ↑/↓ changes. Changing the catalog order does not rearrange an existing selection.

For example, a catalog might display `Brand, Product, Region`, while a reader selects `Region → Brand`. The selected-order panel shows `Region → Brand`, and moving Brand up changes it to `Brand → Region`.

The visual stores the selected order, expanded catalog sections, and scroll position in Power BI's visual state. Selection and expansion changes persist the state; **scrolling by itself does not mark the report as modified**. The scroll position is saved with the next selection or expansion change. Version 3.2.0.0 introduced the restoration fixes across refresh, filters, bookmarks, page navigation, resize, and reopening a report. Version 3.2.1.0 has the same runtime behavior; see its [release notes](docs/RELEASE_NOTES_v3.2.1.0.md) and the [changelog](CHANGELOG.md).

## Data roles

| Role in the visual | Required? | What to bind |
| --- | --- | --- |
| **Field Parameter** (`fieldParameter`) | Yes, one column | The parameter's visible label column. |
| **Area / domain** (`domain`) | No, up to one column | Top-level category, such as Product or Customer. |
| **Group / level** (`group`) | No, up to one column | Category within an area, such as Geography or Commercial Line. |
| **Catalog order** (`catalogOrder`) | No, up to one column | Numeric position used to display catalog items. It does not set selection order. |

Without an Area or Group field, items appear under the default headings **Uncategorized** and **Other** when those headings are shown. Without Catalog order, items follow the Field Parameter's row order within each group; areas and groups sort alphabetically. With Catalog order, each area's and group's position follows its lowest item order.

> The visual receives at most **1,000 catalog rows** from its current Power BI data-view mapping. Review this limit before using it with a very large parameter table.

## Controls and behavior

| Action | Result |
| --- | --- |
| Click a catalog item | Add it to the end of the selected order; click it again to remove it. |
| Use ↑/↓ beside a selected item | Move it one position without changing membership. |
| Expand or collapse an area/group | Show or hide its children; use the toolbar for expand all or collapse all. |
| Clear or reset the list | Clear all when empty selection is allowed; otherwise return to the default item. |

The default item is the first by **Catalog order**, or by the Field Parameter's own order when Catalog order is not bound. **Require at least one dimension** keeps one item selected; **Select first child on load** chooses the default on initial load. **Maximum dimensions** caps the number of selected items.

The catalog supports keyboard navigation: Tab into it, use ↑/↓ to move between visible entries, Home/End to jump to the ends, ←/→ to collapse or expand headers, and Enter/Space to activate a focused button. The interface is localized in English and Spanish.

### Formatting pane

The Power BI formatting pane includes cards for **Behavior**, **Visibility**, **Typography**, **Spacing and density**, **Controls**, **Colors**, **Vertical scrolling**, and **Expansion controls**. These cover the selection rules, which sections appear, text and spacing, colors, scrollbar, and toolbar. See [`visual/capabilities.json`](visual/capabilities.json) for every exposed property and [`visual/src/settings.ts`](visual/src/settings.ts) for its defaults.

Internal `stateJson`, `orderJson`, and `expandedJson` properties are storage fields, not settings to edit manually.

## Notes and limitations

- The selector must be bound to the **same Field Parameter** used by the visual it controls.
- Saved items use their visible labels as keys for unique labels. Renaming a parameter label can remove that item from a saved selection. Duplicate labels in different areas or groups receive qualified keys; avoid ambiguous labels where possible.
- If another control clears the selector's filter, **Require at least one dimension** reapplies a selection; with that option off, the selector clears its list to match the report.
- Power BI treats no Field Parameter selection as **all fields selected**, so allowing an empty list in the selector does not create a true “show no fields” state. See [Microsoft's Field Parameter limitations](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters#known-limitations-of-field-parameters).
- Organizational Power BI settings may restrict importing custom visuals from a file. Check your tenant policy if the import option is unavailable.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| The catalog is empty | Bind exactly one visible Field Parameter label column to **Field Parameter**. |
| Selecting an item does not change the matrix/chart | Confirm that the target visual uses the same Field Parameter and that Power BI's visual interactions permit filtering. |
| Items appear in an unexpected place | Check **Catalog order** for display order; use ↑/↓ for the reader's selected order. |
| A saved item disappears after a model edit | Check whether its visible Field Parameter label was renamed. |

## Release and source

**Current version: 3.2.1.0.** Its package is [`releases/v3.2.1.0/orderedFieldParameterSelector.3.2.1.0.pbiviz`](releases/v3.2.1.0/orderedFieldParameterSelector.3.2.1.0.pbiviz). This is a documentation and packaging release with the same runtime as v3.2.0.0. The visual GUID is retained for upgrades in existing reports. Earlier packages are kept in [`releases/`](releases/); consult the [release notes](docs/RELEASE_NOTES_v3.2.1.0.md) and [changelog](CHANGELOG.md) before using one. Version 3.1.0.0 was reverted and should not be installed.

The editable TypeScript source is in [`visual/`](visual/). The [architecture guide](docs/ARCHITECTURE.md) explains the filter, persisted state, and source history. To verify or package it locally:

```bash
cd visual
npm ci
npm run verify
npm run package
```

`npm run verify` runs TypeScript checks, ESLint, and Jest tests. Packaging writes a `.pbiviz` to `visual/dist/`. Keep the GUID in [`visual/pbiviz.json`](visual/pbiviz.json) unchanged when building an upgrade.

## Authorship and license

Designed and built independently by **Ludovic Delot Bravo**, originally for a Power BI reporting need at LVMH Beauty Tech Iberia. This is a personal project; it is not an official LVMH product and is not maintained or endorsed by LVMH. The visual's Power BI name, author, and description do not carry LVMH branding.

The source package declares `UNLICENSED`, and this repository does not currently include a separate open-source license. The published `.pbiviz` is available here for manual import; no broader reuse or redistribution license is stated.
