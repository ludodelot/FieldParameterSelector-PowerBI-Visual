import { areaKey, groupKey } from "../src/model/catalog";
import { ECHO_TIMEOUT_MS, FILTER_GRACE_MS } from "../src/selectorController";
import { deserializeState } from "../src/state/persistedState";
import { Harness, ROWS, stateJsonOf } from "./helpers";

// Row indices in ROWS: Brand 0, Category 1, Store 2, Country 3.
const APPLIED_STORE_BRAND = [[2, "Store"], [0, "Brand"]] as const;

function readyWithSelection(options = {}): Harness {
    const h = new Harness();
    h.update({
        rows: ROWS,
        stateJson: stateJsonOf({ order: ["Store", "Brand"], applied: APPLIED_STORE_BRAND }),
        filter: [2, 0],
        options,
    });
    return h;
}

describe("load", () => {
    test("becomes ready immediately when the saved filter arrives with the first data", () => {
        const h = readyWithSelection();

        expect(h.controller.phase).toBe("ready");
        expect(h.controller.order).toEqual(["Store", "Brand"]);
        expect(h.applied).toEqual([]);
    });

    test("applies the default selection after the grace period without extra updates (#6)", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [] });
        expect(h.controller.phase).toBe("restoring");
        expect(h.applied).toEqual([]);

        h.clock.advance(FILTER_GRACE_MS);

        expect(h.controller.phase).toBe("ready");
        expect(h.controller.order).toEqual(["Brand"]);
        expect(h.lastApplied).toEqual([0]);
        expect(h.asyncChanges).toHaveLength(1);
    });

    test("uses the filter when it arrives during the grace period instead of the default (#6)", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [] });
        h.update({ rows: ROWS, filter: [3, 1] });
        h.clock.advance(FILTER_GRACE_MS * 2);

        expect(h.controller.order).toEqual(["Country", "Category"]);
        expect(h.applied).toEqual([]);
    });

    test("re-applies the persisted click order when no filter is present after the grace period", () => {
        const h = new Harness();
        h.update({ rows: ROWS, stateJson: stateJsonOf({ order: ["Country", "Brand"] }), filter: [] });
        h.clock.advance(FILTER_GRACE_MS);

        expect(h.lastApplied).toEqual([3, 0]);
    });

    test("persists changes made after the visual is ready (#6)", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [] });
        h.clock.advance(FILTER_GRACE_MS);
        h.controller.toggleExpanded(areaKey("Geo"));
        h.flushPersist();

        expect(h.writer.writes.length).toBeGreaterThan(0);
    });

    test("migrates the legacy orderJson/expandedJson properties", () => {
        const h = new Harness();
        h.update({
            rows: ROWS,
            legacy: { orderJson: JSON.stringify(["Store"]), expandedJson: JSON.stringify(["d:Geo"]) },
            filter: [2],
        });

        expect(h.controller.order).toEqual(["Store"]);
        expect(h.controller.isExpanded(areaKey("Geo"))).toBe(true);
    });
});

describe("empty and partial data (#1)", () => {
    test("an update without rows does not wipe the click order", () => {
        const h = readyWithSelection();

        h.update({ rows: [], filter: [] });
        h.update({ rows: ROWS, stateJson: stateJsonOf({ order: ["Store", "Brand"], applied: APPLIED_STORE_BRAND }), filter: [2, 0] });
        h.flushPersist();

        expect(h.controller.order).toEqual(["Store", "Brand"]);
        expect(h.applied).toEqual([]);
        expect(h.writer.writes).toEqual([]);
    });

    test("an update without rows does not trigger the required default selection", () => {
        const h = readyWithSelection();

        h.update({ rows: [], filter: [] });
        h.clock.advance(FILTER_GRACE_MS * 2);

        expect(h.applied).toEqual([]);
    });

    test("an empty first update does not consume the persisted state", () => {
        const h = new Harness();
        h.update({ rows: [], filter: [] });
        h.update({ rows: ROWS, stateJson: stateJsonOf({ order: ["Country", "Store"] }), filter: [] });
        h.clock.advance(FILTER_GRACE_MS);

        expect(h.controller.order).toEqual(["Country", "Store"]);
        expect(h.lastApplied).toEqual([3, 2]);
    });

    test("items hidden by a cross-filter keep their position and come back", () => {
        const h = readyWithSelection();
        const subset = ROWS.filter((row) => row.label !== "Store");

        h.update({ rows: subset, filter: [2, 0] });
        expect(h.controller.order).toEqual(["Brand"]);

        h.update({ rows: ROWS, filter: [2, 0] });
        expect(h.controller.order).toEqual(["Store", "Brand"]);
        expect(h.applied).toEqual([]);
    });
});

