import powerbi from "powerbi-visuals-api";

import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

export const UNCATEGORIZED_DOMAIN = "Uncategorized";
export const DEFAULT_GROUP = "Other";

export interface CatalogItem {
    readonly label: string;
    /** Persisted identity of the item. The label for unique labels (backwards compatible). */
    readonly key: string;
    /** Row index of the item in the current dataView, used as the identity-filter target. */
    readonly identityIndex: number;
    readonly domain: string;
    readonly group: string;
    readonly catalogOrder: number;
}

export interface Catalog {
    /** Items in display order. */
    readonly items: readonly CatalogItem[];
    readonly byKey: ReadonlyMap<string, CatalogItem>;
    readonly byIndex: ReadonlyMap<number, CatalogItem>;
    readonly catalogOrderBound: boolean;
}

export const EMPTY_CATALOG: Catalog = {
    items: [],
    byKey: new Map(),
    byIndex: new Map(),
    catalogOrderBound: false,
};

const KEY_SEPARATOR = "␟";
const EXPAND_SEPARATOR = "\u001F";

/** Expansion key of an area. The separator cannot be typed in a label, so keys never collide. */
export const areaKey = (domain: string): string => `d${EXPAND_SEPARATOR}${domain}`;
/** Expansion key of a group inside an area. */
export const groupKey = (domain: string, group: string): string =>
    `g${EXPAND_SEPARATOR}${domain}${EXPAND_SEPARATOR}${group}`;

/** Expansion keys used by v2.x (`d:<area>` / `g:<area>:<group>`), which collide when names contain ":". */
export const legacyAreaKey = (domain: string): string => `d:${domain}`;
export const legacyGroupKey = (domain: string, group: string): string => `g:${domain}:${group}`;

const findRole = (categories: readonly DataViewCategoryColumn[], role: string): DataViewCategoryColumn | undefined =>
    categories.find((column) => Boolean(column.source?.roles?.[role]));

function orderValue(raw: unknown, rowIndex: number): number {
    const value = typeof raw === "number" ? raw : Number(raw ?? rowIndex);
    return Number.isFinite(value) ? value : rowIndex;
}

export function buildCatalog(dataView: DataView | undefined): Catalog {
    const categories = dataView?.categorical?.categories ?? [];
    const labels = findRole(categories, "fieldParameter");
    if (!labels) {
        return EMPTY_CATALOG;
    }
    const domains = findRole(categories, "domain");
    const groups = findRole(categories, "group");
    const orders = findRole(categories, "catalogOrder");

    const items: CatalogItem[] = [];
    const byKey = new Map<string, CatalogItem>();

    labels.values.forEach((raw, rowIndex) => {
        const label = String(raw ?? "").trim();
        if (!label) {
            return;
        }
        const domain = String(domains?.values[rowIndex] ?? UNCATEGORIZED_DOMAIN);
        const group = String(groups?.values[rowIndex] ?? DEFAULT_GROUP);
        // The first occurrence of a label keeps the plain label as key, so orders persisted by
        // v2.x keep working. The same label in another area/group is a different field parameter
        // row and gets a qualified key instead of being dropped.
        const key = byKey.has(label) ? [label, domain, group].join(KEY_SEPARATOR) : label;
        if (byKey.has(key)) {
            return;
        }
        const item: CatalogItem = {
            label,
            key,
            identityIndex: rowIndex,
            domain,
            group,
            catalogOrder: orderValue(orders?.values[rowIndex], rowIndex),
        };
        items.push(item);
        byKey.set(key, item);
    });

    const catalogOrderBound = orders !== undefined;
    const sorted = sortItems(items, catalogOrderBound);
    return {
        items: sorted,
        byKey,
        byIndex: new Map(sorted.map((item) => [item.identityIndex, item])),
        catalogOrderBound,
    };
}

/**
 * Areas and groups are alphabetical unless a Catalog order column is bound, in which case
 * they follow the smallest catalog order of their items. Items follow catalog order.
 */
function sortItems(items: readonly CatalogItem[], catalogOrderBound: boolean): CatalogItem[] {
    const areaRank = new Map<string, number>();
    const groupRank = new Map<string, number>();
    if (catalogOrderBound) {
        items.forEach((item) => {
            const gk = groupKey(item.domain, item.group);
            areaRank.set(item.domain, Math.min(areaRank.get(item.domain) ?? Infinity, item.catalogOrder));
            groupRank.set(gk, Math.min(groupRank.get(gk) ?? Infinity, item.catalogOrder));
        });
    }
    const rank = (map: Map<string, number>, key: string): number => map.get(key) ?? 0;

    return [...items].sort((a, b) =>
        rank(areaRank, a.domain) - rank(areaRank, b.domain)
        || a.domain.localeCompare(b.domain)
        || rank(groupRank, groupKey(a.domain, a.group)) - rank(groupRank, groupKey(b.domain, b.group))
        || a.group.localeCompare(b.group)
        || a.catalogOrder - b.catalogOrder
        || a.label.localeCompare(b.label));
}

/**
 * The item used for "select first on load", "require selection" and Reset: the lowest
 * catalog order (the Field Parameter's own order when no Catalog order column is bound).
 */
export function defaultItem(catalog: Catalog): CatalogItem | undefined {
    return catalog.items.reduce<CatalogItem | undefined>((best, item) => {
        if (!best) {
            return item;
        }
        const diff = item.catalogOrder - best.catalogOrder || item.identityIndex - best.identityIndex;
        return diff < 0 ? item : best;
    }, undefined);
}

/** Area and group expansion keys that lead to an item. */
export const pathKeys = (item: CatalogItem): string[] => [areaKey(item.domain), groupKey(item.domain, item.group)];

/** Every area and group expansion key down to `level` (1 = areas, 2 = areas and groups). */
export function expansionKeysToLevel(catalog: Catalog, level: number): string[] {
    const keys = new Set<string>();
    catalog.items.forEach((item) => {
        if (level >= 1) {
            keys.add(areaKey(item.domain));
        }
        if (level >= 2) {
            keys.add(groupKey(item.domain, item.group));
        }
    });
    return [...keys];
}

/** Maps v2.x expansion keys to the current format. Unknown keys are kept unchanged. */
export function migrateLegacyExpansionKeys(keys: readonly string[], catalog: Catalog): string[] {
    const mapping = new Map<string, string[]>();
    const add = (legacy: string, current: string) => {
        const targets = mapping.get(legacy) ?? [];
        if (!targets.includes(current)) {
            mapping.set(legacy, [...targets, current]);
        }
    };
    catalog.items.forEach((item) => {
        add(legacyAreaKey(item.domain), areaKey(item.domain));
        add(legacyGroupKey(item.domain, item.group), groupKey(item.domain, item.group));
    });
    return [...new Set(keys.flatMap((key) => mapping.get(key) ?? [key]))];
}
