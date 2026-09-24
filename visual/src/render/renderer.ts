/*
 * DOM rendering. Markup and class names match the shipped v2.7.1.0 visual exactly, so the
 * stylesheet and the look are unchanged. Differences from v2.7.1.0:
 *   - the root and the scroll container are created once and reused, so re-renders keep the
 *     scroll position and never flash;
 *   - renders whose inputs did not change (echo updates after a persist) are skipped;
 *   - keyboard focus is restored after each render, arrow keys navigate the catalog, and
 *     buttons expose aria-pressed / aria-expanded.
 */
import { areaKey, CatalogItem, groupKey } from "../model/catalog";
import type { Strings } from "../strings";
import type { ViewSettings } from "../viewSettings";
import { cssVariables } from "./cssVariables";
import { handleCatalogKeydown } from "./keyboard";

export interface RenderActions {
    toggle(key: string): void;
    move(key: string, delta: number): void;
    clearAll(): void;
    toggleExpanded(key: string): void;
    expandToLevel(level: number): void;
    scroll(scrollTop: number): void;
}

/** What the renderer needs from the controller. */
export interface RenderSource {
    readonly items: readonly CatalogItem[];
    readonly order: readonly string[];
    readonly expandedKeys: readonly string[];
    readonly maxSelections: number;
    readonly requireSelection: boolean;
    readonly defaultKey: string | undefined;
    readonly scrollTop: number;
    isExpanded(key: string): boolean;
}

const LEVEL_AREA = "1";
const LEVEL_GROUP = "2";
const LEVEL_ITEM = "3";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function button(className: string, text: string, focusKey: string, onClick: () => void): HTMLButtonElement {
    const node = el("button", className, text);
    node.type = "button";
    node.dataset.focusKey = focusKey;
    node.onclick = (event) => {
        event.stopPropagation();
        onClick();
    };
    return node;
}

export class Renderer {
    private readonly root: HTMLDivElement = el("div", "root");
    private readonly scrollElement: HTMLDivElement = el("div", "catalog-scroll");
    private lastSignature: string | null = null;
    private settings: ViewSettings | null = null;
    private source: RenderSource | null = null;

    constructor(
        private readonly target: HTMLElement,
        private readonly actions: RenderActions,
        private readonly strings: Strings,
    ) {
        this.scrollElement.addEventListener("scroll", () => this.actions.scroll(this.scrollElement.scrollTop));
        this.root.addEventListener("keydown", (event) => handleCatalogKeydown(event, this.scrollElement, this.actions));
    }

    render(settings: ViewSettings, source: RenderSource): void {
        this.settings = settings;
        this.source = source;
        const signature = JSON.stringify([
            settings, source.items, source.order, source.expandedKeys, source.defaultKey,
            source.maxSelections, source.requireSelection,
        ]);
        if (signature === this.lastSignature && this.root.parentElement === this.target) {
            this.syncScroll(source);
            return;
        }
        this.lastSignature = signature;
        const focusKey = this.focusedKey();

        this.applyCssVariables(settings);
        const fixed = this.renderFixedRegion(settings, source);
        if (source.items.length === 0) {
            fixed.appendChild(el("div", "empty", this.strings.Visual_Empty));
            this.root.replaceChildren(fixed);
        } else {
            this.scrollElement.replaceChildren(this.renderCatalog(settings, source));
            this.root.replaceChildren(fixed, this.scrollElement);
        }
        if (this.root.parentElement !== this.target) {
            this.target.replaceChildren(this.root);
        }
        this.syncScroll(source);
        this.restoreFocus(focusKey);
    }

    /** Re-renders with the last inputs (after a user action changed the state). */
    refresh(): void {
        if (this.settings && this.source) {
            this.lastSignature = null;
            this.render(this.settings, this.source);
        }
    }

    renderError(error: unknown): void {
        this.lastSignature = null;
        this.target.replaceChildren(el("div", "error", error instanceof Error ? error.message : String(error)));
    }

    private syncScroll(source: RenderSource): void {
        if (this.scrollElement.isConnected && this.scrollElement.scrollTop !== source.scrollTop) {
            this.scrollElement.scrollTop = source.scrollTop;
        }
    }