describe("persisted state reload (#2)", () => {
    test("a bookmark restores click order and expansion", () => {
        const h = readyWithSelection();
        const bookmark = stateJsonOf({
            order: ["Country", "Category"],
            expanded: [areaKey("Geo")],
            applied: [[3, "Country"], [1, "Category"]],
        });

        h.update({ rows: ROWS, stateJson: bookmark, filter: [3, 1] });

        expect(h.controller.order).toEqual(["Country", "Category"]);
        expect(h.controller.expandedKeys).toEqual([areaKey("Geo")]);
        expect(h.applied).toEqual([]);
    });

    test("a bookmark with the same members but another click order wins over the in-memory order", () => {
        const h = readyWithSelection();
        const bookmark = stateJsonOf({ order: ["Brand", "Store"], applied: [[0, "Brand"], [2, "Store"]] });

        h.update({ rows: ROWS, stateJson: bookmark, filter: [0, 2] });

        expect(h.controller.order).toEqual(["Brand", "Store"]);
    });

    test("the echo of our own persist is not treated as an external change", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");
        h.flushPersist();
        const written = h.writer.last as string;
        h.controller.toggle("Category");

        h.update({ rows: ROWS, stateJson: written, filter: [2, 0, 3] });

        expect(h.controller.order).toEqual(["Store", "Brand", "Country", "Category"]);
    });

    test("undo back to an older value we wrote is applied (#2)", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");
        h.flushPersist();
        const first = h.writer.last as string;
        h.update({ rows: ROWS, filter: [2, 0, 3] });
        h.controller.toggle("Category");
        h.flushPersist();
        h.update({ rows: ROWS, filter: [2, 0, 3, 1] });

        h.update({ rows: ROWS, stateJson: first, filter: [2, 0, 3] });

        expect(h.controller.order).toEqual(["Store", "Brand", "Country"]);
    });

    test("Reset to default without saved state restores the default selection", () => {
        const h = readyWithSelection();

        h.update({ rows: ROWS, stateJson: "", filter: [] });

        expect(h.controller.order).toEqual(["Brand"]);
        expect(h.lastApplied).toEqual([0]);
    });
});

describe("filter removed externally (#3)", () => {
    test("clears the selection when a selection is not required", () => {
        const h = readyWithSelection({ requireSelection: false });

        h.update({ rows: ROWS, stateJson: stateJsonOf({ order: ["Store", "Brand"], applied: APPLIED_STORE_BRAND }), filter: [], options: { requireSelection: false } });

        expect(h.controller.order).toEqual([]);
        expect(h.applied).toEqual([]);
    });

    test("re-applies the selection when a selection is required", () => {
        const h = readyWithSelection();

        h.update({ rows: ROWS, stateJson: stateJsonOf({ order: ["Store", "Brand"], applied: APPLIED_STORE_BRAND }), filter: [] });

        expect(h.controller.order).toEqual(["Store", "Brand"]);
        expect(h.lastApplied).toEqual([2, 0]);
    });

    test("ignores an empty filter on resize-only updates", () => {
        const h = readyWithSelection({ requireSelection: false });

        h.update({ rows: ROWS, filter: [], dataUpdate: false, options: { requireSelection: false } });

        expect(h.controller.order).toEqual(["Store", "Brand"]);
    });
});

