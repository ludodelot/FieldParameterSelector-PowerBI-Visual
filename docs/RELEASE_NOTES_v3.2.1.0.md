# Ordered FP Selector v3.2.1.0 — release notes

**Release date:** 2026-09-25  
**Package:** [`orderedFieldParameterSelector.3.2.1.0.pbiviz`](../releases/v3.2.1.0/orderedFieldParameterSelector.3.2.1.0.pbiviz)  
**SHA-256:** `ac40f8573881544c5954c71fbead47570aea10ecf10c028f81277d5e9569f569`

## Summary

v3.2.1.0 is a **documentation and packaging release** of Ordered FP Selector. It gives report authors a much clearer installation path, usage guide, behavior reference, limitations, and troubleshooting guidance. The visual is rebuilt with a new version number so this documentation release can be installed and identified as a distinct package. **There are no changes to the visual's runtime behavior or appearance compared with v3.2.0.0.**

The visual remains a grouped selector for Power BI Field Parameters: readers choose multiple items in click order, move them with ↑/↓, and use the resulting identity filter to control a matrix or another visual bound to the same Field Parameter. The changes to refresh, bookmark, and saved-state behavior were introduced in **v3.2.0.0**, not in this release.

## What changed in v3.2.1.0

| Area | Change | Effect |
| --- | --- | --- |
| Package identity | Visual version raised from `3.2.0.0` to `3.2.1.0`; npm package version raised from `3.2.0` to `3.2.1`. | Power BI can identify this as a newer build of the same visual GUID. |
| README | Rewritten around the user journey: download, bind the Field Parameter, choose and reorder items, then tune optional roles and formatting. | Report authors can get started without reading implementation details first. |
| Documentation | Added these release notes, an explicit distinction between catalog order and selected order, current import steps, known limits, and troubleshooting. | The package's behavior and upgrade expectations are easier to audit. |
| Runtime | No source, CSS, capability, locale, or asset changes. | Existing reports should behave and look the same as with v3.2.0.0. |

The package comparison was performed on the parsed `.pbiviz.json` payloads from both archives. The `content` bundle, `capabilities`, `style`, `stringResources`, `assets`, `apiVersion`, and author metadata are identical. The only payload difference is `visual.version`.

## Install or upgrade

1. Download the [v3.2.1.0 `.pbiviz`](../releases/v3.2.1.0/orderedFieldParameterSelector.3.2.1.0.pbiviz).
2. In Power BI Desktop, enable **Developer mode** for the current session. In **Visualizations**, choose **… → Import a visual from a file** and select the package. See [Microsoft's import instructions](https://learn.microsoft.com/en-us/power-bi/developer/visuals/import-visual).
3. For a new report, create a Field Parameter with **Modeling → New parameter → Fields**. Add that parameter to the visual you want to control and bind its visible label column to the selector's **Field Parameter** role. [Microsoft's Field Parameter guide](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters) explains the model setup.
4. For an existing report using v3.2.0.0, import the new package and check one report page before wider distribution. The GUID is unchanged, so the visual is designed to upgrade in place and preserve its existing configuration.

No model migration, data-role change, or formatting migration is required for an upgrade from v3.2.0.0. The saved-state schema also remains v3, which was introduced in v3.2.0.0. If upgrading from v2.x, read the [v3.2.0.0 changelog](../CHANGELOG.md#3200--2026-09-24--superseded-by-3210) for the behavior changes inherited by this build.

## Behavior included from v3.2.0.0

These capabilities are present in v3.2.1.0 because the underlying runtime is unchanged:

| Scenario | Expected behavior |
| --- | --- |
| Click several catalog items | Their order follows the clicks; ↑/↓ changes that order without removing items. |
| Refresh or cross-filter the page | Updates without data rows do not replace the selection with the default; temporarily hidden items keep their saved position. |
| Return through a bookmark, undo, or Reset to default | The visual reads externally restored state again, including selected order, expanded sections, and saved scroll position. |
| Collapse a group or all groups | A later render does not immediately reopen the user-collapsed section. |
| Scroll the catalog | Scrolling alone does not write Power BI state or create a report undo step; the position is saved with a later selection or expansion change. |
| Remove the filter outside the selector | With **Require at least one dimension** on, a selection is reapplied; otherwise the selected list clears. |

Selection membership comes from Power BI's filter. Persisted visual state retains click order, expansion, scroll position, and the last applied filter targets. The [architecture guide](ARCHITECTURE.md) documents how those two sources are synchronized during host updates.

## Compatibility and limits

- The selector and the target matrix/chart must use the **same Field Parameter**. **Catalog order** changes the catalog display order; it does not change the reader's current selected order.
- The `capabilities.json` mapping requests up to **1,000 rows**. Very large parameter tables need separate validation.
- Renaming a visible parameter label can remove that item from a saved selection. Duplicate labels in different areas or groups are supported, but unique labels remain the clearest option for readers.
- Power BI interprets no Field Parameter selection as selecting all fields. Allowing an empty list does not provide a true “show no fields” state. See [Microsoft's limitations](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters#known-limitations-of-field-parameters).
- The `.pbiviz` is distributed through this repository for manual import and is not listed on Microsoft AppSource. An organization's custom-visual policy can affect whether it can be imported.

## Verification and rollout status

- `npm ci`, `npm run verify`, and `npm run package` completed with Node dependencies from the committed lockfile.
- TypeScript checks and ESLint passed; all **81 Jest tests** passed. These tests include simulated refresh, bookmark, reset, cross-filter, and shifted-row update sequences.
- The produced package was inspected against v3.2.0.0 and differs only in `visual.version` within its parsed payload.
- This release has **not been tested inside a live Power BI Desktop or Service report** in this release process. Verify the import, selected order, bookmark restoration, and report reopening in a representative report before an organization-wide rollout.

For the complete functional history, see [`CHANGELOG.md`](../CHANGELOG.md). To build from source, see the [README](../README.md#release-and-source).
