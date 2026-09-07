import powerbi from "powerbi-visuals-api";
import { CatalogTree, CatalogItem, CatalogDomain, CatalogGroup } from "./types";
import { buildDomainKey, buildGroupKey, buildItemKey } from "./keys";

type DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

function findCategoryColumn(categories: DataViewCategoryColumn[] | undefined, role: string): DataViewCategoryColumn | undefined {
    if (!categories) {
        return undefined;
    }
    return categories.find(c => !!(c.source.roles && c.source.roles[role]));
}

function toDisplayString(value: powerbi.PrimitiveValue | null | undefined): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    return String(value);
}

function toNumber(value: powerbi.PrimitiveValue | null | undefined): number | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
}

export function emptyCatalogTree(): CatalogTree {
    return {
        domains: [],
        itemsByKey: new Map(),
        domainKeys: new Set(),
        groupKeys: new Set(),
        hasDomainRole: false,
        hasGroupRole: false,
        hasCatalogOrderRole: false
    };
}

/**
 * Builds the domain > group > item catalog tree from the categorical
 * dataView. Any of domain/group/catalogOrder may be absent — the tree
 * degrades gracefully to fewer levels / data-order sorting.
 */
export function buildCatalogTree(
    dataView: powerbi.DataView | undefined,
    createSelectionIdBuilder: () => powerbi.visuals.ISelectionIdBuilder
): CatalogTree {
    const categorical = dataView && dataView.categorical;
    if (!categorical || !categorical.categories || categorical.categories.length === 0) {
        return emptyCatalogTree();
    }

    const fieldCol = findCategoryColumn(categorical.categories, "fieldParameter");
    if (!fieldCol) {
        return emptyCatalogTree();
    }
    const domainCol = findCategoryColumn(categorical.categories, "domain");
    const groupCol = findCategoryColumn(categorical.categories, "group");
    const orderCol = findCategoryColumn(categorical.categories, "catalogOrder");

    const domainMap = new Map<string, CatalogDomain>();
    const groupMap = new Map<string, CatalogGroup>();
    const itemsByKey = new Map<string, CatalogItem>();
    const domains: CatalogDomain[] = [];

    const rowCount = fieldCol.values.length;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const fieldValue = fieldCol.values[rowIndex];
        if (fieldValue === null || fieldValue === undefined) {
            continue;
        }
        const label = String(fieldValue);
        const domainLabel = domainCol ? toDisplayString(domainCol.values[rowIndex]) : undefined;
        const groupLabel = groupCol ? toDisplayString(groupCol.values[rowIndex]) : undefined;
        const catalogOrder = orderCol ? toNumber(orderCol.values[rowIndex]) : undefined;

        const domainKey = buildDomainKey(domainLabel);
        const groupKey = buildGroupKey(domainKey, groupLabel);

        let domain = domainMap.get(domainKey);
        if (!domain) {
            domain = { key: domainKey, label: domainLabel, groups: [] };
            domainMap.set(domainKey, domain);
            domains.push(domain);
        }

        let group = groupMap.get(groupKey);
        if (!group) {
            group = { key: groupKey, label: groupLabel, items: [] };
            groupMap.set(groupKey, group);
            domain.groups.push(group);
        }

        const identity = createSelectionIdBuilder().withCategory(fieldCol, rowIndex).createSelectionId();
        const itemKey = buildItemKey(groupKey, label, identity, rowIndex);

        const item: CatalogItem = {
            key: itemKey,
            label,
            domainKey,
            domainLabel,
            groupKey,
            groupLabel,
            catalogOrder,
            rowIndex,
            identity,
            value: fieldValue
        };
        group.items.push(item);
        itemsByKey.set(itemKey, item);
    }

    for (const domain of domains) {
        for (const group of domain.groups) {
            group.items.sort((a, b) => {
                if (a.catalogOrder !== undefined && b.catalogOrder !== undefined && a.catalogOrder !== b.catalogOrder) {
                    return a.catalogOrder - b.catalogOrder;
                }
                if (a.catalogOrder !== undefined && b.catalogOrder === undefined) {
                    return -1;
                }
                if (a.catalogOrder === undefined && b.catalogOrder !== undefined) {
                    return 1;
                }
                return a.rowIndex - b.rowIndex;
            });
        }
    }

    return {
        domains,
        itemsByKey,
        domainKeys: new Set(domainMap.keys()),
        groupKeys: new Set(groupMap.keys()),
        hasDomainRole: !!domainCol,
        hasGroupRole: !!groupCol,
        hasCatalogOrderRole: !!orderCol
    };
}
