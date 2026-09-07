import powerbi from "powerbi-visuals-api";

/** A single leaf item in the catalog — one row of the fieldParameter role. */
export interface CatalogItem {
    key: string;
    label: string;
    domainKey: string;
    domainLabel: string | undefined;
    groupKey: string;
    groupLabel: string | undefined;
    catalogOrder: number | undefined;
    rowIndex: number;
    identity: powerbi.visuals.ISelectionId;
    value: powerbi.PrimitiveValue;
}

/** Second-level grouping node (optional `group` role). */
export interface CatalogGroup {
    key: string;
    label: string | undefined;
    items: CatalogItem[];
}

/** Top-level grouping node (optional `domain` role). */
export interface CatalogDomain {
    key: string;
    label: string | undefined;
    groups: CatalogGroup[];
}

/** Whole catalog tree built from the current categorical dataView. */
export interface CatalogTree {
    domains: CatalogDomain[];
    itemsByKey: Map<string, CatalogItem>;
    domainKeys: Set<string>;
    groupKeys: Set<string>;
    hasDomainRole: boolean;
    hasGroupRole: boolean;
    hasCatalogOrderRole: boolean;
}

/** One entry of the user's chronological / drag-reordered selection list. */
export interface OrderedEntry {
    key: string;
    label: string;
    value: powerbi.PrimitiveValue;
    selectedAt: number;
}

/**
 * Versioned shape of the state this visual persists. Split across the three
 * "state" object properties declared in capabilities.json:
 *  - stateJson: the envelope { version, timestamp } used as the change signature
 *  - orderJson: JSON-encoded OrderedEntry[]
 *  - expandedJson: JSON-encoded string[] of expanded domain/group keys
 */
export interface PersistedStateV1 {
    version: 1;
    timestamp: number;
    order: OrderedEntry[];
    expanded: string[];
}

export const STATE_SCHEMA_VERSION = 1 as const;

export type UpdateKind = "data" | "resize" | "formatting" | "viewMode" | "other";
