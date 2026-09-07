import { serializeState, deserializeState, statesAreEqual, validateStateAgainstTree } from "../src/state/serialize";
import { PersistedStateV1 } from "../src/model/types";

function makeState(overrides: Partial<PersistedStateV1> = {}): PersistedStateV1 {
    return {
        version: 1,
        timestamp: 1000,
        order: [{ key: "k1", label: "Item 1", value: "Item 1", selectedAt: 1000 }],
        expanded: ["d:Domain"],
        catalogScrollTop: 0,
        ...overrides
    };
}

describe("state serialize/deserialize", () => {
    it("round-trips a valid state", () => {
        const state = makeState();
        const raw = serializeState(state);
        const restored = deserializeState(raw);
        expect(restored).toBeDefined();
        expect(restored?.order).toEqual(state.order);
        expect(restored?.expanded).toEqual(state.expanded);
    });

    it("returns undefined for completely empty raw properties", () => {
        const restored = deserializeState({ stateJson: undefined, orderJson: undefined, expandedJson: undefined });
        expect(restored).toBeUndefined();
    });

    it("never throws and ignores corrupted JSON", () => {
        const restored = deserializeState({ stateJson: "{not json", orderJson: "[[[", expandedJson: "not-an-array" });
        expect(restored).toBeUndefined();
    });

    it("drops malformed order entries instead of throwing", () => {
        const raw = { stateJson: JSON.stringify({ version: 1, timestamp: 1 }), orderJson: JSON.stringify([{ key: "ok", label: "Ok", value: "Ok", selectedAt: 1 }, { bad: true }]), expandedJson: "[]" };
        const restored = deserializeState(raw);
        expect(restored?.order).toHaveLength(1);
        expect(restored?.order[0]?.key).toBe("ok");
    });

    it("de-duplicates order entries with the same key", () => {
        const entry = { key: "dup", label: "Dup", value: "Dup", selectedAt: 1 };
        const raw = { stateJson: undefined, orderJson: JSON.stringify([entry, entry]), expandedJson: undefined };
        const restored = deserializeState(raw);
        expect(restored?.order).toHaveLength(1);
    });

    it("round-trips a non-zero catalogScrollTop", () => {
        const state = makeState({ catalogScrollTop: 240 });
        const raw = serializeState(state);
        const restored = deserializeState(raw);
        expect(restored?.catalogScrollTop).toBe(240);
    });

    it("defaults catalogScrollTop to 0 when the envelope predates scroll tracking", () => {
        const raw = { stateJson: JSON.stringify({ version: 1, timestamp: 1 }), orderJson: "[]", expandedJson: "[]" };
        const restored = deserializeState(raw);
        expect(restored?.catalogScrollTop).toBe(0);
    });
});

describe("statesAreEqual", () => {
    it("treats identical content as equal regardless of timestamp", () => {
        const a = makeState({ timestamp: 1 });
        const b = makeState({ timestamp: 999999 });
        expect(statesAreEqual(a, b)).toBe(true);
    });

    it("detects order changes", () => {
        const a = makeState();
        const b = makeState({ order: [] });
        expect(statesAreEqual(a, b)).toBe(false);
    });

    it("detects expansion changes ignoring array order", () => {
        const a = makeState({ expanded: ["x", "y"] });
        const b = makeState({ expanded: ["y", "x"] });
        expect(statesAreEqual(a, b)).toBe(true);
    });

    it("detects catalogScrollTop changes", () => {
        const a = makeState({ catalogScrollTop: 0 });
        const b = makeState({ catalogScrollTop: 120 });
        expect(statesAreEqual(a, b)).toBe(false);
    });
});

describe("validateStateAgainstTree", () => {
    it("drops references to keys no longer present in the tree", () => {
        const state = makeState({
            order: [
                { key: "valid", label: "Valid", value: "Valid", selectedAt: 1 },
                { key: "stale", label: "Stale", value: "Stale", selectedAt: 2 }
            ],
            expanded: ["valid-node", "stale-node"]
        });
        const validated = validateStateAgainstTree(state, new Set(["valid"]), new Set(["valid-node"]));
        expect(validated.order.map(e => e.key)).toEqual(["valid"]);
        expect(validated.expanded).toEqual(["valid-node"]);
    });
});
