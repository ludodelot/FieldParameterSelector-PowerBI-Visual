# Architecture status — source vs. shipped binary

This document exists so nobody repeats the mistake that produced (and then required reverting) v3.1.0.0. Read it before touching `experimental-v3-rewrite/`.

## The situation, plainly

- The visual that actually works and ships — v2.2.0.0, v2.3.0.0, and now v2.7.1.0 — exists **only as a compiled `.pbiviz` binary**. Its original TypeScript project source is lost.
- A separate GitHub session, working without access to that binary, built a from-scratch reimplementation (`experimental-v3-rewrite/`) that it *believed* corresponded to v2.3.0.0, because the two projects happen to share the same `pbiviz.json` marketing description text.
- They do not correspond. Decompiling the real v2.3.0.0 binary (`docs/decompiled/v2.7.1.0/visual.css`, extracted 2026-09-07) and diffing it against `experimental-v3-rewrite/style/visual.less` shows:
  - Different CSS class names throughout (`.row` / `.badge` / `.group-header` / `.catalog-scroll` in the real binary vs. `.ofps-item-row` / `.ofps-position-badge` / `.ofps-group-header` / `.ofps-catalog-list` in the rewrite).
  - Different default sizing (9px item font vs. 12px, 13px badges vs. 18px, 3px outer padding vs. 8px, 18px row height vs. 28px).
  - Different state-persistence engine: the real binary uses a simple `hasLoadedPersistedState` one-shot flag; the rewrite implements a considerably more sophisticated `StateManager` / `StateRepository` / `PersistScheduler` engine with debouncing, dirty-flag tracking, echo-of-own-write detection, and full unit test coverage.

Building and shipping `experimental-v3-rewrite/` as "the visual" is what produced v3.1.0.0, which looked broken to an end user comparing it against the real v2.3.0.0 they were used to. That commit was reverted the same day.

## What v2.7.1.0 actually is

v2.7.1.0 is **not a rebuild**. It is the real, verified-working v2.3.0.0 binary with only its metadata edited directly (no source recompilation involved):

- `visual.version`: `2.3.0.0` → `2.7.1.0`
- `visual.displayName`: `Ordered FP Selector by LVMH Beauty Tech Iberia v2.3` → `Ordered FP Selector`
- `visual.description`: rewritten to drop the LVMH mention and the inaccurate "StateManager/StateRepository/PersistScheduler" claim (see above — the real binary doesn't have that engine)
- `visual.supportUrl` / `visual.gitHubUrl`: point at this repository
- `author`: `LVMH Beauty Tech Iberia` → `Ludovic Delot Bravo`
- `content.iconBase64`: replaced with the new list-glyph icon (`assets/icon.png`)
- The embedded `content.css` and `content.js` — the actual visual behavior — were **not touched**.

You can verify this yourself: `docs/decompiled/v2.7.1.0/visual.css` and `visual.js` are byte-for-byte extracts of what's inside `releases/v2.7.1.0/orderedFieldParameterSelector.2.7.1.0.pbiviz`, and (aside from the icon/metadata swap) match `releases/v2.3.0.0/orderedFieldParameterSelector.2.3.0.0.pbiviz`'s payload exactly.

## If someone wants to properly reconstruct editable source later

This is real work, not a quick pass — treat it as its own project, not a side task bundled into an unrelated fix:

1. Start from `docs/decompiled/v2.7.1.0/visual.css` and `visual.js` as ground truth, not from `experimental-v3-rewrite/`.
2. Rebuild the DOM/CSS layer (`.root`, `.catalog-scroll`, `.header`, `.selected-panel`, `.row`, `.badge`, `.group-header`, `.toolbar`, etc. — see the class names in the decompiled CSS) to pixel-match the real thing, verified by side-by-side screenshots against `releases/v2.7.1.0/`, not by assumption.
3. Only then decide whether to keep the real binary's simpler `hasLoadedPersistedState` persistence model (safer, matches the original exactly) or deliberately upgrade to something like `experimental-v3-rewrite/`'s `StateManager` engine — as a conscious, separately-reviewed decision, not a silent side effect of a visual refresh.
4. Verify with `pbiviz package` + a byte/behavior diff against the real binary before calling it done, exactly like this document did for the metadata-only v2.7.1.0 change.

## Why this matters

The person using this visual has been burned once already by a rebuild that "looked done" (typechecked, linted, tests passed) but was visually wrong because nobody checked it against the real artifact. The fix going forward is procedural, not just historical: **any future change to this visual must be diffed against the actual shipped binary** (`releases/v2.7.1.0/` or later), not just against its own test suite.
