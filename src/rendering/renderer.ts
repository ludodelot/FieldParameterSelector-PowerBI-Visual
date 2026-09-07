import { CatalogTree, CatalogItem, OrderedEntry } from "../model/types";
import { VisualFormattingSettingsModel } from "../formatting/settings";
import { createVisualDom, VisualDomElements } from "./dom";
import { renderCatalog } from "./catalogRenderer";
import { renderSelectedPanel } from "./selectedPanelRenderer";
import { renderToolbar } from "./toolbarRenderer";
import { buildCssVariables, applyCssVariables } from "./cssVariables";

export interface RendererCallbacks {
    onItemActivate: (item: CatalogItem) => void;
    onToggleExpand: (key: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onRemoveSelection: (key: string) => void;
    onMoveUp: (key: string) => void;
    onMoveDown: (key: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onCatalogScroll: (scrollTop: number) => void;
}

export interface RenderContext {
    tree: CatalogTree;
    order: readonly OrderedEntry[];
    expandedKeys: ReadonlySet<string>;
    settings: VisualFormattingSettingsModel;
    /** Persisted scroll offset to restore. Only honored on the first render after construction (a fresh DOM, e.g. after report reopen) — later renders preserve whatever the user is currently looking at instead of fighting their live scroll position. */
    catalogScrollTop: number;
}

/**
 * Owns the visual's DOM and all pointer/keyboard interaction. Uses a small
 * number of delegated listeners (one per container) instead of per-row
 * listeners, and re-renders by fully replacing container contents each call
 * — simple and correct for the data volumes a Field Parameter catalog deals
 * with (rebuilding a few hundred rows is inexpensive).
 */
export class Renderer {
    private readonly dom: VisualDomElements;
    private readonly callbacks: RendererCallbacks;
    private currentTree: CatalogTree | undefined;
    private dragFromKey: string | undefined;
    private hasRenderedCatalogOnce = false;

    constructor(target: HTMLElement, callbacks: RendererCallbacks) {
        this.dom = createVisualDom(target);
        this.callbacks = callbacks;
        this.attachDelegatedListeners();
    }

    render(context: RenderContext): void {
        const { tree, order, expandedKeys, settings } = context;
        const visibility = settings.visibilityCard;
        this.currentTree = tree;

        // renderCatalog() below fully replaces catalogList's contents, which resets scrollTop to 0.
        // On the very first render of a fresh DOM (report reopen, page nav, resize-triggered remount)
        // we restore the persisted offset; on every later render we just preserve whatever the user
        // is currently looking at, so an in-progress scroll never gets yanked back by an unrelated re-render.
        const scrollRestoreTarget = this.hasRenderedCatalogOnce ? this.dom.catalogList.scrollTop : context.catalogScrollTop;

        applyCssVariables(this.dom.root, buildCssVariables(settings));

        this.dom.header.hidden = !visibility.showHeader.value;
        this.dom.instructions.hidden = !visibility.showInstructions.value;
        this.dom.catalogTitle.hidden = !visibility.showCatalogTitle.value;
        this.dom.selectedPanel.hidden = !visibility.showSelectedPanel.value;

        const hasData = tree.domains.length > 0;
        this.dom.emptyState.hidden = hasData;
        this.dom.body.hidden = !hasData;

        const showToolbar = hasData && settings.expansionCard.showToolbar.value;
        this.dom.toolbar.hidden = !showToolbar;

        if (!hasData) {
            this.dom.catalogList.textContent = "";
            this.dom.selectedPanelList.textContent = "";
            return;
        }

        if (showToolbar) {
            renderToolbar(this.dom.toolbar, settings);
        }

        const selectionOrderByKey = new Map<string, number>();
        order.forEach((entry, index) => selectionOrderByKey.set(entry.key, index + 1));

        renderCatalog(this.dom.catalogList, { tree, expandedKeys, selectionOrderByKey, settings });
        renderSelectedPanel(this.dom.selectedPanelList, { order, settings });

        this.dom.catalogList.scrollTop = scrollRestoreTarget;
        this.hasRenderedCatalogOnce = true;
    }

    announce(message: string): void {
        this.dom.liveRegion.textContent = message;
    }

    private findItem(key: string): CatalogItem | undefined {
        return this.currentTree?.itemsByKey.get(key);
    }

    private attachDelegatedListeners(): void {
        this.dom.catalogList.addEventListener("click", event => this.handleCatalogClick(event));
        this.dom.catalogList.addEventListener("keydown", event => this.handleCatalogKeydown(event));
        this.dom.catalogList.addEventListener("scroll", () => this.callbacks.onCatalogScroll(this.dom.catalogList.scrollTop), { passive: true });

        this.dom.toolbar.addEventListener("click", event => this.handleToolbarClick(event));

        this.dom.selectedPanelList.addEventListener("click", event => this.handlePanelClick(event));
        this.dom.selectedPanelList.addEventListener("dragstart", event => this.handleDragStart(event));
        this.dom.selectedPanelList.addEventListener("dragover", event => this.handleDragOver(event));
        this.dom.selectedPanelList.addEventListener("drop", event => this.handleDrop(event));
        this.dom.selectedPanelList.addEventListener("dragend", () => this.handleDragEnd());
    }

    private handleCatalogClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const row = target.closest<HTMLElement>("[data-key]");
        if (!row || !this.dom.catalogList.contains(row)) {
            return;
        }
        const key = row.dataset["key"];
        if (!key) {
            return;
        }
        this.activateCatalogRow(row, key);
    }

    private handleCatalogKeydown(event: KeyboardEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const row = target.closest<HTMLElement>("[data-key]");
        if (!row) {
            return;
        }
        const key = row.dataset["key"];
        if (!key) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.activateCatalogRow(row, key);
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            this.moveCatalogFocus(row, event.key === "ArrowDown" ? 1 : -1);
            return;
        }
        if (event.key === "ArrowRight" && row.dataset["role"] === "toggle" && row.getAttribute("aria-expanded") === "false") {
            event.preventDefault();
            this.callbacks.onToggleExpand(key);
            return;
        }
        if (event.key === "ArrowLeft" && row.dataset["role"] === "toggle" && row.getAttribute("aria-expanded") === "true") {
            event.preventDefault();
            this.callbacks.onToggleExpand(key);
        }
    }