describe("expansion (#4, #5)", () => {
    test("collapsing the group of a selected item stays collapsed after the persist echo", () => {
        const h = readyWithSelection();
        const key = groupKey("Geo", "Retail");
        expect(h.controller.isExpanded(key)).toBe(false);
        h.controller.toggleExpanded(key);
        h.controller.toggleExpanded(key);
        expect(h.controller.isExpanded(key)).toBe(false);

        h.controller.toggleExpanded(areaKey("Product"));
        h.flushPersist();
        h.update({ rows: ROWS, stateJson: h.writer.last, filter: [2, 0] });

        expect(h.controller.isExpanded(areaKey("Product"))).toBe(true);
        expect(h.controller.isExpanded(key)).toBe(false);
    });

    test("collapse all is not undone by later updates", () => {
        const h = readyWithSelection();
        h.controller.expandToLevel(0);
        h.flushPersist();

        h.update({ rows: ROWS, stateJson: h.writer.last, filter: [2, 0] });
        h.update({ rows: ROWS, stateJson: h.writer.last, filter: [2, 0], dataUpdate: false });

        expect(h.controller.expandedKeys).toEqual([]);
    });

    test("expands the path of an item selected from outside", () => {
        const h = readyWithSelection();

        h.update({ rows: ROWS, filter: [2, 0, 3] });

        expect(h.controller.isExpanded(groupKey("Geo", "Region"))).toBe(true);
    });

    test("expand fully on load seeds only visuals without saved state", () => {
        const fresh = new Harness();
        fresh.update({ rows: ROWS, filter: [2] });
        expect(fresh.controller.isExpanded(groupKey("Product", "Line"))).toBe(true);

        const saved = new Harness();
        saved.update({ rows: ROWS, stateJson: stateJsonOf({ order: ["Store"], expanded: [] }), filter: [2] });
        expect(saved.controller.expandedKeys).toEqual([]);
    });
});

describe("persistence (#8)", () => {
    test("scrolling alone never persists", () => {
        const h = readyWithSelection();

        h.controller.setScrollTop(120);
        h.flushPersist();

        expect(h.writer.writes).toEqual([]);
    });

    test("the scroll position is saved with the next real change", () => {
        const h = readyWithSelection();
        h.controller.setScrollTop(120);
        h.controller.toggleExpanded(areaKey("Geo"));
        h.flushPersist();

        expect(deserializeState(h.writer.last)?.state.scrollTop).toBe(120);
    });

    test("persists are debounced into one write", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");
        h.controller.move("Country", -1);
        h.flushPersist();

        expect(h.writer.writes).toHaveLength(1);
        expect(deserializeState(h.writer.last)?.state.order).toEqual(["Store", "Country", "Brand"]);
    });

    test("destroy does not persist before the visual is ready (#13)", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [] });

        h.controller.destroy();

        expect(h.writer.writes).toEqual([]);
    });

    test("destroy writes pending changes", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");

        h.controller.destroy();

        expect(h.writer.writes).toHaveLength(1);
    });
});

describe("identity indices (#9)", () => {
    test("uses the keys recorded at apply time when rows shift", () => {
        const h = readyWithSelection();
        const shifted = [{ label: "New field", domain: "Geo", group: "Retail" }, ...ROWS];

        h.update({ rows: shifted, filter: [2, 0] });

        expect(h.controller.order).toEqual(["Store", "Brand"]);
    });

    test("maps an unknown external filter through the current rows", () => {
        const h = readyWithSelection();

        h.update({ rows: ROWS, filter: [1] });

        expect(h.controller.order).toEqual(["Category"]);
    });
});

describe("echo handling (#10)", () => {
    test("an update still carrying the previous filter does not undo a click", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");

        h.update({ rows: ROWS, filter: [2, 0] });
        expect(h.controller.order).toEqual(["Store", "Brand", "Country"]);

        h.update({ rows: ROWS, filter: [2, 0, 3] });
        expect(h.controller.order).toEqual(["Store", "Brand", "Country"]);
    });

    test("the echo of the first of two quick clicks does not undo the second", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");
        h.controller.toggle("Category");

        h.update({ rows: ROWS, filter: [2, 0, 3] });

        expect(h.controller.order).toEqual(["Store", "Brand", "Country", "Category"]);
    });

    test("a late echo (> 3 s) of the first of two clicks does not undo the second", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");
        h.controller.toggle("Category");
        h.clock.advance(ECHO_TIMEOUT_MS + 1);

        h.update({ rows: ROWS, filter: [2, 0, 3] });
        h.update({ rows: ROWS, filter: [2, 0, 3, 1] });

        expect(h.controller.order).toEqual(["Store", "Brand", "Country", "Category"]);
        expect(h.applied).toHaveLength(2);
    });

    test("an unresolvable filter still counts as present, so a later clear is detected", () => {
        const h = readyWithSelection({ requireSelection: false });
        const options = { requireSelection: false };
        h.update({ rows: ROWS, filter: [], options });
        h.controller.toggle("Store");
        h.update({ rows: ROWS, filter: [2], options });

        h.update({ rows: ROWS, filter: [99], options });
        h.update({ rows: ROWS, filter: [], options });

        expect(h.controller.order).toEqual([]);
    });

    test("after the timeout an external filter equal to the previous one is honoured", () => {
        const h = readyWithSelection();
        h.controller.toggle("Country");
        h.clock.advance(ECHO_TIMEOUT_MS + 1);

        h.update({ rows: ROWS, filter: [2, 0] });

        expect(h.controller.order).toEqual(["Store", "Brand"]);
    });
});

