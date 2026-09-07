# ⚠️ Experimental rewrite — NOT what ships

**This is not the source code of the Ordered FP Selector visual you can download from [`../releases/`](../releases/).** It is a separate, from-scratch TypeScript reimplementation that does not match the real shipped binary — different CSS class names, different default sizing (12px fonts vs. the real 9px, 18px badges vs. 13px, 8px padding vs. 3px), and a different, more elaborate state-persistence engine than what actually ships today.

Building and packaging this project (`npm run package`) produces a *different-looking visual* than `releases/v2.7.1.0/orderedFieldParameterSelector.2.7.1.0.pbiviz`. This is exactly what happened when it was briefly shipped as "v3.1.0.0" and immediately reverted — see [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the full explanation and a recommended path if you want to properly reconcile this code with the real binary.

**Do not build this and distribute it as the Ordered FP Selector visual.**

## What it is, then

A well-tested (typecheck + lint + 12 unit tests passing), modular TypeScript implementation of the same *concept* — an ordered Field Parameter catalog selector — including a `StateManager` / `StateRepository` / `PersistScheduler` engine (debounced persistence, dirty-flag tracking, echo-of-own-write detection, schema-versioned state, corruption-safe validation) that is arguably more robust than the real shipped visual's simple `hasLoadedPersistedState` approach.

It's kept here in case someone wants to invest the real effort to reconcile its CSS/DOM layer with the actual shipped binary (`../docs/decompiled/v2.7.1.0/`) and deliberately decide whether to carry its persistence engine forward. That is a real, separate project — not a quick fix.

## Running it (for experimentation only)

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run package   # produces ITS OWN .pbiviz, unrelated to the shipped visual
```
