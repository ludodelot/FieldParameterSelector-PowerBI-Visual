/*
 * Persisted state format and (de)serialization.
 *
 * Version history:
 *   1  legacy `orderJson` / `expandedJson` properties (v2.2 and earlier)
 *   2  `stateJson` written by v2.3 - v2.7.1 (expansion keys `d:<area>` / `g:<area>:<group>`)
 *   3  v3.2: collision-free expansion keys + `applied` (identity index -> key of the last applied filter)
 */

export const SCHEMA_VERSION = 3;

/** One entry of the last filter this visual applied: [identity index, item key]. */
export type AppliedTarget = readonly [number, string];

export interface PersistedState {
    readonly schemaVersion: number;
    readonly timestamp: number;
    /** Click order of item keys. May contain keys absent from the current dataView. */
    readonly order: readonly string[];
    readonly expanded: readonly string[];
    readonly scrollTop: number;
    readonly applied: readonly AppliedTarget[];
}

export const emptyState = (): PersistedState => ({
    schemaVersion: SCHEMA_VERSION,
    timestamp: 0,
    order: [],
    expanded: [],
    scrollTop: 0,
    applied: [],
});

export interface LoadedState {
    readonly state: PersistedState;
    /** True when the expansion keys still use the v2 format and must be migrated against the catalog. */
    readonly legacyExpansionKeys: boolean;
}

const uniqueStrings = (value: unknown): string[] =>
    Array.isArray(value) ? [...new Set(value.filter((entry): entry is string => typeof entry === "string"))] : [];

const nonNegative = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

function appliedTargets(value: unknown): AppliedTarget[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((entry): entry is [number, string] =>
        Array.isArray(entry)
        && entry.length === 2
        && Number.isInteger(entry[0])
        && typeof entry[1] === "string");
}

function parseJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/** Parses a `stateJson` value. Returns null when it is missing, unparsable or from a newer schema. */
export function deserializeState(raw: unknown): LoadedState | null {
    if (typeof raw !== "string" || raw.length === 0) {
        return null;
    }
    const parsed = parseJson(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return null;
    }
    const data = parsed as Record<string, unknown>;
    const version = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;
    if (version > SCHEMA_VERSION) {
        return null;
    }
    const order = uniqueStrings(data.order);
    // v2 kept a redundant `selected` copy of `order`; fall back to it when `order` is empty.
    const selected = uniqueStrings(data.selected);
    return {
        state: {
            schemaVersion: SCHEMA_VERSION,
            timestamp: nonNegative(data.timestamp),
            order: order.length > 0 ? order : selected,
            expanded: uniqueStrings(data.expanded),
            scrollTop: nonNegative(data.scrollTop),
            applied: version >= 3 ? appliedTargets(data.applied) : [],
        },
        legacyExpansionKeys: version < 3,
    };
}

/** Parses the v1 `orderJson` / `expandedJson` properties. */
export function deserializeLegacy(orderJson: unknown, expandedJson: unknown): LoadedState {
    const asArray = (raw: unknown) => (typeof raw === "string" && raw.length > 0 ? uniqueStrings(parseJson(raw)) : []);
    return {
        state: { ...emptyState(), order: asArray(orderJson), expanded: asArray(expandedJson) },
        legacyExpansionKeys: true,
    };
}

export function serializeState(state: PersistedState): string {
    return JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        timestamp: state.timestamp,
        order: state.order,
        expanded: state.expanded,
        scrollTop: state.scrollTop,
        applied: state.applied,
    });
}

const sameArray = <T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean = (x, y) => x === y): boolean =>
    a.length === b.length && a.every((value, index) => eq(value, b[index]));

/** Content equality, ignoring the timestamp. */
export function statesEqual(a: PersistedState, b: PersistedState): boolean {
    return sameArray(a.order, b.order)
        && sameArray(a.expanded, b.expanded)
        && a.scrollTop === b.scrollTop
        && sameArray(a.applied, b.applied, (x, y) => x[0] === y[0] && x[1] === y[1]);
}
