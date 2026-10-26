/*
 * Arrow-key navigation inside the catalog:
 *   ArrowLeft / ArrowRight  previous / next chip or header (the catalog flows horizontally)
 *   ArrowUp / ArrowDown     same, for users used to the vertical visual
 *   Home / End              first / last chip or header
 * Enter / Space are handled natively by the buttons: they select a chip or expand / collapse a header.
 */
const focus = (node: HTMLElement | undefined): void => node?.focus();

export function handleCatalogKeydown(event: KeyboardEvent, container: HTMLElement): void {
    const active = container.ownerDocument.activeElement;
    if (!(active instanceof HTMLElement) || !container.contains(active) || active.dataset.nav === undefined) {
        return;
    }
    const nav = Array.from(container.querySelectorAll<HTMLElement>("[data-nav]"));
    const index = nav.indexOf(active);

    switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
            focus(nav[index + (event.key === "ArrowDown" ? 1 : -1)]);
            break;
        case "Home":
            focus(nav[0]);
            break;
        case "End":
            focus(nav[nav.length - 1]);
            break;
        case "ArrowRight":
            focus(nav[index + 1]);
            break;
        case "ArrowLeft":
            focus(nav[index - 1]);
            break;
        default:
            return;
    }
    event.preventDefault();
}
