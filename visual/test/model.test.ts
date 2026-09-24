import {
    areaKey, buildCatalog, defaultItem, EMPTY_CATALOG, expansionKeysToLevel, groupKey, migrateLegacyExpansionKeys,
} from "../src/model/catalog";
import { buildIdentityFilter, readIdentityTargets, resolveTargets, targetsSignature } from "../src/filter/identityFilter";
import { deserializeLegacy, deserializeState, emptyState, serializeState, statesEqual } from "../src/state/persistedState";
import { HostStateWriter, readPersisted } from "../src/state/stateRepository";
import { makeDataView, ROWS } from "./helpers";

import powerbi from "powerbi-visuals-api";

describe("buildCatalog", () => {
    test("returns an empty catalog without a Field Parameter column", () => {
        expect(buildCatalog(undefined)).toBe(EMPTY_CATALOG);
        expect(buildCatalog({ categorical: { categories: [] } } as unknown as powerbi.DataView)).toBe(EMPTY_CATALOG);
    });

    test("sorts areas and groups alphabetically when no catalog order is bound", () => {
        const catalog = buildCatalog(makeDataView({ rows: ROWS }));

        expect(catalog.items.map((item) => item.label)).toEqual(["Country", "Store", "Brand", "Category"]);
        expect(catalog.catalogOrderBound).toBe(false);
    });

    test("orders areas and groups by their smallest catalog order when it is bound (#13)", () => {
        const catalog = buildCatalog(makeDataView({
            withOrder: true,
            rows: [
                { label: "Brand", domain: "Product", group: "Line", order: 1 },
                { label: "Country", domain: "Geo", group: "Region", order: 3 },
                { label: "Store", domain: "Geo", group: "Retail", order: 2 },
            ],
        }));

        expect(catalog.items.map((item) => item.label)).toEqual(["Brand", "Store", "Country"]);
        expect(defaultItem(catalog)?.label).toBe("Brand");
    });

    test("keeps the same label in two areas as two items (#13)", () => {
        const catalog = buildCatalog(makeDataView({
            rows: [
                { label: "Name", domain: "Product", group: "Line" },
                { label: "Name", domain: "Customer", group: "Info" },
                { label: "Name", domain: "Customer", group: "Info" },
            ],
        }));

        expect(catalog.items).toHaveLength(2);
        expect(catalog.byKey.get("Name")?.domain).toBe("Product");
    });

    test("skips blank labels and uses default area and group names", () => {
        const dataView = {
            categorical: {
                categories: [{ source: { roles: { fieldParameter: true } }, values: ["  ", "Brand", null] }],
            },
        } as unknown as powerbi.DataView;

        const catalog = buildCatalog(dataView);

        expect(catalog.items).toEqual([expect.objectContaining({ label: "Brand", domain: "Uncategorized", group: "Other", identityIndex: 1 })]);
    });

    test("falls back to the row index for non-numeric catalog orders", () => {
        const dataView = makeDataView({ rows: [{ label: "A", order: Number.NaN }], withOrder: true });

        expect(buildCatalog(dataView).items[0].catalogOrder).toBe(0);
    });
});

describe("expansion keys (#13)", () => {
    test("do not collide when names contain a colon", () => {
        expect(groupKey("a:b", "c")).not.toBe(groupKey("a", "b:c"));
    });

    test("expand to level lists areas, then groups", () => {
        const catalog = buildCatalog(makeDataView({ rows: ROWS }));

        expect(expansionKeysToLevel(catalog, 0)).toEqual([]);
        expect(expansionKeysToLevel(catalog, 1)).toHaveLength(2);
        expect(expansionKeysToLevel(catalog, 2)).toHaveLength(5);
    });

    test("legacy keys migrate to the new format and unknown keys are kept", () => {
        const catalog = buildCatalog(makeDataView({ rows: ROWS }));

        expect(migrateLegacyExpansionKeys(["d:Geo", "g:Geo:Retail", "d:Gone"], catalog))
            .toEqual([areaKey("Geo"), groupKey("Geo", "Retail"), "d:Gone"]);
    });
});

