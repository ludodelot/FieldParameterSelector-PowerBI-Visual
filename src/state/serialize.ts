import { PersistedStateV1, OrderedEntry, STATE_SCHEMA_VERSION } from "../model/types";
import { stateLog } from "./stateLog";

export interface RawStateProperties {
    stateJson: string | undefined;
    orderJson: string | undefined;
    expandedJson: string | undefined;
}

interface StateEnvelope {
    version: number;
    timestamp: number;
    /** Optional for backward compatibility with envelopes written before scroll-position tracking was added. */
    scrollTop?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidOrderedEntry(value: unknown): value is OrderedEntry {
    if (!isPlainObject(value)) {
        return false;
    }
    const key = value["key"];
    const label = value["label"];
    const selectedAt = value["selectedAt"];
    const entryValue = value["value"];
    return typeof key === "string" && key.length > 0
        && typeof label === "string"
        && typeof selectedAt === "number" && Number.isFinite(selectedAt)
        && (typeof entryValue === "string" || typeof entryValue === "number" || typeof entryValue === "boolean" || entryValue === null || entryValue === undefined);
}

/** Parses the small envelope object stored in `stateJson`. Never throws. */
export function parseEnvelope(json: string | undefined): StateEnvelope | undefined {
    if (!json) {
        return undefined;
    }
    try {
        const parsed: unknown = JSON.parse(json);
        if (!isPlainObject(parsed)) {
            return undefined;
        }
        const version = parsed["version"];
        const timestamp = parsed["timestamp"];
        const scrollTop = parsed["scrollTop"];
        if (typeof version !== "number" || typeof timestamp !== "number") {
            return undefined;
        }
        return { version, timestamp, scrollTop: typeof scrollTop === "number" && Number.isFinite(scrollTop) ? scrollTop : undefined };
    } catch (error) {
        stateLog("envelope (stateJson) parse failed, ignoring", error);
        return undefined;
    }
}

/** Parses the ordered-selection array stored in `orderJson`. Never throws, always returns an array. */
export function parseOrder(json: string | undefined): OrderedEntry[] {
    if (!json) {
        return [];
    }
    try {
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const valid = parsed.filter(isValidOrderedEntry);
        const seen = new Set<string>();
        const result: OrderedEntry[] = [];
        for (const entry of valid) {
            if (seen.has(entry.key)) {
                continue;
            }
            seen.add(entry.key);
            result.push({ key: entry.key, label: entry.label, value: entry.value, selectedAt: entry.selectedAt });
        }
        return result;
    } catch (error) {
        stateLog("order (orderJson) parse failed, ignoring", error);
        return [];
    }
}

/** Parses the expanded-node-keys array stored in `expandedJson`. Never throws, always returns an array. */
export function parseExpanded(json: string | undefined): string[] {
    if (!json) {
        return [];
    }
    try {
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return [...new Set(parsed.filter((v): v is string => typeof v === "string"))];
    } catch (error) {
        stateLog("expanded (expandedJson) parse failed, ignoring", error);
        return [];
    }
}

/**
 * Combines the three raw property strings into one PersistedStateV1. Returns
 * undefined only when there is nothing at all stored (fresh visual instance),
 * signalling to the caller that this is genuinely "no persisted state yet".
 */
export function deserializeState(raw: RawStateProperties): PersistedStateV1 | undefined {
    const envelope = parseEnvelope(raw.stateJson);
    const order = parseOrder(raw.orderJson);
    const expanded = parseExpanded(raw.expandedJson);

    if (!envelope && order.length === 0 && expanded.length === 0) {
        return undefined;
    }

    return {
        version: STATE_SCHEMA_VERSION,
        timestamp: envelope?.timestamp ?? 0,
        order,
        expanded,
        catalogScrollTop: envelope?.scrollTop ?? 0
    };
}

export function serializeState(state: PersistedStateV1): RawStateProperties {
    return {
        stateJson: JSON.stringify({ version: state.version, timestamp: state.timestamp, scrollTop: state.catalogScrollTop }),
        orderJson: JSON.stringify(state.order),
        expandedJson: JSON.stringify(state.expanded)
    };
}

/** Structural equality on the meaningful fields only (timestamp is metadata, not content). */
export function statesAreEqual(a: PersistedStateV1 | undefined, b: PersistedStateV1 | undefined): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (a.order.length !== b.order.length) {
        return false;
    }
    for (let i = 0; i < a.order.length; i += 1) {
        const ea = a.order[i];
        const eb = b.order[i];
        if (ea.key !== eb.key || ea.label !== eb.label || ea.value !== eb.value) {
            return false;
        }
    }
    const expA = [...a.expanded].sort();
    const expB = [...b.expanded].sort();
    if (expA.length !== expB.length) {
        return false;
    }
    for (let i = 0; i < expA.length; i += 1) {
        if (expA[i] !== expB[i]) {
            return false;
        }
    }
    return Math.round(a.catalogScrollTop) === Math.round(b.catalogScrollTop);
}

/**
 * Drops order/expanded entries whose key no longer exists in the current
 * tree. On corruption or staleness this is how we "rebuild a clean state" —
 * quietly, never throwing.
 */
export function validateStateAgainstTree(
    state: PersistedStateV1,
    validItemKeys: ReadonlySet<string>,
    validNodeKeys: ReadonlySet<string>
): PersistedStateV1 {
    const order = state.order.filter(e => validItemKeys.has(e.key));
    const expanded = state.expanded.filter(k => validNodeKeys.has(k));
    if (order.length !== state.order.length) {
        stateLog(`validate: dropped ${state.order.length - order.length} stale order entr${state.order.length - order.length === 1 ? "y" : "ies"}`);
    }
    if (expanded.length !== state.expanded.length) {
        stateLog(`validate: dropped ${state.expanded.length - expanded.length} stale expanded key(s)`);
    }
    const catalogScrollTop = Number.isFinite(state.catalogScrollTop) && state.catalogScrollTop >= 0 ? state.catalogScrollTop : 0;
    if (catalogScrollTop !== state.catalogScrollTop) {
        stateLog("validate: invalid catalogScrollTop, resetting to 0");
    }
    return { ...state, order, expanded, catalogScrollTop };
}
