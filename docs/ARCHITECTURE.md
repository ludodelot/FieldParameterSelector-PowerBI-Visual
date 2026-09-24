# Architecture

## Source history

Up to v2.7.1.0 the visual existed only as compiled `.pbiviz` packages; the original TypeScript project was lost. Earlier versions of this document claimed the shipped binary used a simple one-shot `hasLoadedPersistedState` flag instead of a state engine. That was wrong: the decompiled bundle ([`decompiled/v2.7.1.0/visual.js`](decompiled/v2.7.1.0/visual.js)) contains a full state layer — StateManager (webpack module 626), StateRepository (129), a 300 ms PersistScheduler (623), and a serializer/validator/equality/defaults set (433/467/794/932, schemaVersion 2). The `hasLoadedPersistedState` flag wrapped that engine and was the cause of several bugs.

v3.2.0.0 rebuilds an editable source in [`visual/`](../visual/) from that bundle:

- the formatting model, CSS, DOM structure, class names and defaults were ported 1:1, so the visual looks the same as v2.7.1.0 (the stylesheet is the shipped CSS verbatim, plus one `:focus-visible` rule);
- the update/state logic was rewritten to fix the issues found in the audit of the bundle.

The old `experimental-v3-rewrite/` folder (a different, from-scratch reimplementation with another DOM and sizing) was removed; it is still in git history.

## Modules (`visual/src`)

| Module | Role |
|---|---|
| `visual.ts` | Power BI entry point. Reads the update, feeds the controller, renders, and always ends with `renderingFinished` or `renderingFailed`. |
| `selectorController.ts` | Selection, expansion and persistence logic. No DOM and no host object, so tests can drive it with simulated update sequences. |
| `model/catalog.ts` | Builds the catalog from the dataView: item keys, sorting, default item, expansion keys. |
| `filter/identityFilter.ts` | Builds and reads the identity filter, and maps its targets back to item keys. |
| `state/persistedState.ts` | Persisted format (schema v3) and migration from v1 (`orderJson` / `expandedJson`) and v2. |
| `state/stateRepository.ts` | Reads `state.stateJson` from the dataView metadata; writes it with `persistProperties`. |
| `state/stateStore.ts` | Immutable in-memory state with a 300 ms persist debounce. Remembers its recent writes to recognize their echoes. |
| `render/renderer.ts`, `render/keyboard.ts`, `render/cssVariables.ts` | DOM, keyboard navigation and CSS custom properties. |
| `settings.ts`, `viewSettings.ts` | Formatting pane model and its flattened, read-only view. |
| `strings.ts` + `stringResources/` | UI strings (en-US, es-ES). |

## State model

Two things are persisted by Power BI on the visual's behalf:

1. **The filter** (`general.filter`): an identity filter whose targets are dataView row indices in click order. Field parameters display fields in that order, which is what makes the click order drive the matrix.
2. **The state** (`state.stateJson`): click order (item keys = labels), expanded area/group keys, scroll position, and `applied` — the `[rowIndex, key]` pairs of the last filter the visual applied.

Rules the controller follows:

- **The filter decides membership** whenever it is present. Targets equal to the recorded `applied` indices are resolved through the recorded keys, so a row shift (new Field Parameter row, cross-filtered subset) cannot select the wrong fields. Other targets are resolved through the current rows.
- **The state is re-read whenever it changes externally.** A `stateJson` value the visual did not write (bookmark, Reset to default, Desktop undo) is loaded. Echoes of its own writes are recognized in order and ignored.
- **Updates without rows are ignored.** Refresh-in-flight and query-pending updates never touch the state.
- **Keys absent from the current data are kept**, so a cross-filter does not wipe the order.
- **Load**: the visual is ready as soon as a filter arrives with data. Without one, it waits 500 ms (a grace period for a late filter), then re-applies the saved click order, or applies the default item.
- **Echo handling**: after applying a filter, updates that still carry one of the visual's earlier applies are ignored until the latest apply is echoed (safety cap 30 s). Updates carrying the filter from before the apply are ignored for 3 s; after that, a filter equal to it is treated as an external change.
- **External clear** (filter removed from outside): with *Require at least one dimension* the selection is re-applied. Otherwise it is cleared so the UI matches the unfiltered report.
- **Expansion**: *Expand catalog fully on load* only seeds visuals without saved state. Selected paths are expanded only when an item becomes selected, never on unrelated updates, so user collapses stick.
- **Persistence**: selection and expansion changes are written after a 300 ms debounce. Scrolling alone never calls `persistProperties`; the position is saved with the next real change.

## Build

```bash
cd visual
npm install
npm run verify    # typecheck + lint + 81 Jest tests
npm run package   # dist/orderedFieldParameterSelectorD10670849B7345FAA12E5EBB2AD0E3BA.<version>.pbiviz
```

The GUID `orderedFieldParameterSelectorD10670849B7345FAA12E5EBB2AD0E3BA` must never change. Existing reports upgrade in place only while it stays the same.
