import powerbi from "powerbi-visuals-api";

import { buildIdentityFilter } from "../src/filter/identityFilter";
import { areaKey, groupKey } from "../src/model/catalog";
import { FILTER_GRACE_MS } from "../src/selectorController";
import { VisualFormattingSettingsModel } from "../src/settings";
import { loadStrings, STRING_FALLBACKS } from "../src/strings";
import { readViewSettings } from "../src/viewSettings";
import { Visual } from "../src/visual";
import { DataViewSpec, makeDataView, ROWS, stateJsonOf } from "./helpers";

import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

const DATA = 2;

function createHost() {
    return {
        eventService: { renderingStarted: jest.fn(), renderingFinished: jest.fn(), renderingFailed: jest.fn() },
        applyJsonFilter: jest.fn(),
        persistProperties: jest.fn(),
        createLocalizationManager: () => ({ getDisplayName: (key: string) => key }),
    };
}

type Host = ReturnType<typeof createHost>;

function setup(): { host: Host; element: HTMLElement; visual: Visual } {
    const host = createHost();
    const element = document.createElement("div");
    document.body.replaceChildren(element);
    const visual = new Visual({ host, element } as unknown as powerbi.extensibility.visual.VisualConstructorOptions);
    return { host, element, visual };
}

function updateOptions(spec: DataViewSpec, targets?: number[], type = DATA): powerbi.extensibility.visual.VisualUpdateOptions {
    return {
        dataViews: [makeDataView(spec)],
        jsonFilters: targets ? [buildIdentityFilter(targets) as unknown as powerbi.IFilter] : [],
        type,
        viewport: { width: 200, height: 400 },
    } as unknown as powerbi.extensibility.visual.VisualUpdateOptions;
}

const ALL_EXPANDED = [areaKey("Geo"), groupKey("Geo", "Region"), groupKey("Geo", "Retail"), areaKey("Product"), groupKey("Product", "Line")];
const selected = {
    rows: ROWS,
    stateJson: stateJsonOf({ order: ["Store", "Brand"], expanded: ALL_EXPANDED, applied: [[2, "Store"], [0, "Brand"]] }),
};
const rowLabels = (element: HTMLElement) => Array.from(element.querySelectorAll(".catalog .row .label")).map((n) => n.textContent);
const findRow = (element: HTMLElement, label: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>(".catalog .row")).find((row) => row.textContent?.includes(label)) as HTMLButtonElement;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("rendering matches v2.7.1.0", () => {
    test("uses the same structure and class names", () => {
        const { element, visual } = setup();

        visual.update(updateOptions(selected, [2, 0]));

        expect(element.classList.contains("ordered-fp-selector")).toBe(true);
        expect(element.querySelector(":scope > .root > .fixed-region > .header > div > strong")?.textContent).toBe("Dimensions");
        expect(element.querySelector(".header span")?.textContent).toBe("2/30");
        expect(element.querySelector(".header .clear")?.textContent).toBe("Reset");
        expect(Array.from(element.querySelectorAll(".toolbar.sticky button")).map((b) => b.textContent)).toEqual(["−", "1", "2", "+"]);
        expect(element.querySelector(".selected-panel .section-title")?.textContent).toBe("Matrix order");
        expect(element.querySelectorAll(".selected-panel .selected-row .badge.active")).toHaveLength(2);
        expect(element.querySelector(":scope > .root > .catalog-scroll > section.catalog > button.group-header.domain-level")).not.toBeNull();
        expect(element.querySelector(".group-wrapper > button.group-header.nested.group-level .group-count")).not.toBeNull();
        expect(findRow(element, "Store").className).toBe("row selected nested-item");
        expect(rowLabels(element)).toEqual(["Country", "Store", "Brand", "Category"]);
    });

    test("sets the default CSS variables of the shipped visual", () => {
        const { element, visual } = setup();

        visual.update(updateOptions(selected, [2, 0]));
        const style = (element.querySelector(".root") as HTMLElement).style;

        expect(style.getPropertyValue("--item-font-size")).toBe("9px");
        expect(style.getPropertyValue("--badge-size")).toBe("13px");
        expect(style.getPropertyValue("--horizontal-padding")).toBe("3px");
        expect(style.getPropertyValue("--accent-color")).toBe("#5B2CA0");
        expect((element.querySelector(".root") as HTMLElement).classList.contains("always-scroll")).toBe(true);
    });

    test("shows a neutral empty-state message (#14)", () => {
        const { element, visual } = setup();

        visual.update(updateOptions({ rows: [] }));

        expect(element.querySelector(".empty")?.textContent).toBe(STRING_FALLBACKS.Visual_Empty);
        expect(element.textContent).not.toMatch(/Cognos|LVMH/);
    });
});

