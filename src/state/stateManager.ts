import powerbi from "powerbi-visuals-api";
import { CatalogTree, CatalogItem, PersistedStateV1, OrderedEntry, STATE_SCHEMA_VERSION } from "../model/types";
import { OrderedSelectionModel } from "../model/orderedSelectionModel";
import { StateRepository } from "./stateRepository";
import { PersistScheduler } from "./persistScheduler";
import { RawStateProperties, deserializeState, serializeState, statesAreEqual, validateStateAgainstTree } from "./serialize";
import { stateLog } from "./stateLog";

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

/** ~250-500ms debounce window: collapses bursts of drag/expand/click into one persistProperties() call. */
const DEBOUNCE_MS = 350;

function emptyState(): PersistedStateV1 {
    return { version: STATE_SCHEMA_VERSION, timestamp: Date.now(), order: [], expanded: [] };
}

function collectValidNodeKeys(tree: CatalogTree): Set<string> {
    return new Set<string>([...tree.domainKeys, ...tree.groupKeys]);
}

/**
 * Canonical, single-source-of-truth runtime state container.
 *
 * `metadata.objects.state` (read via StateRepository) is treated purely as a
 * storage/serialization backend. This class — not the dataView — is what the
 * rest of the visual reads from and writes to. Reconstruction from persisted
 * properties only happens when there is genuinely no valid canonical state
 * yet, or when Power BI's metadata reflects a real external change (a fresh
 * signature that isn't just the echo of our own last write).
 */
export class StateManager {
    readonly orderedSelection = new OrderedSelectionModel();
    private expandedKeys = new Set<string>();

    private readonly repository: StateRepository;
    private readonly scheduler: PersistScheduler;

    /** Set by any user action; cleared once a debounced persist actually fires. */
    private stateDirty = false;

    /** True once the canonical in-memory state has been populated at least once. Not a "hasLoaded" one-shot gate — reloads can still happen later if metadata genuinely changes. */
    private hasValidCanonicalState = false;

    /** Signature of the raw persisted strings we last synced FROM. */
    private lastSyncedSignature: string | undefined;
    /** Signature of the raw persisted strings we last WROTE ourselves — lets us recognize the echo of our own write on the next update(). */
    private lastWrittenSignature: string | undefined;
    /** The last state object we actually wrote, for the "skip persist if nothing changed" comparison. */
    private lastWrittenState: PersistedStateV1 | undefined;

    constructor(host: IVisualHost) {
        this.repository = new StateRepository(host);
        this.scheduler = new PersistScheduler(DEBOUNCE_MS, () => this.firePersist());
    }

    // ---- read accessors ------------------------------------------------------------

    getOrder(): readonly OrderedEntry[] {
        return this.orderedSelection.getAll();
    }

    getExpandedKeys(): ReadonlySet<string> {
        return this.expandedKeys;
    }

    isExpanded(key: string): boolean {
        return this.expandedKeys.has(key);
    }

    isSelected(key: string): boolean {
        return this.orderedSelection.has(key);
    }

    // ---- main synchronization entry point (called once per update(), never persists) ----

    /**
     * update() should not persist. Flow: read data -> read persisted state
     * only if it actually changed -> validate -> apply -> render. This method
     * covers "read persisted state only if it actually changed -> validate ->
     * apply"; the caller (visual.ts) is responsible for the render step.
     */
    syncFromDataView(dataView: powerbi.DataView | undefined, tree: CatalogTree): void {
        const raw = this.repository.readRaw(dataView);
        const signature = this.repository.computeSignature(raw);

        stateLog("update received", { signature, lastSynced: this.lastSyncedSignature, lastWritten: this.lastWrittenSignature });

        if (this.hasValidCanonicalState) {
            if (this.lastWrittenSignature !== undefined && signature === this.lastWrittenSignature) {
                stateLog("state ignored: echo of our own persistProperties() write, canonical state stays authoritative");
                this.reconcileAgainstTree(tree);
                return;
            }
            if (this.lastSyncedSignature !== undefined && signature === this.lastSyncedSignature) {
                stateLog("state ignored: metadata unchanged since last sync");
                this.reconcileAgainstTree(tree);
                return;
            }
            stateLog("state restored: external metadata change detected (bookmark / filter / reopen), reloading canonical state");
        } else {
            stateLog("loading persisted state: no valid canonical state yet (first load)");
        }

        this.loadPersistedState(raw, tree);
        this.lastSyncedSignature = signature;
    }

    private loadPersistedState(raw: RawStateProperties, tree: CatalogTree): void {
        const deserialized = deserializeState(raw);
        const validated = this.validateState(deserialized, tree);
        this.applyState(validated);
        this.hasValidCanonicalState = true;
    }

    /** JSON must parse, arrays must be arrays, referenced keys must exist, no duplicates. On any corruption: log, ignore, rebuild clean. Never throws. */
    validateState(state: PersistedStateV1 | undefined, tree: CatalogTree): PersistedStateV1 {
        if (!state) {
            stateLog("validate: nothing persisted yet, starting from a clean state");
            return emptyState();
        }
        if (state.version !== STATE_SCHEMA_VERSION) {
            stateLog(`state ignored: unrecognized schema version ${state.version}, starting from a clean state`);
            return emptyState();
        }
        const validItemKeys = new Set(tree.itemsByKey.keys());
        const validNodeKeys = collectValidNodeKeys(tree);
        return validateStateAgainstTree(state, validItemKeys, validNodeKeys);
    }