describe("behaviour options (#13)", () => {
    test("require selection applies the default even when select-first-on-load is off", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [], options: { selectFirstOnLoad: false } });
        h.clock.advance(FILTER_GRACE_MS);

        expect(h.controller.order).toEqual(["Brand"]);
    });

    test("select first on load without require selection applies only at load", () => {
        const options = { requireSelection: false };
        const h = new Harness();
        h.update({ rows: ROWS, filter: [], options });
        h.clock.advance(FILTER_GRACE_MS);
        expect(h.controller.order).toEqual(["Brand"]);

        h.controller.clearAll();
        h.update({ rows: ROWS, filter: [], options });

        expect(h.controller.order).toEqual([]);
    });

    test("the default item is the lowest catalog order, not the first alphabetical item", () => {
        const h = new Harness();
        h.update({
            rows: [
                { label: "Zeta", domain: "Z", group: "Z", order: 1 },
                { label: "Alpha", domain: "A", group: "A", order: 5 },
            ],
            withOrder: true,
            filter: [],
        });
        h.clock.advance(FILTER_GRACE_MS);

        expect(h.controller.order).toEqual(["Zeta"]);
    });

    test("the last selected item cannot be removed when a selection is required", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [2] });

        h.controller.toggle("Store");

        expect(h.controller.order).toEqual(["Store"]);
    });

    test("respects the maximum number of selections", () => {
        const h = readyWithSelection({ maxSelections: 2 });

        h.controller.toggle("Country");

        expect(h.controller.order).toEqual(["Store", "Brand"]);
    });

    test("lowering the maximum trims the selection and re-applies the filter", () => {
        const h = readyWithSelection();

        h.update({ rows: ROWS, filter: [2, 0], options: { maxSelections: 1 } });

        expect(h.controller.order).toEqual(["Store"]);
        expect(h.lastApplied).toEqual([2]);
    });
});

describe("user actions", () => {
    test("toggle appends in click order and applies the filter in that order", () => {
        const h = readyWithSelection();

        h.controller.toggle("Country");

        expect(h.lastApplied).toEqual([2, 0, 3]);
    });

    test("move swaps with the neighbour", () => {
        const h = readyWithSelection();

        h.controller.move("Brand", -1);
        h.controller.move("Brand", -1);

        expect(h.controller.order).toEqual(["Brand", "Store"]);
        expect(h.applied).toHaveLength(1);
    });

    test("reset selects the default item", () => {
        const h = readyWithSelection();

        h.controller.clearAll();

        expect(h.controller.order).toEqual(["Brand"]);
        expect(h.lastApplied).toEqual([0]);
    });

    test("clear removes the filter when no selection is required", () => {
        const h = readyWithSelection({ requireSelection: false });

        h.controller.clearAll();

        expect(h.lastApplied).toEqual([]);
    });

    test("a click during the grace period makes the visual ready without applying the default", () => {
        const h = new Harness();
        h.update({ rows: ROWS, filter: [] });

        h.controller.toggle("Store");
        h.clock.advance(FILTER_GRACE_MS);

        expect(h.controller.phase).toBe("ready");
        expect(h.applied).toEqual([[2]]);
    });

    test("ignores unknown keys", () => {
        const h = readyWithSelection();

        h.controller.toggle("Missing");

        expect(h.applied).toEqual([]);
    });
});