    private focusedKey(): string | undefined {
        const active = this.target.ownerDocument.activeElement;
        return active instanceof HTMLElement && this.target.contains(active) ? active.dataset.focusKey : undefined;
    }

    private restoreFocus(focusKey: string | undefined): void {
        if (!focusKey) {
            return;
        }
        const match = Array.from(this.root.querySelectorAll<HTMLElement>("[data-focus-key]"))
            .find((node) => node.dataset.focusKey === focusKey);
        match?.focus({ preventScroll: true });
    }

    private applyCssVariables(settings: ViewSettings): void {
        cssVariables(settings).forEach(([name, value]) => this.root.style.setProperty(name, value));
        this.root.classList.toggle("always-scroll", settings.alwaysShowScrollbar);
    }

    // ---- fixed region -----------------------------------------------------------------------

    private renderFixedRegion(settings: ViewSettings, source: RenderSource): HTMLDivElement {
        const region = el("div", "fixed-region");
        if (settings.showHeader) {
            region.appendChild(this.renderHeader(source));
        }
        if (settings.showToolbar && (settings.showAreas || settings.showGroups)) {
            region.appendChild(this.renderToolbar(settings));
        }
        if (settings.showInstructions) {
            region.appendChild(el("div", "note", this.strings.Visual_Instructions));
        }
        if (source.items.length > 0 && settings.showSelectedPanel && source.order.length > 0) {
            region.appendChild(this.renderSelectedPanel(settings, source));
        }
        return region;
    }

    private renderHeader(source: RenderSource): HTMLDivElement {
        const header = el("div", "header");
        const title = el("div");
        title.append(el("strong", undefined, this.strings.Visual_Header_Title), el("span", undefined, `${source.order.length}/${source.maxSelections}`));
        const clear = button("clear", source.requireSelection ? this.strings.Visual_Reset : this.strings.Visual_Clear, "clear", () => this.actions.clearAll());
        clear.disabled = source.requireSelection
            ? source.order.length === 1 && source.order[0] === source.defaultKey
            : source.order.length === 0;
        header.append(title, clear);
        return header;
    }

    private renderToolbar(settings: ViewSettings): HTMLDivElement {
        const toolbar = el("div", settings.stickyToolbar ? "toolbar sticky" : "toolbar");
        const tools: ReadonlyArray<readonly [string, string, number]> = [
            ["−", this.strings.Visual_Toolbar_CollapseAll, 0],
            ["1", this.strings.Visual_Toolbar_ShowAreas, 1],
            ["2", this.strings.Visual_Toolbar_ShowAreasAndGroups, 2],
            ["+", this.strings.Visual_Toolbar_ExpandAll, 2],
        ];
        tools.forEach(([text, label, level], index) => {
            const tool = button("", text, `tool:${index}`, () => this.actions.expandToLevel(level));
            tool.title = label;
            tool.setAttribute("aria-label", label);
            toolbar.appendChild(tool);
        });
        return toolbar;
    }

    private renderSelectedPanel(settings: ViewSettings, source: RenderSource): HTMLElement {
        const panel = el("section", "selected-panel");
        panel.appendChild(el("div", "section-title", this.strings.Visual_SelectedPanel_Title));
        const labels = new Map(source.items.map((item) => [item.key, item.label]));
        const mustKeep = source.requireSelection && source.order.length === 1;

        source.order.forEach((key, index) => {
            const row = el("div", "selected-row");
            const actions = el("span", "actions");
            if (settings.showMoveButtons) {
                actions.append(
                    this.actionButton("↑", this.strings.Visual_MoveUp, `up:${key}`, index === 0, () => this.actions.move(key, -1)),
                    this.actionButton("↓", this.strings.Visual_MoveDown, `down:${key}`, index === source.order.length - 1, () => this.actions.move(key, 1)),
                );
            }
            const remove = this.actionButton("×", this.strings.Visual_Remove, `remove:${key}`, mustKeep, () => this.actions.toggle(key));
            if (mustKeep) {
                remove.title = this.strings.Visual_MustKeepOne;
            }
            actions.appendChild(remove);
            if (settings.showPositionBadges) {
                row.appendChild(el("span", "badge active", String(index + 1)));
            }
            row.append(el("span", "label", labels.get(key) ?? key), actions);
            panel.appendChild(row);
        });
        return panel;
    }