describe("rendering events (#7)", () => {
    test("every update ends with renderingFinished, including when the default is applied", () => {
        const { host, visual } = setup();

        visual.update(updateOptions({ rows: ROWS }));
        jest.advanceTimersByTime(FILTER_GRACE_MS);
        visual.update(updateOptions({ rows: ROWS }, [0]));
        visual.update(updateOptions({ rows: ROWS, stateJson: "" }));

        expect(host.eventService.renderingStarted).toHaveBeenCalledTimes(3);
        expect(host.eventService.renderingFinished).toHaveBeenCalledTimes(3);
        expect(host.applyJsonFilter).toHaveBeenCalled();
    });

    test("reports failures with renderingFailed", () => {
        const { host, element, visual } = setup();
        const broken = { dataViews: [{ get categorical() { throw new Error("boom"); } }], type: DATA };

        visual.update(broken as unknown as powerbi.extensibility.visual.VisualUpdateOptions);

        expect(host.eventService.renderingFailed).toHaveBeenCalledTimes(1);
        expect(element.querySelector(".error")?.textContent).toBe("boom");
    });
});

describe("interaction", () => {
    test("clicking a row applies the identity filter in click order", () => {
        const { host, element, visual } = setup();
        visual.update(updateOptions(selected, [2, 0]));

        findRow(element, "Country").click();

        expect(host.applyJsonFilter).toHaveBeenLastCalledWith(buildIdentityFilter([2, 0, 3]), "general", "filter", 0);
        expect(findRow(element, "Country").querySelector(".badge")?.textContent).toBe("3");
    });

    test("clear removes the filter", () => {
        const { host, element, visual } = setup();
        const spec = { ...selected, objects: { behavior: { requireSelection: false } } };
        visual.update(updateOptions(spec, [2, 0]));

        (element.querySelector(".clear") as HTMLButtonElement).click();

        expect(host.applyJsonFilter).toHaveBeenLastCalledWith(null, "general", "filter", 1);
    });

    test("an echo update does not rebuild the DOM (#8, #12)", () => {
        const { element, visual } = setup();
        visual.update(updateOptions(selected, [2, 0]));
        const row = findRow(element, "Store");

        visual.update(updateOptions(selected, [2, 0]));

        expect(findRow(element, "Store")).toBe(row);
    });

    test("scrolling does not persist (#8)", () => {
        const { host, element, visual } = setup();
        visual.update(updateOptions(selected, [2, 0]));
        const scroller = element.querySelector(".catalog-scroll") as HTMLElement;

        scroller.dispatchEvent(new Event("scroll"));
        jest.advanceTimersByTime(1000);

        expect(host.persistProperties).not.toHaveBeenCalled();
    });

    test("user changes are persisted once after the debounce", () => {
        const { host, element, visual } = setup();
        visual.update(updateOptions(selected, [2, 0]));

        findRow(element, "Country").click();
        jest.advanceTimersByTime(1000);

        expect(host.persistProperties).toHaveBeenCalledTimes(1);
    });
});

describe("keyboard (#12)", () => {
    test("focus stays on the activated row after the re-render", () => {
        const { element, visual } = setup();
        visual.update(updateOptions(selected, [2, 0]));
        findRow(element, "Country").focus();

        findRow(element, "Country").click();

        expect((document.activeElement as HTMLElement).dataset.focusKey).toBe("item:Country");
    });

    test("arrow keys move through the catalog and collapse headers", () => {
        const { element, visual } = setup();
        visual.update(updateOptions(selected, [2, 0]));
        const nav = () => Array.from(element.querySelectorAll<HTMLElement>(".catalog [data-nav]"));
        const press = (key: string) => document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

        nav()[0].focus();
        press("ArrowDown");
        expect(document.activeElement).toBe(nav()[1]);

        press("ArrowUp");
        expect(document.activeElement?.getAttribute("aria-expanded")).toBe("true");
        press("ArrowLeft");

        expect(nav()[0].getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(nav()[0]);
    });

    test("rows expose their selection state", () => {
        const { element, visual } = setup();

        visual.update(updateOptions(selected, [2, 0]));

        expect(findRow(element, "Store").getAttribute("aria-pressed")).toBe("true");
        expect(findRow(element, "Country").getAttribute("aria-pressed")).toBe("false");
    });
});

describe("settings", () => {
    test("defaults match the shipped visual", () => {
        const settings = readViewSettings(undefined);

        expect(settings).toMatchObject({
            maxSelections: 30, fontFamily: "DIN", itemFontSize: 9, badgeSize: 13, horizontalPadding: 3,
            outerPadding: 3, rowMinHeight: 18, toolbarButtonSize: 20, accentColor: "#5B2CA0",
        });
    });

    test("reads formatting values, keeping 0 where it is valid", () => {
        const dataView = makeDataView({
            rows: ROWS,
            objects: { spacing: { verticalPadding: 0, horizontalPadding: 0 }, typography: { itemFontSize: 12 }, behavior: { maxSelections: 500 } },
        });
        const model = new FormattingSettingsService().populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

        const settings = readViewSettings(model);

        expect(settings.horizontalPadding).toBe(0);
        expect(settings.itemFontSize).toBe(12);
        expect(settings.maxSelections).toBe(100);
    });

    test("localized strings fall back to English", () => {
        const strings = loadStrings({ getDisplayName: (key) => (key === "Visual_Reset" ? "Restablecer" : key) });

        expect(strings.Visual_Reset).toBe("Restablecer");
        expect(strings.Visual_Clear).toBe("Clear");
    });
});
