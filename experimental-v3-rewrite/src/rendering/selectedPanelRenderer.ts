import { OrderedEntry } from "../model/types";
import { VisualFormattingSettingsModel } from "../formatting/settings";

export interface SelectedPanelRenderContext {
    order: readonly OrderedEntry[];
    settings: VisualFormattingSettingsModel;
}

/** Renders the ordered "selected panel" — drag handle, position badge, label, move/remove buttons. */
export function renderSelectedPanel(container: HTMLElement, context: SelectedPanelRenderContext): void {
    container.textContent = "";
    const { order, settings } = context;
    const visibility = settings.visibilityCard;

    if (order.length === 0) {
        const empty = document.createElement("div");
        empty.className = "ofps-selected-panel-empty";
        empty.textContent = "No selections yet.";
        container.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    order.forEach((entry, index) => {
        const row = document.createElement("div");
        row.className = "ofps-selected-row";
        row.dataset["key"] = entry.key;
        row.dataset["role"] = "selected-item";
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", "true");
        row.tabIndex = 0;
        row.draggable = true;

        const handle = document.createElement("span");
        handle.className = "ofps-drag-handle";
        handle.setAttribute("aria-hidden", "true");
        handle.textContent = "⠿";
        row.appendChild(handle);

        if (visibility.showPositionBadges.value) {
            const badge = document.createElement("span");
            badge.className = "ofps-position-badge";
            badge.textContent = String(index + 1);
            row.appendChild(badge);
        }

        const label = document.createElement("span");
        label.className = "ofps-selected-label";
        label.textContent = entry.label;
        row.appendChild(label);

        if (visibility.showMoveButtons.value) {
            const upBtn = document.createElement("button");
            upBtn.type = "button";
            upBtn.className = "ofps-icon-button";
            upBtn.dataset["action"] = "move-up";
            upBtn.dataset["key"] = entry.key;
            upBtn.setAttribute("aria-label", `Move ${entry.label} up`);
            upBtn.textContent = "↑";
            upBtn.disabled = index === 0;
            row.appendChild(upBtn);

            const downBtn = document.createElement("button");
            downBtn.type = "button";
            downBtn.className = "ofps-icon-button";
            downBtn.dataset["action"] = "move-down";
            downBtn.dataset["key"] = entry.key;
            downBtn.setAttribute("aria-label", `Move ${entry.label} down`);
            downBtn.textContent = "↓";
            downBtn.disabled = index === order.length - 1;
            row.appendChild(downBtn);
        }

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "ofps-icon-button ofps-remove-button";
        removeBtn.dataset["action"] = "remove";
        removeBtn.dataset["key"] = entry.key;
        removeBtn.setAttribute("aria-label", `Remove ${entry.label}`);
        removeBtn.textContent = "✕";
        row.appendChild(removeBtn);

        fragment.appendChild(row);
    });

    container.appendChild(fragment);
}
