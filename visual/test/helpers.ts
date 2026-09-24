import powerbi from "powerbi-visuals-api";

import { buildCatalog } from "../src/model/catalog";
import { ControllerOptions, DEFAULT_CONTROLLER_OPTIONS, SelectorController } from "../src/selectorController";
import { PersistedState, serializeState } from "../src/state/persistedState";
import { readPersisted, StateWriter } from "../src/state/stateRepository";
import { Clock, StateStore } from "../src/state/stateStore";

export interface Row {
    readonly label: string;
    readonly domain?: string;
    readonly group?: string;
    readonly order?: number;
}

export interface DataViewSpec {
    readonly rows: readonly Row[];
    readonly stateJson?: string;
    readonly legacy?: { orderJson?: string; expandedJson?: string };
    readonly withOrder?: boolean;
    readonly noMetadata?: boolean;
    readonly objects?: powerbi.DataViewObjects;
}

const column = (role: string, values: unknown[]): powerbi.DataViewCategoryColumn => ({
    source: { displayName: role, roles: { [role]: true } } as powerbi.DataViewMetadataColumn,
    values: values as powerbi.PrimitiveValue[],
});

export function makeDataView(spec: DataViewSpec): powerbi.DataView {
    const { rows } = spec;
    const categories = [
        column("fieldParameter", rows.map((r) => r.label)),
        column("domain", rows.map((r) => r.domain ?? "Area")),
        column("group", rows.map((r) => r.group ?? "Group")),
    ];
    if (spec.withOrder) {
        categories.push(column("catalogOrder", rows.map((r, i) => r.order ?? i)));
    }
    const state: Record<string, string> = {};
    if (spec.stateJson !== undefined) {
        state.stateJson = spec.stateJson;
    }
    if (spec.legacy?.orderJson !== undefined) {
        state.orderJson = spec.legacy.orderJson;
    }
    if (spec.legacy?.expandedJson !== undefined) {
        state.expandedJson = spec.legacy.expandedJson;
    }
    const objects: powerbi.DataViewObjects = { ...(spec.objects ?? {}) };
    if (Object.keys(state).length > 0) {
        objects.state = state;
    }
    return {
        metadata: spec.noMetadata ? undefined : { columns: [], objects },
        categorical: { categories },
    } as unknown as powerbi.DataView;
}

export class FakeClock implements Clock {
    private time = 1_000_000;
    private nextId = 1;
    private timers = new Map<number, { at: number; callback: () => void }>();

    now(): number {
        return this.time;
    }

    setTimeout(callback: () => void, ms: number): unknown {
        const id = this.nextId++;
        this.timers.set(id, { at: this.time + ms, callback });
        return id;
    }

    clearTimeout(handle: unknown): void {
        this.timers.delete(handle as number);
    }

    advance(ms: number): void {
        const until = this.time + ms;
        for (;;) {
            const due = [...this.timers.entries()]
                .filter(([, timer]) => timer.at <= until)
                .sort((a, b) => a[1].at - b[1].at)[0];
            if (!due) {
                break;
            }
            this.timers.delete(due[0]);
            this.time = due[1].at;
            due[1].callback();
        }
        this.time = until;
    }
}

export class RecordingWriter implements StateWriter {
    readonly writes: string[] = [];

    write(state: PersistedState): string {
        const json = serializeState(state);
        this.writes.push(json);
        return json;
    }

    get last(): string | undefined {
        return this.writes[this.writes.length - 1];
    }
}

export interface UpdateSpec extends DataViewSpec {
    /** Filter targets carried by the update; `undefined` = no filter info, `[]` = no filter. */
    readonly filter?: readonly number[];
    readonly options?: Partial<ControllerOptions>;
    readonly dataUpdate?: boolean;
}

/** Controller wired to fakes, plus helpers that mimic what the Power BI host sends back. */
export class Harness {
    readonly clock = new FakeClock();
    readonly writer = new RecordingWriter();
    readonly applied: (readonly number[])[] = [];
    readonly asyncChanges: number[] = [];
    readonly controller: SelectorController;
    /** What the host currently stores in `state.stateJson` (initial value or our last write). */
    private hostStateJson: string | undefined;
    private writesSeen = 0;

    constructor() {
        const store = new StateStore(this.writer, this.clock);
        this.controller = new SelectorController(
            store,
            { apply: (targets) => this.applied.push([...targets]) },
            this.clock,
            () => this.asyncChanges.push(this.clock.now()),
        );
    }

    /**
     * Sends an update like the host would: unless the spec sets `stateJson` explicitly (bookmark,
     * Reset to default: "" removes it), the update carries whatever the host currently stores.
     */
    update(spec: UpdateSpec): void {
        if (this.writer.writes.length > this.writesSeen) {
            this.writesSeen = this.writer.writes.length;
            this.hostStateJson = this.writer.last;
        }
        const stateJson = spec.stateJson ?? this.hostStateJson;
        this.hostStateJson = stateJson;
        const dataView = makeDataView({ ...spec, stateJson });
        this.controller.update({
            catalog: buildCatalog(dataView),
            options: { ...DEFAULT_CONTROLLER_OPTIONS, ...spec.options },
            persisted: readPersisted(dataView),
            filterTargets: spec.filter,
            isDataUpdate: spec.dataUpdate ?? true,
        });
    }

    get lastApplied(): readonly number[] | undefined {
        return this.applied[this.applied.length - 1];
    }

    /** Lets the debounced persist run. */
    flushPersist(): void {
        this.clock.advance(1000);
    }
}

export const ROWS: readonly Row[] = [
    { label: "Brand", domain: "Product", group: "Line" },
    { label: "Category", domain: "Product", group: "Line" },
    { label: "Store", domain: "Geo", group: "Retail" },
    { label: "Country", domain: "Geo", group: "Region" },
];

export const stateJsonOf = (state: Partial<PersistedState>): string =>
    serializeState({ schemaVersion: 3, timestamp: 1, order: [], expanded: [], scrollTop: 0, applied: [], ...state });