    private activateCatalogRow(row: HTMLElement, key: string): void {
        if (row.dataset["role"] === "toggle") {
            this.callbacks.onToggleExpand(key);
            return;
        }
        if (row.dataset["role"] === "item") {
            const item = this.findItem(key);
            if (item) {
                this.callbacks.onItemActivate(item);
            }
        }
    }

    private moveCatalogFocus(current: HTMLElement, direction: 1 | -1): void {
        const rows = Array.from(this.dom.catalogList.querySelectorAll<HTMLElement>("[data-key]"));
        const index = rows.indexOf(current);
        if (index < 0) {
            return;
        }
        const next = rows[index + direction];
        if (next) {
            next.focus();
        }
    }

    private handleToolbarClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const button = target.closest<HTMLElement>("[data-action]");
        if (!button) {
            return;
        }
        const action = button.dataset["action"];
        if (action === "expand-all") {
            this.callbacks.onExpandAll();
        } else if (action === "collapse-all") {
            this.callbacks.onCollapseAll();
        }
    }

    private handlePanelClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const button = target.closest<HTMLElement>("[data-action]");
        if (!button) {
            return;
        }
        const key = button.dataset["key"];
        const action = button.dataset["action"];
        if (!key || !action) {
            return;
        }
        if (action === "move-up") {
            this.callbacks.onMoveUp(key);
        } else if (action === "move-down") {
            this.callbacks.onMoveDown(key);
        } else if (action === "remove") {
            this.callbacks.onRemoveSelection(key);
        }
    }

    // ---- pointer-based drag & drop reordering for the selected panel ----

    private handleDragStart(event: DragEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const row = target.closest<HTMLElement>("[data-role='selected-item']");
        if (!row) {
            return;
        }
        const key = row.dataset["key"];
        if (!key) {
            return;
        }
        this.dragFromKey = key;
        row.classList.add("is-dragging");
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", key);
        }
    }

    private handleDragOver(event: DragEvent): void {
        if (!this.dragFromKey) {
            return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }

    private handleDrop(event: DragEvent): void {
        event.preventDefault();
        const target = event.target;
        if (!(target instanceof Element) || !this.dragFromKey) {
            return;
        }
        const row = target.closest<HTMLElement>("[data-role='selected-item']");
        if (!row) {
            return;
        }
        const toKey = row.dataset["key"];
        const fromKey = this.dragFromKey;
        if (!toKey || toKey === fromKey) {
            return;
        }

        const rows = Array.from(this.dom.selectedPanelList.querySelectorAll<HTMLElement>("[data-role='selected-item']"));
        const fromIndex = rows.findIndex(r => r.dataset["key"] === fromKey);
        const toIndex = rows.findIndex(r => r.dataset["key"] === toKey);
        if (fromIndex >= 0 && toIndex >= 0) {
            this.callbacks.onReorder(fromIndex, toIndex);
        }
    }

    private handleDragEnd(): void {
        this.dragFromKey = undefined;
        const dragging = this.dom.selectedPanelList.querySelector(".is-dragging");
        if (dragging) {
            dragging.classList.remove("is-dragging");
        }
    }
}
