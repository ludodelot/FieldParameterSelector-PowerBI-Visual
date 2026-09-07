"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

import { VisualFormattingSettingsModel } from "./formatting/settings";
import { CatalogTree, CatalogItem } from "./model/types";
import { buildCatalogTree, emptyCatalogTree } from "./model/treeBuilder";
import { StateManager } from "./state/stateManager";
import { Renderer, RendererCallbacks } from "./rendering/renderer";
import { stateLog } from "./state/stateLog";

function allExpandableKeys(tree: CatalogTree): string[] {
    return [...tree.domainKeys, ...tree.groupKeys];
}

export class Visual implements IVisual {
    private readonly host: IVisualHost;
    private readonly events: IVisualEventService;
    private readonly selectionManager: ISelectionManager;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly stateManager: StateManager;
    private readonly renderer: Renderer;

    private formattingSettings: VisualFormattingSettingsModel;
    private tree: CatalogTree = emptyCatalogTree();

    private appliedSelectFirstOnLoad = false;
    private appliedExpandAllOnLoad = false;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.formattingSettings = new VisualFormattingSettingsModel();
        this.stateManager = new StateManager(this.host);

        const callbacks: RendererCallbacks = {
            onItemActivate: item => this.handleItemActivate(item),
            onToggleExpand: key => this.handleToggleExpand(key),
            onExpandAll: () => this.handleExpandAll(),
            onCollapseAll: () => this.handleCollapseAll(),
            onRemoveSelection: key => this.handleRemoveSelection(key),
            onMoveUp: key => this.handleMoveUp(key),
            onMoveDown: key => this.handleMoveDown(key),
            onReorder: (fromIndex, toIndex) => this.handleReorder(fromIndex, toIndex)
        };
        this.renderer = new Renderer(options.element, callbacks);
    }

    /**
     * update() never persists. Flow: read data -> build tree -> read
     * persisted state only if it actually changed -> validate -> apply ->
     * sync selectionManager -> render. Any persistProperties() call only ever
     * happens later, from PersistScheduler's debounced timer callback.
     */
    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dataView = options.dataViews && options.dataViews[0];
            stateLog("visual update() invoked", { type: options.type });

            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

            this.tree = buildCatalogTree(dataView, () => this.host.createSelectionIdBuilder());

            this.stateManager.syncFromDataView(dataView, this.tree);

            this.applyLoadTimeBehaviors();

            if (this.formattingSettings.expansionCard.expandSelectedPaths.value) {
                this.stateManager.expandPathsToSelection(this.tree);
            }

            this.applySelectionToHost();
            this.rerender();

            this.events.renderingFinished(options);
        } catch (error) {
            console.log("[STATE] update() failed", error);
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        this.stateManager.flushPendingPersist();
        this.stateManager.destroy();
    }

    // ---- one-shot load-time behaviors (behavior.selectFirstOnLoad, expansion.expandAllOnLoad) ----

    private applyLoadTimeBehaviors(): void {
        if (this.tree.domains.length === 0) {
            return;
        }

        if (!this.appliedSelectFirstOnLoad) {
            this.appliedSelectFirstOnLoad = true;
            if (this.formattingSettings.behaviorCard.selectFirstOnLoad.value && this.stateManager.getOrder().length === 0) {
                const first = this.firstCatalogItem();
                if (first) {
                    this.stateManager.selectItem(first);
                }
            }
        }

        if (!this.appliedExpandAllOnLoad) {
            this.appliedExpandAllOnLoad = true;
            if (this.formattingSettings.expansionCard.expandAllOnLoad.value && !this.stateManager.hasAnyPersistedExpansion()) {
                this.stateManager.expandAll(allExpandableKeys(this.tree));
            }
        }
    }

    private firstCatalogItem(): CatalogItem | undefined {
        for (const domain of this.tree.domains) {
            for (const group of domain.groups) {
                const first = group.items[0];
                if (first) {
                    return first;
                }
            }
        }
        return undefined;
    }

    // ---- Field Parameter selection wiring ----

    /**
     * The ordered selection list is the single source of truth for which
     * categories are selected, and in what order. `general.filter` is an
     * auto-managed property (capabilities.json: objects.general.properties
     * .filter, type filter:true) — Power BI's runtime keeps it in sync with
     * ISelectionManager automatically, so no manual applyJsonFilter call or
     * formatting card is needed for it.
     */
    private applySelectionToHost(): void {
        const ids: ISelectionId[] = [];
        for (const entry of this.stateManager.getOrder()) {
            const item = this.tree.itemsByKey.get(entry.key);
            if (item) {
                ids.push(item.identity);
            }
        }
        if (ids.length === 0) {
            void this.selectionManager.clear();
        } else {
            void this.selectionManager.select(ids, false);
        }
    }

    // ---- renderer callbacks: every user action flows through StateManager.markDirty() ----

    private handleItemActivate(item: CatalogItem): void {
        const currentlySelected = this.stateManager.isSelected(item.key);
        const behavior = this.formattingSettings.behaviorCard;

        if (!currentlySelected) {
            const max = behavior.maxSelections.value;
            if (max > 0 && this.stateManager.getOrder().length >= max) {
                this.renderer.announce(`Maximum of ${max} selections reached.`);
                return;
            }
        } else if (behavior.requireSelection.value && this.stateManager.getOrder().length <= 1) {
            this.renderer.announce("At least one selection is required.");
            return;
        }

        const nowSelected = this.stateManager.selectItem(item);
        this.renderer.announce(nowSelected ? `${item.label} added to selection.` : `${item.label} removed from selection.`);
        this.applySelectionToHost();
        this.rerender();
    }

    private handleRemoveSelection(key: string): void {
        const behavior = this.formattingSettings.behaviorCard;
        if (behavior.requireSelection.value && this.stateManager.getOrder().length <= 1) {
            this.renderer.announce("At least one selection is required.");
            return;
        }
        this.stateManager.removeSelection(key);
        this.applySelectionToHost();
        this.rerender();
    }

    private handleMoveUp(key: string): void {
        this.stateManager.moveSelectionUp(key);
        this.applySelectionToHost();
        this.rerender();
    }

    private handleMoveDown(key: string): void {
        this.stateManager.moveSelectionDown(key);
        this.applySelectionToHost();
        this.rerender();
    }

    private handleReorder(fromIndex: number, toIndex: number): void {
        this.stateManager.reorderSelection(fromIndex, toIndex);
        this.applySelectionToHost();
        this.rerender();
    }

    private handleToggleExpand(key: string): void {
        this.stateManager.toggleExpanded(key);
        this.rerender();
    }

    private handleExpandAll(): void {
        this.stateManager.expandAll(allExpandableKeys(this.tree));
        this.rerender();
    }

    private handleCollapseAll(): void {
        this.stateManager.collapseAll();
        this.rerender();
    }

    private rerender(): void {
        this.renderer.render({
            tree: this.tree,
            order: this.stateManager.getOrder(),
            expandedKeys: this.stateManager.getExpandedKeys(),
            settings: this.formattingSettings
        });
    }
}
