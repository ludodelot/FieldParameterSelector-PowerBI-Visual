/*
 * Selection / expansion / persistence logic, independent of the DOM and of the Power BI host
 * object so it can be driven by tests with simulated update sequences.
 *
 * Sources of truth:
 *   - the host filter decides which items are selected whenever it is present;
 *   - the persisted state (`stateJson`) holds the click order, expansion and scroll position,
 *     and is re-read whenever the host hands us a value we did not write (bookmark, Reset to
 *     default, undo);
 *   - the in-memory state wins only for changes the user just made (until their echo arrives).
 */
import {
    Catalog, defaultItem, EMPTY_CATALOG, expansionKeysToLevel, migrateLegacyExpansionKeys, pathKeys,
} from "./model/catalog";
import { resolveTargets, targetsSignature } from "./filter/identityFilter";
import { emptyState } from "./state/persistedState";
import { PersistedSnapshot } from "./state/stateRepository";
import { Clock, StateStore } from "./state/stateStore";

export type Phase = "waitingData" | "restoring" | "ready";

/** How long to wait for the host filter on load before restoring from the persisted state. */
export const FILTER_GRACE_MS = 500;
/** How long an update still carrying the pre-apply (host) filter is treated as stale. */
export const ECHO_TIMEOUT_MS = 3000;
/** Safety cap for ignoring late echoes of our own earlier applies (their echo can be slow). */
export const OWN_ECHO_TIMEOUT_MS = 30000;
const EXPAND_ALL_LEVEL = 2;

export interface ControllerOptions {
    readonly maxSelections: number;
    readonly requireSelection: boolean;
    readonly selectFirstOnLoad: boolean;
    readonly expandSelectedPaths: boolean;
    readonly expandAllOnLoad: boolean;
}

export const DEFAULT_CONTROLLER_OPTIONS: ControllerOptions = {
    maxSelections: 30,
    requireSelection: true,
    selectFirstOnLoad: true,
    expandSelectedPaths: true,
    expandAllOnLoad: true,
};

export interface UpdateInput {
    readonly catalog: Catalog;
    readonly options: ControllerOptions;
    readonly persisted: PersistedSnapshot;
    /** Targets of the visual's identity filter; `undefined` when the update carries no filter info. */
    readonly filterTargets: readonly number[] | undefined;
    /** False for resize/style-only updates. */
    readonly isDataUpdate: boolean;
}

export interface FilterPort {
    /** Applies the identity filter; an empty list removes it. */
    apply(targets: readonly number[]): void;
}

type FilterOutcome = "unknown" | "stale" | "echo" | "none" | "cleared" | "filter";

interface PendingApply {
    /** Signature of the latest filter we applied: its echo confirms the apply. */
    readonly signature: string;
    /** Our earlier applies whose echo may still arrive before the latest one. */
    readonly ownSuperseded: readonly string[];
    /** The host filter before our first pending apply; an external filter may legitimately equal it. */
    readonly previousHost: string;
    readonly at: number;
}

export class SelectorController {
    private catalog: Catalog = EMPTY_CATALOG;
    private options: ControllerOptions = DEFAULT_CONTROLLER_OPTIONS;
    private currentPhase: Phase = "waitingData";
    private lastSeenPersisted: string | undefined;
    private lastHostSignature: string | undefined;
    private pendingApply: PendingApply | null = null;
    private hostHasFilter = false;
    private graceTimer: unknown = null;

    constructor(
        private readonly store: StateStore,
        private readonly filter: FilterPort,
        private readonly clock: Clock,
        /** Called after a change that did not come from `update()` or a user action (grace timer). */
        private readonly onAsyncChange: () => void = () => undefined,
    ) {}

    // ---- read model -------------------------------------------------------------------------

    get phase(): Phase {
        return this.currentPhase;
    }

    get items(): Catalog["items"] {
        return this.catalog.items;
    }

    /** Selected keys present in the current data, in click order. */
    get order(): string[] {
        return this.store.state.order.filter((key) => this.catalog.byKey.has(key));
    }

    get maxSelections(): number {
        return this.options.maxSelections;
    }

    get requireSelection(): boolean {
        return this.options.requireSelection;
    }

    get defaultKey(): string | undefined {
        return defaultItem(this.catalog)?.key;
    }

    get scrollTop(): number {
        return this.store.state.scrollTop;
    }

    get expandedKeys(): readonly string[] {
        return this.store.state.expanded;
    }

    isExpanded(key: string): boolean {
        return this.store.state.expanded.includes(key);
    }

    // ---- host updates -----------------------------------------------------------------------

    update(input: UpdateInput): void {
        this.catalog = input.catalog;
        this.options = input.options;
        // Updates without rows (refresh in flight, query pending) must not touch the state.
        if (this.catalog.items.length === 0) {
            return;
        }
        const reloaded = this.syncPersisted(input.persisted);
        const before = new Set(this.order);
        const outcome = this.syncFilter(input.filterTargets);

        if (this.currentPhase !== "ready") {
            this.progressLoad(outcome);
        } else {
            this.handleReadyUpdate(outcome, reloaded, input.isDataUpdate);
        }
        if (this.currentPhase === "ready" && this.capOrder()) {
            this.applyFilter();
        }
        this.revealAdded(before);
    }

