# Ordered FP Selector (Horizontal)

Separate custom visual (own GUID, so it coexists with the vertical *Ordered FP Selector* in the same report). Same data roles, filter and saved-state logic as v3.2.1.0; only the layout changes.

- **Header row**: title, counter, expand/collapse toolbar and Reset/Clear on one line.
- **Matrix order**: one strip of chips `① Store ‹ › ×`. Drag a chip onto another to reorder; the `‹ ›` buttons (setting *Show reorder buttons*) do the same from the keyboard or touch.
- **Catalog**: one row per area (tab on the left); its groups and dimension chips flow to the right and wrap when out of space.
- **Keyboard**: arrows / Home / End move between chips and headers, Enter or Space selects or expands.

```bash
cd visual-horizontal
npm ci
npm run verify    # typecheck + lint + 86 tests
npm run package   # dist/*.pbiviz
```

Not yet tested in a live Power BI report; drag and drop in particular should be checked in Desktop and the Service.
