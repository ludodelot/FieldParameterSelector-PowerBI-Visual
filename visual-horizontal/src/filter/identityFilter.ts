import powerbi from "powerbi-visuals-api";

import type { Catalog } from "../model/catalog";
import type { AppliedTarget } from "../state/persistedState";

import IFilter = powerbi.IFilter;

export const IDENTITY_FILTER_SCHEMA = "https://powerbi.com/product/schema#identity";
const IDENTITY_FILTER_TYPE = 8;

export interface IdentityFilterJson {
    readonly $schema: string;
    readonly filterType: number;
    readonly operator: "In";
    readonly target: readonly number[];
}

/**
 * Identity filter whose targets are dataView row indices. Field parameters show fields in the
 * order of the filter targets, which is what makes the click order drive the matrix order.
 */
export const buildIdentityFilter = (targets: readonly number[]): IdentityFilterJson => ({
    $schema: IDENTITY_FILTER_SCHEMA,
    filterType: IDENTITY_FILTER_TYPE,
    operator: "In",
    target: targets,
});

const isIdentityFilter = (filter: unknown): filter is { target: unknown } => {
    if (typeof filter !== "object" || filter === null) {
        return false;
    }
    const candidate = filter as { filterType?: unknown; $schema?: unknown };
    return candidate.filterType === IDENTITY_FILTER_TYPE
        || String(candidate.$schema ?? "").toLowerCase().endsWith("#identity");
};

/**
 * Identity targets of the visual's own filter.
 * `undefined`: the update carries no filter information. `[]`: no filter is applied.
 */
export function readIdentityTargets(jsonFilters: IFilter[] | undefined): number[] | undefined {
    if (!Array.isArray(jsonFilters)) {
        return undefined;
    }
    const filter = jsonFilters.find(isIdentityFilter);
    if (!filter || !Array.isArray(filter.target)) {
        return [];
    }
    return filter.target.map(Number).filter(Number.isInteger);
}

/** Unambiguous signature of a target list, used for echo detection. */
export const targetsSignature = (targets: readonly number[]): string => JSON.stringify(targets);

/**
 * Maps filter targets back to item keys.
 * Row indices move when the Field Parameter table changes (rows added/removed, cross-filtering),
 * so when the targets are exactly the ones this visual last applied, the keys recorded at apply
 * time are trusted instead of whatever row now sits at those indices.
 */
export function resolveTargets(
    targets: readonly number[],
    applied: readonly AppliedTarget[],
    catalog: Catalog,
): string[] {
    const recorded = new Map(applied);
    const matchesRecorded = targets.length === applied.length && targets.every((index) => recorded.has(index));
    const keys = targets.map((index) =>
        matchesRecorded ? recorded.get(index) : catalog.byIndex.get(index)?.key);
    return [...new Set(keys.filter((key): key is string => typeof key === "string"))];
}
