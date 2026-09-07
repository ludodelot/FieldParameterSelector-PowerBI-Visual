export interface VisualDomElements {
    root: HTMLElement;
    header: HTMLElement;
    instructions: HTMLElement;
    toolbar: HTMLElement;
    body: HTMLElement;
    catalogPane: HTMLElement;
    catalogTitle: HTMLElement;
    catalogList: HTMLElement;
    selectedPanel: HTMLElement;
    selectedPanelTitle: HTMLElement;
    selectedPanelList: HTMLElement;
    emptyState: HTMLElement;
    liveRegion: HTMLElement;
}

/** Builds the static DOM skeleton once. Never call this per-update(); render() only mutates contents. */
export function createVisualDom(target: HTMLElement): VisualDomElements {
    target.textContent = "";

    const root = document.createElement("div");
    root.className = "ofps-root";
    root.tabIndex = -1;

    const header = document.createElement("div");
    header.className = "ofps-header";

    const instructions = document.createElement("div");
    instructions.className = "ofps-instructions";
    instructions.textContent = "Click catalog items to add them to your ordered selection. Drag entries in the panel to reorder.";

    const toolbar = document.createElement("div");
    toolbar.className = "ofps-toolbar";

    const body = document.createElement("div");
    body.className = "ofps-body";

    const catalogPane = document.createElement("div");
    catalogPane.className = "ofps-catalog-pane";

    const catalogTitle = document.createElement("div");
    catalogTitle.className = "ofps-catalog-title";
    catalogTitle.textContent = "Catalog";

    const catalogList = document.createElement("div");
    catalogList.className = "ofps-catalog-list";
    catalogList.setAttribute("role", "tree");
    catalogList.tabIndex = 0;

    const selectedPanel = document.createElement("div");
    selectedPanel.className = "ofps-selected-panel";

    const selectedPanelTitle = document.createElement("div");
    selectedPanelTitle.className = "ofps-selected-panel-title";
    selectedPanelTitle.textContent = "Selected order";

    const selectedPanelList = document.createElement("div");
    selectedPanelList.className = "ofps-selected-panel-list";
    selectedPanelList.setAttribute("role", "listbox");

    const emptyState = document.createElement("div");
    emptyState.className = "ofps-empty-state";
    emptyState.textContent = "Add a Field Parameter role to get started.";
    emptyState.hidden = true;

    const liveRegion = document.createElement("div");
    liveRegion.className = "ofps-live-region";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("role", "status");

    header.appendChild(instructions);

    catalogPane.appendChild(catalogTitle);
    catalogPane.appendChild(catalogList);

    selectedPanel.appendChild(selectedPanelTitle);
    selectedPanel.appendChild(selectedPanelList);

    body.appendChild(catalogPane);
    body.appendChild(selectedPanel);

    root.appendChild(header);
    root.appendChild(toolbar);
    root.appendChild(body);
    root.appendChild(emptyState);
    root.appendChild(liveRegion);
    target.appendChild(root);

    return {
        root, header, instructions, toolbar, body,
        catalogPane, catalogTitle, catalogList,
        selectedPanel, selectedPanelTitle, selectedPanelList,
        emptyState, liveRegion
    };
}
