import { VisualFormattingSettingsModel } from "../formatting/settings";

/** Renders the expand-all / collapse-all toolbar, respecting showToolbar/stickyToolbar. */
export function renderToolbar(container: HTMLElement, settings: VisualFormattingSettingsModel): void {
    container.textContent = "";
    const expansion = settings.expansionCard;

    container.classList.toggle("is-sticky", expansion.stickyToolbar.value);

    const expandAllBtn = document.createElement("button");
    expandAllBtn.type = "button";
    expandAllBtn.className = "ofps-icon-button ofps-toolbar-button";
    expandAllBtn.dataset["action"] = "expand-all";
    expandAllBtn.setAttribute("aria-label", "Expand all");
    expandAllBtn.title = "Expand all";
    expandAllBtn.textContent = "Expand all";
    container.appendChild(expandAllBtn);

    const collapseAllBtn = document.createElement("button");
    collapseAllBtn.type = "button";
    collapseAllBtn.className = "ofps-icon-button ofps-toolbar-button";
    collapseAllBtn.dataset["action"] = "collapse-all";
    collapseAllBtn.setAttribute("aria-label", "Collapse all");
    collapseAllBtn.title = "Collapse all";
    collapseAllBtn.textContent = "Collapse all";
    container.appendChild(collapseAllBtn);
}
