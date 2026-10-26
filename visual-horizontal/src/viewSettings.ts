/*
 * Flattens the formatting model into a plain, immutable settings object.
 * Fallback semantics mirror the shipped v2.7.1.0 bundle: properties whose valid range
 * excludes 0 fall back with `||`, properties where 0 is meaningful fall back with `??`.
 */
import type { VisualFormattingSettingsModel } from "./settings";

export interface ViewSettings {
    readonly maxSelections: number;
    readonly requireSelection: boolean;
    readonly selectFirstOnLoad: boolean;

    readonly showInstructions: boolean;
    readonly showSelectedPanel: boolean;
    readonly showAreas: boolean;
    readonly showGroups: boolean;
    readonly showHeader: boolean;
    readonly showCatalogTitle: boolean;
    readonly showGroupCounts: boolean;
    readonly showPositionBadges: boolean;
    readonly showMoveButtons: boolean;

    readonly fontFamily: string;
    readonly itemFontSize: number;
    readonly domainFontSize: number;
    readonly groupFontSize: number;
    readonly counterFontSize: number;
    readonly sectionTitleFontSize: number;
    readonly lineHeight: number;
    readonly letterSpacing: number;
    readonly itemBold: boolean;
    readonly groupBold: boolean;
    readonly areaBold: boolean;
    readonly italic: boolean;

    readonly rowMinHeight: number;
    readonly verticalPadding: number;
    readonly horizontalPadding: number;
    readonly outerPadding: number;
    readonly rowGap: number;
    readonly groupGap: number;
    readonly controlGap: number;
    readonly domainIndent: number;
    readonly itemIndent: number;

    readonly badgeSize: number;
    readonly buttonSize: number;
    readonly iconFontSize: number;
    readonly cornerRadius: number;
    readonly selectedPanelPadding: number;
    readonly badgeBorderWidth: number;

    readonly backgroundColor: string;
    readonly textColor: string;
    readonly secondaryTextColor: string;
    readonly accentColor: string;
    readonly selectedTextColor: string;
    readonly selectedRowBackground: string;
    readonly hoverBackground: string;
    readonly areaBackground: string;
    readonly groupBackground: string;
    readonly panelBackground: string;
    readonly panelBorderColor: string;
    readonly badgeBorderColor: string;
    readonly buttonHoverBackground: string;

    readonly scrollbarWidth: number;
    readonly scrollbarThumb: string;
    readonly scrollbarTrack: string;
    readonly alwaysShowScrollbar: boolean;

    readonly showToolbar: boolean;
    readonly stickyToolbar: boolean;
    readonly expandSelectedPaths: boolean;
    readonly expandAllOnLoad: boolean;
    readonly toolbarButtonSize: number;
    readonly toolbarIconSize: number;
    readonly toolbarGap: number;
    readonly toolbarBackground: string;
    readonly toolbarButtonColor: string;
}

export const MAX_SELECTIONS_LIMIT = 100;

interface ValueSlice<T> {
    value?: T;
}

/** `true` unless explicitly switched off (for toggles that default to on). */
const onUnlessOff = (slice: ValueSlice<boolean> | undefined): boolean => slice?.value !== false;
/** `false` unless explicitly switched on (for toggles that default to off). */
const offUnlessOn = (slice: ValueSlice<boolean> | undefined): boolean => slice?.value === true;
/** Numeric fallback for properties where 0 is not a valid value. */
const positive = (slice: ValueSlice<number> | undefined, fallback: number): number =>
    Number(slice?.value || fallback);
/** Numeric fallback for properties where 0 is a valid value. */
const numeric = (slice: ValueSlice<number> | undefined, fallback: number): number =>
    Number(slice?.value ?? fallback);
const colorOf = (slice: ValueSlice<{ value?: string }> | undefined, fallback: string): string =>
    String(slice?.value?.value || fallback);

