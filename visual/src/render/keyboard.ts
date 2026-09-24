/*
 * Arrow-key navigation inside the catalog (tree-style):
 *   ArrowUp / ArrowDown  previous / next row or header
 *   Home / End           first / last row or header
 *   ArrowRight           expands a collapsed header, otherwise moves down
 *   ArrowLeft            collapses an expanded header, otherwise jumps to the parent header
 * Enter / Space are handled natively by the buttons.
 */
export interface KeyboardActions {
    toggleExpanded(key: string): void;
}

const focus = (node: HTMLElement | undefined): void => node?.focus();

function parentHeader(nav: readonly HTMLElement[], index: number): HTMLElement | undefined {
    const level = Number(nav[index].dataset.level);
    for (let i = index - 1; i >= 0; i--) {
        if (nav[i].dataset.expandKey !== undefined && Number(nav[i].dataset.level) < level) {
            return nav[i];
        }
    }
    return undefined;
}

export function handleCatalogKeydown(event: KeyboardEvent, container: HTMLElement, actions: KeyboardActions): void {
    const active = container.ownerDocument.activeElement;
    if (!(active instanceof HTMLElement) || !container.contains(active) || active.dataset.nav === undefined) {
        return;
    }
    const nav = Array.from(container.querySelectorAll<HTMLElement>("[data-nav]"));
    const index = nav.indexOf(active);
    const expandKey = active.dataset.expandKey;
    const expanded = active.getAttribute("aria-expanded") === "true";

    switch (event.key) {
        case "ArrowDown":
            focus(nav[index + 1]);
            break;
        case "ArrowUp":
            focus(nav[index - 1]);
            break;
        case "Home":
            focus(nav[0]);
            break;
        case "End":
            focus(nav[nav.length - 1]);
            break;
        case "ArrowRight":
            if (expandKey !== undefined && !expanded) {
                actions.toggleExpanded(expandKey);
            } else {
                focus(nav[index + 1]);
            }
            break;
        case "ArrowLeft":
            if (expandKey !== undefined && expanded) {
                actions.toggleExpanded(expandKey);
            } else {
                focus(parentHeader(nav, index));
            }
            break;
        default:
            return;
    }
    event.preventDefault();
}
