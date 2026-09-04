import { stateLog } from "./stateLog";

export type PersistCallback = () => void;

/**
 * Debounces persistence so rapid consecutive user actions (drag, drag, drag,
 * drag) collapse into a single persistState() call, instead of firing
 * host.persistProperties() on every intermediate step.
 */
export class PersistScheduler {
    private timerId: ReturnType<typeof setTimeout> | undefined;

    constructor(private readonly debounceMs: number, private readonly onFire: PersistCallback) {}

    schedule(): void {
        this.cancel();
        stateLog(`debounce started (${this.debounceMs}ms)`);
        this.timerId = setTimeout(() => {
            this.timerId = undefined;
            this.onFire();
        }, this.debounceMs);
    }

    cancel(): void {
        if (this.timerId !== undefined) {
            clearTimeout(this.timerId);
            this.timerId = undefined;
            stateLog("debounce cancelled");
        }
    }

    get isPending(): boolean {
        return this.timerId !== undefined;
    }
}
