import { AppliedTarget, emptyState, PersistedState, statesEqual } from "./persistedState";
import { StateWriter } from "./stateRepository";

export const PERSIST_DEBOUNCE_MS = 300;
const RECENT_WRITES_KEPT = 20;

export interface Clock {
    now(): number;
    setTimeout(callback: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}

export const systemClock: Clock = {
    now: () => Date.now(),
    setTimeout: (callback, ms) => setTimeout(callback, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * In-memory copy of the persisted state plus debounced persistence.
 * Every mutation replaces the state object; nothing is mutated in place.
 */
export class StateStore {
    private current: PersistedState = emptyState();
    private lastPersisted: PersistedState = emptyState();
    private dirty = false;
    private timer: unknown = null;
    private persistEnabled = false;
    private recentWrites: readonly string[] = [];

    constructor(private readonly writer: StateWriter, private readonly clock: Clock) {}

    get state(): PersistedState {
        return this.current;
    }

    /**
     * True when `signature` is the echo of one of our writes. Echoes arrive in write order, so the
     * acknowledged write and every older one are forgotten: if an older value shows up again later
     * (undo), it is an external change.
     */
    acknowledgeWrite(signature: string): boolean {
        const index = this.recentWrites.indexOf(signature);
        if (index < 0) {
            return false;
        }
        this.recentWrites = this.recentWrites.slice(index + 1);
        return true;
    }

    get isDirty(): boolean {
        return this.dirty;
    }

    /** Persistence stays off until the controller is ready, so load-time noise is never saved. */
    enablePersistence(): void {
        this.persistEnabled = true;
    }

    /** Replaces the state with one read from the host. Drops pending local changes. */
    load(state: PersistedState): void {
        this.cancelPending();
        this.dirty = false;
        this.current = state;
        this.lastPersisted = state;
    }

    setOrder(order: readonly string[]): void {
        this.update({ order: [...new Set(order)] });
    }

    setExpanded(expanded: readonly string[]): void {
        this.update({ expanded: [...new Set(expanded)] });
    }

    setApplied(applied: readonly AppliedTarget[]): void {
        this.update({ applied });
    }

    /** Scroll position is kept in memory and saved with the next real change, never on its own. */
    setScrollTop(scrollTop: number): void {
        this.current = { ...this.current, scrollTop: Math.max(0, Math.floor(scrollTop)) };
    }

    /** Writes pending changes immediately (used on destroy). */
    flush(): void {
        this.cancelPending();
        if (!this.dirty || !this.persistEnabled) {
            return;
        }
        this.dirty = false;
        if (statesEqual(this.current, this.lastPersisted)) {
            return;
        }
        const next = { ...this.current, timestamp: this.clock.now() };
        const written = this.writer.write(next);
        this.recentWrites = [...this.recentWrites, written].slice(-RECENT_WRITES_KEPT);
        this.current = next;
        this.lastPersisted = next;
    }

    cancelPending(): void {
        if (this.timer !== null) {
            this.clock.clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private update(patch: Partial<PersistedState>): void {
        const next = { ...this.current, ...patch };
        if (statesEqual(next, this.current)) {
            return;
        }
        this.current = next;
        if (!this.persistEnabled) {
            return;
        }
        this.dirty = true;
        this.cancelPending();
        this.timer = this.clock.setTimeout(() => {
            this.timer = null;
            this.flush();
        }, PERSIST_DEBOUNCE_MS);
    }
}