describe("persisted state", () => {
    test("round-trips a v3 state", () => {
        const state = { ...emptyState(), order: ["A", "B"], expanded: ["x"], scrollTop: 40, applied: [[1, "A"], [0, "B"]] as const };

        const loaded = deserializeState(serializeState(state));

        expect(loaded?.legacyExpansionKeys).toBe(false);
        expect(statesEqual(loaded!.state, state)).toBe(true);
    });

    test("reads v2 state written by v2.3 - v2.7.1", () => {
        const v2 = JSON.stringify({ schemaVersion: 2, timestamp: 5, order: [], selected: ["A", "A", 3], expanded: ["d:X"], scrollTop: -1 });

        const loaded = deserializeState(v2);

        expect(loaded?.state.order).toEqual(["A"]);
        expect(loaded?.state.scrollTop).toBe(0);
        expect(loaded?.legacyExpansionKeys).toBe(true);
    });

    test("rejects missing, invalid and newer states", () => {
        expect(deserializeState(undefined)).toBeNull();
        expect(deserializeState("")).toBeNull();
        expect(deserializeState("{oops")).toBeNull();
        expect(deserializeState("[1]")).toBeNull();
        expect(deserializeState(JSON.stringify({ schemaVersion: 99 }))).toBeNull();
    });

    test("drops malformed applied entries", () => {
        const loaded = deserializeState(JSON.stringify({ schemaVersion: 3, applied: [[1, "A"], [1.5, "B"], ["x", "C"], [2]] }));

        expect(loaded?.state.applied).toEqual([[1, "A"]]);
    });

    test("reads the legacy orderJson / expandedJson properties", () => {
        const loaded = deserializeLegacy(JSON.stringify(["A"]), "not json");

        expect(loaded.state.order).toEqual(["A"]);
        expect(loaded.state.expanded).toEqual([]);
    });
});

describe("state repository", () => {
    test("distinguishes missing metadata, saved state, legacy state and no state", () => {
        expect(readPersisted(makeDataView({ rows: ROWS, noMetadata: true })).kind).toBe("unknown");
        expect(readPersisted(makeDataView({ rows: ROWS, stateJson: "{}" }))).toMatchObject({ kind: "value", signature: "{}" });
        expect(readPersisted(makeDataView({ rows: ROWS, legacy: { orderJson: "[\"A\"]" } }))).toMatchObject({ kind: "value", loaded: { state: { order: ["A"] } } });
        expect(readPersisted(makeDataView({ rows: ROWS }))).toEqual({ kind: "value", signature: "", loaded: null });
    });

    test("writes only stateJson (#11)", () => {
        const persistProperties = jest.fn();
        const writer = new HostStateWriter({ persistProperties } as unknown as powerbi.extensibility.visual.IVisualHost);

        const written = writer.write(emptyState());

        expect(persistProperties).toHaveBeenCalledWith({
            merge: [{ objectName: "state", selector: null, properties: { stateJson: written } }],
        });
    });
});

describe("identity filter", () => {
    test("reads targets, distinguishing no info from no filter", () => {
        expect(readIdentityTargets(undefined)).toBeUndefined();
        expect(readIdentityTargets([])).toEqual([]);
        expect(readIdentityTargets([buildIdentityFilter([3, 1]) as unknown as powerbi.IFilter])).toEqual([3, 1]);
        expect(readIdentityTargets([{ $schema: "x#identity", target: ["2", "a"] } as unknown as powerbi.IFilter])).toEqual([2]);
        expect(readIdentityTargets([{ filterType: 1, target: {} } as unknown as powerbi.IFilter])).toEqual([]);
    });

    test("signatures are unambiguous (#10)", () => {
        expect(targetsSignature([1, 23])).not.toBe(targetsSignature([12, 3]));
    });

    test("resolves recorded targets by key and unknown targets by current row", () => {
        const catalog = buildCatalog(makeDataView({ rows: ROWS }));

        expect(resolveTargets([2, 0], [[2, "X"], [0, "Y"]], catalog)).toEqual(["X", "Y"]);
        expect(resolveTargets([2, 9], [[2, "X"]], catalog)).toEqual(["Store"]);
    });
});