    destroy(): void {
        this.clearGraceTimer();
        this.store.flush();
    }

    // ---- user actions -----------------------------------------------------------------------

    toggle(key: string): void {
        if (!this.catalog.byKey.has(key)) {
            return;
        }
        this.readyForUserAction();
        const current = this.order;
        if (current.includes(key)) {
            if (this.options.requireSelection && current.length === 1) {
                return;
            }
            this.store.setOrder(this.store.state.order.filter((k) => k !== key));
        } else {
            if (current.length >= this.options.maxSelections) {
                return;
            }
            this.store.setOrder([...this.store.state.order, key]);
            this.reveal([key]);
        }
        this.applyFilter();
    }

    move(key: string, delta: number): void {
        const current = this.order;
        const from = current.indexOf(key);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= current.length) {
            return;
        }
        this.readyForUserAction();
        const other = current[to];
        this.store.setOrder(this.store.state.order.map((k) => {
            if (k === key) {
                return other;
            }
            return k === other ? key : k;
        }));
        this.applyFilter();
    }

    /** "Reset" (require selection) or "Clear". */
    clearAll(): void {
        this.readyForUserAction();
        if (this.options.requireSelection) {
            const item = defaultItem(this.catalog);
            if (!item) {
                return;
            }
            this.store.setOrder([item.key]);
            this.reveal([item.key]);
        } else {
            this.store.setOrder([]);
        }
        this.applyFilter();
    }

    toggleExpanded(key: string): void {
        this.readyForUserAction();
        const expanded = this.store.state.expanded;
        this.store.setExpanded(expanded.includes(key) ? expanded.filter((k) => k !== key) : [...expanded, key]);
    }

    expandToLevel(level: number): void {
        this.readyForUserAction();
        this.store.setExpanded(expansionKeysToLevel(this.catalog, level));
    }

    setScrollTop(scrollTop: number): void {
        this.store.setScrollTop(scrollTop);
    }

    // ---- persisted state --------------------------------------------------------------------

    /** Loads the persisted state on first sight and whenever it changes externally. */
    private syncPersisted(snapshot: PersistedSnapshot): boolean {
        if (snapshot.kind === "unknown") {
            return false;
        }
        const firstLoad = this.lastSeenPersisted === undefined;
        if (!firstLoad && snapshot.signature === this.lastSeenPersisted) {
            return false;
        }
        this.lastSeenPersisted = snapshot.signature;
        if (!firstLoad && this.store.acknowledgeWrite(snapshot.signature)) {
            return false;
        }
        this.loadSnapshot(snapshot);
        return !firstLoad;
    }

    private loadSnapshot(snapshot: Extract<PersistedSnapshot, { kind: "value" }>): void {
        const loaded = snapshot.loaded;
        const base = loaded?.state ?? emptyState();
        let expanded = loaded?.legacyExpansionKeys
            ? migrateLegacyExpansionKeys(base.expanded, this.catalog)
            : base.expanded;
        // "Expand fully on load" only seeds visuals that have no saved expansion yet.
        if (!loaded && this.options.expandAllOnLoad) {
            expanded = expansionKeysToLevel(this.catalog, EXPAND_ALL_LEVEL);
        }
        this.store.load({ ...base, expanded });
    }

    // ---- host filter ------------------------------------------------------------------------

    private syncFilter(targets: readonly number[] | undefined): FilterOutcome {
        if (targets === undefined) {
            return "unknown";
        }
        const signature = targetsSignature(targets);
        const previousHost = this.lastHostSignature;
        this.lastHostSignature = signature;

        if (this.pendingApply) {
            const pending = this.pendingApply;
            if (signature === pending.signature) {
                this.pendingApply = null;
                this.hostHasFilter = targets.length > 0;
                return "echo";
            }
            const age = this.clock.now() - pending.at;
            const isStale = (pending.ownSuperseded.includes(signature) && age < OWN_ECHO_TIMEOUT_MS)
                || (signature === pending.previousHost && age < ECHO_TIMEOUT_MS);
            if (isStale) {
                // Update produced before our latest filter reached the host: ignore it.
                this.lastHostSignature = previousHost;
                return "stale";
            }
            this.pendingApply = null;
        }

        if (targets.length === 0) {
            const hadFilter = this.hostHasFilter;
            this.hostHasFilter = false;
            return hadFilter ? "cleared" : "none";
        }
        this.hostHasFilter = true;
        const keys = resolveTargets(targets, this.store.state.applied, this.catalog);
        if (keys.length === 0) {
            return "unknown";
        }
        this.reconcile(keys);
        return "filter";
    }

    /**
     * Makes the selection match the filter membership: members keep their click order, new
     * members are appended in filter order. Keys absent from the current data are left alone.
     */
    private reconcile(members: readonly string[]): void {
        const memberSet = new Set(members);
        const kept = this.store.state.order.filter((key) => !this.catalog.byKey.has(key) || memberSet.has(key));
        const keptSet = new Set(kept);
        this.store.setOrder([...kept, ...members.filter((key) => !keptSet.has(key))]);
    }

    private applyFilter(): void {
        const keys = this.order;
        const targets = keys.map((key) => this.catalog.byKey.get(key)?.identityIndex ?? -1);
        this.store.setApplied(keys.map((key, i) => [targets[i], key] as const));
        const pending = this.pendingApply;
        this.pendingApply = {
            signature: targetsSignature(targets),
            ownSuperseded: pending ? [...pending.ownSuperseded, pending.signature] : [],
            previousHost: pending ? pending.previousHost : this.lastHostSignature ?? targetsSignature([]),
            at: this.clock.now(),
        };
        this.hostHasFilter = targets.length > 0;
        this.filter.apply(targets);
    }

    // ---- lifecycle --------------------------------------------------------------------------

    private progressLoad(outcome: FilterOutcome): void {
        if (outcome === "filter" || outcome === "echo") {
            this.becomeReady();
            return;
        }
        // No filter yet: it may still be on its way. Give the host a short grace period, then
        // restore from the persisted state (or apply the default selection).
        this.currentPhase = "restoring";
        if (this.graceTimer === null) {
            this.graceTimer = this.clock.setTimeout(() => {
                this.graceTimer = null;
                if (this.finalizeLoad()) {
                    this.onAsyncChange();
                }
            }, FILTER_GRACE_MS);
        }
    }

    private finalizeLoad(): boolean {
        if (this.currentPhase === "ready" || this.catalog.items.length === 0) {
            return false;
        }
        const before = new Set(this.order);
        this.becomeReady();
        this.capOrder();
        if (this.order.length > 0) {
            this.applyFilter();
        } else {
            this.ensureDefaultSelection(true);
        }
        this.revealAdded(before);
        return true;
    }

    private handleReadyUpdate(outcome: FilterOutcome, reloaded: boolean, isDataUpdate: boolean): void {
        if (outcome === "stale") {
            return;
        }
        if (outcome === "cleared") {
            if (!isDataUpdate) {
                this.hostHasFilter = true;
                return;
            }
            this.handleExternalClear();
            return;
        }
        if (reloaded && outcome !== "filter" && outcome !== "echo" && this.order.length > 0) {
            // A bookmark / reset restored a selection without a matching filter: apply it.
            this.applyFilter();
            return;
        }
        this.ensureDefaultSelection(false);
    }

    /**
     * Our filter was removed from outside (Reset to default, Clear all slicers, bookmark, filter
     * pane). With "require selection" the selection is re-applied; otherwise it is cleared so the
     * UI matches the unfiltered report.
     */
    private handleExternalClear(): void {
        if (this.options.requireSelection) {
            if (this.order.length > 0) {
                this.applyFilter();
            } else {
                this.ensureDefaultSelection(false);
            }
            return;
        }
        this.store.setOrder(this.store.state.order.filter((key) => !this.catalog.byKey.has(key)));
        this.store.setApplied([]);
    }

    private ensureDefaultSelection(atLoad: boolean): void {
        if (this.order.length > 0) {
            return;
        }
        const wanted = this.options.requireSelection || (atLoad && this.options.selectFirstOnLoad);
        const item = wanted ? defaultItem(this.catalog) : undefined;
        if (!item) {
            return;
        }
        this.store.setOrder([...this.store.state.order, item.key]);
        this.applyFilter();
    }

    private becomeReady(): void {
        this.clearGraceTimer();
        this.currentPhase = "ready";
        this.store.enablePersistence();
    }

    private readyForUserAction(): void {
        if (this.currentPhase !== "ready") {
            this.becomeReady();
        }
    }

    private clearGraceTimer(): void {
        if (this.graceTimer !== null) {
            this.clock.clearTimeout(this.graceTimer);
            this.graceTimer = null;
        }
    }

    /** Drops selections beyond `maxSelections`. Returns true when something was removed. */
    private capOrder(): boolean {
        const current = this.order;
        if (current.length <= this.options.maxSelections) {
            return false;
        }
        const allowed = new Set(current.slice(0, this.options.maxSelections));
        this.store.setOrder(this.store.state.order.filter((key) => !this.catalog.byKey.has(key) || allowed.has(key)));
        return true;
    }

    // ---- expansion --------------------------------------------------------------------------

    /** Expands the path of items that became selected (never re-expands on unrelated updates). */
    private revealAdded(before: ReadonlySet<string>): void {
        this.reveal(this.order.filter((key) => !before.has(key)));
    }

    private reveal(keys: readonly string[]): void {
        if (!this.options.expandSelectedPaths || keys.length === 0) {
            return;
        }
        const paths = keys.flatMap((key) => {
            const item = this.catalog.byKey.get(key);
            return item ? pathKeys(item) : [];
        });
        const expanded = this.store.state.expanded;
        const missing = paths.filter((key) => !expanded.includes(key));
        if (missing.length > 0) {
            this.store.setExpanded([...expanded, ...missing]);
        }
    }
}
