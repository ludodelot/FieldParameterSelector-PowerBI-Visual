import powerbi from "powerbi-visuals-api";

import { deserializeLegacy, deserializeState, LoadedState, PersistedState, serializeState } from "./persistedState";

import DataView = powerbi.DataView;

export const STATE_OBJECT = "state";
export const STATE_JSON = "stateJson";
const LEGACY_ORDER_JSON = "orderJson";
const LEGACY_EXPANDED_JSON = "expandedJson";

/**
 * What the host currently holds in the `state` object.
 * `signature` identifies the raw persisted value, so the controller can tell a new external
 * value (bookmark, Reset to default, undo) apart from an echo of its own write.
 */
export type PersistedSnapshot =
    | { readonly kind: "unknown" }
    | { readonly kind: "value"; readonly signature: string; readonly loaded: LoadedState | null };

export function readPersisted(dataView: DataView | undefined): PersistedSnapshot {
    const metadata = dataView?.metadata;
    if (!metadata) {
        return { kind: "unknown" };
    }
    const stateObject = metadata.objects?.[STATE_OBJECT] ?? {};
    const stateJson = stateObject[STATE_JSON];
    if (typeof stateJson === "string" && stateJson.length > 0) {
        return { kind: "value", signature: stateJson, loaded: deserializeState(stateJson) };
    }
    const orderJson = stateObject[LEGACY_ORDER_JSON];
    const expandedJson = stateObject[LEGACY_EXPANDED_JSON];
    if (typeof orderJson === "string" || typeof expandedJson === "string") {
        return {
            kind: "value",
            signature: `legacy:${JSON.stringify([orderJson ?? null, expandedJson ?? null])}`,
            loaded: deserializeLegacy(orderJson, expandedJson),
        };
    }
    return { kind: "value", signature: "", loaded: null };
}

export interface StateWriter {
    /** Persists the state and returns the raw value written (its future echo signature). */
    write(state: PersistedState): string;
}

export class HostStateWriter implements StateWriter {
    constructor(private readonly host: powerbi.extensibility.visual.IVisualHost) {}

    write(state: PersistedState): string {
        const stateJson = serializeState(state);
        this.host.persistProperties({
            merge: [{
                objectName: STATE_OBJECT,
                selector: null as unknown as powerbi.data.Selector,
                properties: { [STATE_JSON]: stateJson },
            }],
        });
        return stateJson;
    }
}