    applyState(state: PersistedStateV1): void {
        this.orderedSelection.replace(state.order);
        this.expandedKeys = new Set(state.expanded);
        stateLog("state applied to canonical StateManager", { orderCount: state.order.length, expandedCount: state.expanded.length });
    }

    /** After a tree rebuild, drop selections/expansion referencing nodes that no longer exist. Preserves relative order of survivors. Marks dirty only if something actually changed. */
    reconcileAgainstTree(tree: CatalogTree): void {
        const validItemKeys = new Set(tree.itemsByKey.keys());
        const validNodeKeys = collectValidNodeKeys(tree);

        const orderChanged = this.orderedSelection.pruneToValidKeys(validItemKeys);

        const before = this.expandedKeys.size;
        this.expandedKeys = new Set([...this.expandedKeys].filter(k => validNodeKeys.has(k)));
        const expansionChanged = this.expandedKeys.size !== before;

        if (orderChanged || expansionChanged) {
            this.markDirty("reconciled against rebuilt tree (stale references dropped)");
        }
    }

    /** Expands the ancestor chain of every currently-selected item (expansion.expandSelectedPaths). */
    expandPathsToSelection(tree: CatalogTree): void {
        let changed = false;
        for (const entry of this.orderedSelection.getAll()) {
            const item = tree.itemsByKey.get(entry.key);
            if (!item) {
                continue;
            }
            if (!this.expandedKeys.has(item.domainKey)) {
                this.expandedKeys.add(item.domainKey);
                changed = true;
            }
            if (!this.expandedKeys.has(item.groupKey)) {
                this.expandedKeys.add(item.groupKey);
                changed = true;
            }
        }
        if (changed) {
            this.markDirty("expanded paths to current selection");
        }
    }

    hasAnyPersistedExpansion(): boolean {
        return this.expandedKeys.size > 0;
    }

    // ---- user actions: all flow through markDirty() -> schedulePersist() -----------

    selectItem(item: CatalogItem): boolean {
        const nowSelected = this.orderedSelection.toggle(item);
        this.markDirty(nowSelected ? `item selected: ${item.key}` : `item deselected: ${item.key}`);
        return nowSelected;
    }

    removeSelection(key: string): void {
        if (this.orderedSelection.remove(key)) {
            this.markDirty(`selection removed: ${key}`);
        }
    }

    reorderSelection(fromIndex: number, toIndex: number): void {
        if (this.orderedSelection.reorder(fromIndex, toIndex)) {
            this.markDirty(`selection reordered: ${fromIndex} -> ${toIndex}`);
        }
    }

    moveSelectionUp(key: string): void {
        if (this.orderedSelection.moveUp(key)) {
            this.markDirty(`selection moved up: ${key}`);
        }
    }

    moveSelectionDown(key: string): void {
        if (this.orderedSelection.moveDown(key)) {
            this.markDirty(`selection moved down: ${key}`);
        }
    }

    resetSelection(): void {
        if (this.orderedSelection.clear()) {
            this.markDirty("selection reset");
        }
    }

    setExpanded(key: string, expanded: boolean): void {
        const already = this.expandedKeys.has(key);
        if (already === expanded) {
            return;
        }
        if (expanded) {
            this.expandedKeys.add(key);
        } else {
            this.expandedKeys.delete(key);
        }
        this.markDirty(`expansion ${expanded ? "opened" : "closed"}: ${key}`);
    }

    toggleExpanded(key: string): void {
        this.setExpanded(key, !this.expandedKeys.has(key));
    }

    expandAll(nodeKeys: Iterable<string>): void {
        this.expandedKeys = new Set(nodeKeys);
        this.markDirty("expand all");
    }

    collapseAll(): void {
        if (this.expandedKeys.size === 0) {
            return;
        }
        this.expandedKeys = new Set();
        this.markDirty("collapse all");
    }

    // ---- dirty tracking / debounce ---------------------------------------------------

    markDirty(reason: string): void {
        this.stateDirty = true;
        stateLog(`markDirty: ${reason}`);
        this.schedulePersist();
    }

    schedulePersist(): void {
        this.scheduler.schedule();
    }

    private firePersist(): void {
        if (!this.stateDirty) {
            stateLog("persist skipped: debounce fired but state is not dirty");
            return;
        }
        this.persistState();
    }

    /** Compares against the last write and skips persistProperties() entirely if nothing meaningful changed. */
    persistState(): void {
        const candidate: PersistedStateV1 = {
            version: STATE_SCHEMA_VERSION,
            timestamp: Date.now(),
            order: [...this.orderedSelection.getAll()],
            expanded: [...this.expandedKeys]
        };

        if (statesAreEqual(this.lastWrittenState, candidate)) {
            stateLog("persist skipped: same state as last write");
            this.stateDirty = false;
            return;
        }

        const serialized = serializeState(candidate);
        this.repository.write(serialized);

        this.lastWrittenState = candidate;
        this.lastWrittenSignature = this.repository.computeSignature(serialized);
        this.lastSyncedSignature = this.lastWrittenSignature;
        this.stateDirty = false;

        stateLog("persist completed", { orderCount: candidate.order.length, expandedCount: candidate.expanded.length, timestamp: candidate.timestamp });
    }

    /** Called from visual destroy(): if a debounced persist is still pending, flush it immediately rather than losing the last action. */
    flushPendingPersist(): void {
        if (this.scheduler.isPending) {
            this.scheduler.cancel();
        }
        if (this.stateDirty) {
            stateLog("flushing pending persist on destroy");
            this.persistState();
        }
    }

    destroy(): void {
        this.scheduler.cancel();
    }
}
