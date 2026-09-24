import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

import "./../style/visual.less";

import { buildIdentityFilter, readIdentityTargets } from "./filter/identityFilter";
import { buildCatalog } from "./model/catalog";
import { Renderer } from "./render/renderer";
import { SelectorController } from "./selectorController";
import { VisualFormattingSettingsModel } from "./settings";
import { HostStateWriter, readPersisted } from "./state/stateRepository";
import { StateStore, systemClock } from "./state/stateStore";
import { loadStrings } from "./strings";
import { readViewSettings, ViewSettings } from "./viewSettings";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IFilter = powerbi.IFilter;

const FILTER_OBJECT = "general";
const FILTER_PROPERTY = "filter";

export class Visual implements IVisual {
    private readonly host: IVisualHost;
    private readonly settingsService = new FormattingSettingsService();
    private readonly controller: SelectorController;
    private readonly renderer: Renderer;
    private formattingSettings = new VisualFormattingSettingsModel();
    private settings: ViewSettings = readViewSettings(undefined);

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        options.element.classList.add("ordered-fp-selector");

        const store = new StateStore(new HostStateWriter(this.host), systemClock);
        this.controller = new SelectorController(
            store,
            { apply: (targets) => this.applyFilter(targets) },
            systemClock,
            () => this.renderView(),
        );
        this.renderer = new Renderer(options.element, {
            toggle: (key) => this.afterAction(() => this.controller.toggle(key)),
            move: (key, delta) => this.afterAction(() => this.controller.move(key, delta)),
            clearAll: () => this.afterAction(() => this.controller.clearAll()),
            toggleExpanded: (key) => this.afterAction(() => this.controller.toggleExpanded(key)),
            expandToLevel: (level) => this.afterAction(() => this.controller.expandToLevel(level)),
            scroll: (scrollTop) => this.controller.setScrollTop(scrollTop),
        }, loadStrings(this.host.createLocalizationManager?.()));
    }

    public update(options: VisualUpdateOptions): void {
        this.host.eventService.renderingStarted(options);
        try {
            const dataView = options.dataViews?.[0];
            this.formattingSettings = this.settingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);
            this.settings = readViewSettings(this.formattingSettings);
            this.controller.update({
                catalog: buildCatalog(dataView),
                options: this.settings,
                persisted: readPersisted(dataView),
                filterTargets: readIdentityTargets(options.jsonFilters),
                isDataUpdate: options.type === undefined || (options.type & powerbi.VisualUpdateType.Data) !== 0,
            });
            this.renderView();
            this.host.eventService.renderingFinished(options);
        } catch (error) {
            this.renderer.renderError(error);
            this.host.eventService.renderingFailed(options, String(error));
        }
    }

    public destroy(): void {
        this.controller.destroy();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.settingsService.buildFormattingModel(this.formattingSettings);
    }

    private afterAction(action: () => void): void {
        action();
        this.renderView();
    }

    private renderView(): void {
        this.renderer.render(this.settings, this.controller);
    }

    private applyFilter(targets: readonly number[]): void {
        if (targets.length === 0) {
            this.host.applyJsonFilter(null as unknown as IFilter, FILTER_OBJECT, FILTER_PROPERTY, powerbi.FilterAction.remove);
            return;
        }
        this.host.applyJsonFilter(buildIdentityFilter(targets) as unknown as IFilter, FILTER_OBJECT, FILTER_PROPERTY, powerbi.FilterAction.merge);
    }
}
