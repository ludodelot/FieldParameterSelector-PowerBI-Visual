import { CatalogTree, CatalogDomain, CatalogGroup, CatalogItem } from "../model/types";
import { VisualFormattingSettingsModel } from "../formatting/settings";

export interface CatalogRenderContext {
    tree: CatalogTree;
    expandedKeys: ReadonlySet<string>;
    selectionOrderByKey: ReadonlyMap<string, number>;
    settings: VisualFormattingSettingsModel;
}

function createExpandIcon(expanded: boolean): HTMLElement {
    const icon = document.createElement("span");
    icon.className = "ofps-expand-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = expanded ? "▾" : "▸"; // ▾ / ▸
    return icon;
}

function createHeaderRow(
    key: string,
    label: string,
    kind: "domain" | "group",
    expanded: boolean,
    paddingLeftPx: number,
    extra?: HTMLElement
): HTMLElement {
    const row = document.createElement("div");
    row.className = `ofps-node-header ofps-${kind}-header`;
    row.dataset["key"] = key;
    row.dataset["role"] = "toggle";
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-expanded", String(expanded));
    row.tabIndex = 0;
    row.style.paddingLeft = `${paddingLeftPx}px`;

    row.appendChild(createExpandIcon(expanded));

    const labelEl = document.createElement("span");
    labelEl.className = `ofps-${kind}-label`;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    if (extra) {
        row.appendChild(extra);
    }

    return row;
}

function createItemRow(
    item: CatalogItem,
    selected: boolean,
    position: number | undefined,
    paddingLeftPx: number,
    showPositionBadges: boolean
): HTMLElement {
    const row = document.createElement("div");
    row.className = "ofps-item-row" + (selected ? " is-selected" : "");
    row.dataset["key"] = item.key;
    row.dataset["role"] = "item";
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-selected", String(selected));
    row.tabIndex = 0;
    row.style.paddingLeft = `${paddingLeftPx}px`;

    if (selected && showPositionBadges && position !== undefined) {
        const badge = document.createElement("span");
        badge.className = "ofps-position-badge";
        badge.textContent = String(position);
        row.appendChild(badge);
    }

    const labelEl = document.createElement("span");
    labelEl.className = "ofps-item-label";
    labelEl.textContent = item.label;
    row.appendChild(labelEl);

    return row;
}

/** Renders the domain > group > item catalog tree into `container`. Fully replaces contents. */
export function renderCatalog(container: HTMLElement, context: CatalogRenderContext): void {
    container.textContent = "";

    const { tree, expandedKeys, selectionOrderByKey, settings } = context;
    const visibility = settings.visibilityCard;
    const spacing = settings.spacingCard;

    const basePad = spacing.horizontalPadding.value;
    const domainIndent = spacing.domainIndent.value;
    const itemIndent = spacing.itemIndent.value;

    const showDomainHeaders = tree.hasDomainRole && visibility.showAreas.value;
    const showGroupHeaders = tree.hasGroupRole && visibility.showGroups.value;

    if (tree.domains.length === 0) {
        return;
    }

    const fragment = document.createDocumentFragment();

    const renderItems = (items: readonly CatalogItem[], paddingLeftPx: number): void => {
        for (const item of items) {
            const position = selectionOrderByKey.get(item.key);
            const row = createItemRow(item, position !== undefined, position, paddingLeftPx, visibility.showPositionBadges.value);
            fragment.appendChild(row);
        }
    };

    const renderGroup = (group: CatalogGroup, domainShown: boolean): void => {
        const groupPad = basePad + (domainShown ? domainIndent : 0);
        const itemPad = groupPad + (showGroupHeaders && group.label !== undefined ? itemIndent : 0);

        if (showGroupHeaders && group.label !== undefined) {
            const expanded = expandedKeys.has(group.key);
            let counter: HTMLElement | undefined;
            if (visibility.showGroupCounts.value) {
                counter = document.createElement("span");
                counter.className = "ofps-group-count";
                counter.textContent = String(group.items.length);
            }
            const header = createHeaderRow(group.key, group.label, "group", expanded, groupPad, counter);
            fragment.appendChild(header);
            if (expanded) {
                renderItems(group.items, itemPad);
            }
        } else {
            renderItems(group.items, itemPad);
        }
    };

    for (const domain of tree.domains) {
        if (showDomainHeaders && domain.label !== undefined) {
            const expanded = expandedKeys.has(domain.key);
            const header = createHeaderRow(domain.key, domain.label, "domain", expanded, basePad);
            fragment.appendChild(header);
            if (expanded) {
                for (const group of domain.groups) {
                    renderGroup(group, true);
                }
            }
        } else {
            for (const group of domain.groups) {
                renderGroup(group, false);
            }
        }
    }

    container.appendChild(fragment);
}