    private actionButton(text: string, label: string, focusKey: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
        const node = button("", text, focusKey, onClick);
        node.disabled = disabled;
        node.setAttribute("aria-label", label);
        return node;
    }

    // ---- catalog ----------------------------------------------------------------------------

    private renderCatalog(settings: ViewSettings, source: RenderSource): HTMLElement {
        const catalog = el("section", "catalog");
        if (settings.showCatalogTitle) {
            catalog.appendChild(el("div", "section-title", this.strings.Visual_Catalog_Title));
        }
        if (!settings.showAreas && !settings.showGroups) {
            source.items.forEach((item) => catalog.appendChild(this.renderItem(settings, source, item, false)));
            return catalog;
        }
        this.groupItems(source.items).forEach((groups, domain) => {
            const areaItems = [...groups.values()].flat();
            const key = areaKey(domain);
            if (settings.showAreas) {
                catalog.appendChild(this.renderGroupHeader(settings, source, domain, key, areaItems, false));
                if (!source.isExpanded(key)) {
                    return;
                }
            }
            if (!settings.showGroups) {
                areaItems.forEach((item) => catalog.appendChild(this.renderItem(settings, source, item, true)));
                return;
            }
            groups.forEach((items, group) => catalog.appendChild(this.renderGroup(settings, source, domain, group, items)));
        });
        return catalog;
    }

    private groupItems(items: readonly CatalogItem[]): Map<string, Map<string, CatalogItem[]>> {
        const domains = new Map<string, Map<string, CatalogItem[]>>();
        items.forEach((item) => {
            const groups = domains.get(item.domain) ?? new Map<string, CatalogItem[]>();
            groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
            domains.set(item.domain, groups);
        });
        return domains;
    }

    private renderGroup(settings: ViewSettings, source: RenderSource, domain: string, group: string, items: CatalogItem[]): HTMLDivElement {
        const key = groupKey(domain, group);
        const wrapper = el("div", settings.showAreas ? "group-wrapper" : "group-wrapper no-area");
        wrapper.appendChild(this.renderGroupHeader(settings, source, group, key, items, settings.showAreas));
        if (source.isExpanded(key)) {
            items.forEach((item) => wrapper.appendChild(this.renderItem(settings, source, item, true)));
        }
        return wrapper;
    }

    private renderGroupHeader(
        settings: ViewSettings, source: RenderSource, title: string, key: string, items: CatalogItem[], nested: boolean,
    ): HTMLButtonElement {
        const expanded = source.isExpanded(key);
        const header = button(nested ? "group-header nested group-level" : "group-header domain-level", "", `group:${key}`, () => this.actions.toggleExpanded(key));
        header.append(el("span", undefined, expanded ? "▾" : "▸"), el("span", undefined, title));
        if (settings.showGroupCounts) {
            const selected = items.filter((item) => source.order.includes(item.key)).length;
            header.appendChild(el("span", "group-count", `${selected}/${items.length}`));
        }
        header.setAttribute("aria-expanded", String(expanded));
        header.dataset.nav = "";
        header.dataset.expandKey = key;
        header.dataset.level = nested || !settings.showAreas ? LEVEL_GROUP : LEVEL_AREA;
        return header;
    }

    private renderItem(settings: ViewSettings, source: RenderSource, item: CatalogItem, nested: boolean): HTMLButtonElement {
        const position = source.order.indexOf(item.key);
        const selected = position >= 0;
        const row = button(`row${selected ? " selected" : ""}${nested ? " nested-item" : ""}`, "", `item:${item.key}`, () => this.actions.toggle(item.key));
        if (settings.showPositionBadges) {
            row.appendChild(el("span", selected ? "badge active" : "badge", selected ? String(position + 1) : ""));
        }
        row.appendChild(el("span", "label", item.label));
        if (selected && source.requireSelection && source.order.length === 1) {
            row.title = this.strings.Visual_MustKeepOne;
        }
        row.setAttribute("aria-pressed", String(selected));
        row.dataset.nav = "";
        row.dataset.level = LEVEL_ITEM;
        return row;
    }
}