export function readViewSettings(model: VisualFormattingSettingsModel | undefined): ViewSettings {
    const b = model?.behaviorCard;
    const v = model?.visibilityCard;
    const t = model?.typographyCard;
    const s = model?.spacingCard;
    const c = model?.controlsCard;
    const k = model?.colorsCard;
    const sb = model?.scrollbarCard;
    const x = model?.expansionCard;

    return {
        maxSelections: Math.max(1, Math.min(MAX_SELECTIONS_LIMIT, Math.floor(positive(b?.maxSelections, 30)))),
        requireSelection: onUnlessOff(b?.requireSelection),
        selectFirstOnLoad: onUnlessOff(b?.selectFirstOnLoad),

        showInstructions: offUnlessOn(v?.showInstructions),
        showSelectedPanel: onUnlessOff(v?.showSelectedPanel),
        showAreas: onUnlessOff(v?.showAreas),
        showGroups: onUnlessOff(v?.showGroups),
        showHeader: onUnlessOff(v?.showHeader),
        showCatalogTitle: offUnlessOn(v?.showCatalogTitle),
        showGroupCounts: onUnlessOff(v?.showGroupCounts),
        showPositionBadges: onUnlessOff(v?.showPositionBadges),
        showMoveButtons: onUnlessOff(v?.showMoveButtons),

        fontFamily: String(t?.fontFamily?.value || "DIN"),
        itemFontSize: positive(t?.itemFontSize, 9),
        domainFontSize: positive(t?.domainFontSize, 9),
        groupFontSize: positive(t?.groupFontSize, 9),
        counterFontSize: positive(t?.counterFontSize, 8),
        sectionTitleFontSize: positive(t?.sectionTitleFontSize, 8),
        lineHeight: positive(t?.lineHeight, 100),
        letterSpacing: numeric(t?.letterSpacing, 0),
        itemBold: offUnlessOn(t?.itemBold),
        groupBold: offUnlessOn(t?.groupBold),
        areaBold: onUnlessOff(t?.areaBold),
        italic: offUnlessOn(t?.italic),

        rowMinHeight: positive(s?.rowMinHeight, 18),
        verticalPadding: numeric(s?.verticalPadding, 0),
        horizontalPadding: numeric(s?.horizontalPadding, 3),
        outerPadding: numeric(s?.outerPadding, 3),
        rowGap: numeric(s?.rowGap, 0),
        groupGap: numeric(s?.groupGap, 0),
        controlGap: numeric(s?.controlGap, 1),
        domainIndent: numeric(s?.domainIndent, 4),
        itemIndent: numeric(s?.itemIndent, 8),

        badgeSize: positive(c?.badgeSize, 13),
        buttonSize: positive(c?.buttonSize, 16),
        iconFontSize: positive(c?.iconFontSize, 9),
        cornerRadius: numeric(c?.cornerRadius, 2),
        selectedPanelPadding: numeric(c?.selectedPanelPadding, 2),
        badgeBorderWidth: numeric(c?.badgeBorderWidth, 1),

        backgroundColor: colorOf(k?.backgroundColor, "#FFFFFF"),
        textColor: colorOf(k?.textColor, "#252423"),
        secondaryTextColor: colorOf(k?.secondaryTextColor, "#605E5C"),
        accentColor: colorOf(k?.accentColor, "#5B2CA0"),
        selectedTextColor: colorOf(k?.selectedTextColor, "#FFFFFF"),
        selectedRowBackground: colorOf(k?.selectedRowBackground, "#F1EAF9"),
        hoverBackground: colorOf(k?.hoverBackground, "#F3F2F1"),
        areaBackground: colorOf(k?.areaBackground, "#FAF9F8"),
        groupBackground: colorOf(k?.groupBackground, "#FFFFFF"),
        panelBackground: colorOf(k?.panelBackground, "#FFFFFF"),
        panelBorderColor: colorOf(k?.panelBorderColor, "#EDEBE9"),
        badgeBorderColor: colorOf(k?.badgeBorderColor, "#A19F9D"),
        buttonHoverBackground: colorOf(k?.buttonHoverBackground, "#E1DFDD"),

        scrollbarWidth: positive(sb?.scrollbarWidth, 8),
        scrollbarThumb: colorOf(sb?.scrollbarThumb, "#A19F9D"),
        scrollbarTrack: colorOf(sb?.scrollbarTrack, "#F3F2F1"),
        alwaysShowScrollbar: onUnlessOff(sb?.alwaysShowScrollbar),

        showToolbar: onUnlessOff(x?.showToolbar),
        stickyToolbar: onUnlessOff(x?.stickyToolbar),
        expandSelectedPaths: onUnlessOff(x?.expandSelectedPaths),
        expandAllOnLoad: onUnlessOff(x?.expandAllOnLoad),
        toolbarButtonSize: positive(x?.toolbarButtonSize, 20),
        toolbarIconSize: positive(x?.toolbarIconSize, 10),
        toolbarGap: numeric(x?.toolbarGap, 2),
        toolbarBackground: colorOf(x?.toolbarBackground, "#FFFFFF"),
        toolbarButtonColor: colorOf(x?.toolbarButtonColor, "#605E5C"),
    };
}
