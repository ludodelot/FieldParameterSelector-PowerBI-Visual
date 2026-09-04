import { VisualFormattingSettingsModel } from "../formatting/settings";

/** Maps resolved formatting settings onto the CSS custom properties consumed by style/visual.less. */
export function buildCssVariables(settings: VisualFormattingSettingsModel): Record<string, string> {
    const t = settings.typographyCard;
    const s = settings.spacingCard;
    const c = settings.controlsCard;
    const col = settings.colorsCard;
    const sb = settings.scrollbarCard;
    const ex = settings.expansionCard;

    return {
        "--ofps-font-family": `"${t.fontFamily.value}"`,
        "--ofps-item-font-size": `${t.itemFontSize.value}px`,
        "--ofps-domain-font-size": `${t.domainFontSize.value}px`,
        "--ofps-group-font-size": `${t.groupFontSize.value}px`,
        "--ofps-counter-font-size": `${t.counterFontSize.value}px`,
        "--ofps-section-title-font-size": `${t.sectionTitleFontSize.value}px`,
        "--ofps-line-height": `${t.lineHeight.value}%`,
        "--ofps-letter-spacing": `${t.letterSpacing.value}px`,
        "--ofps-item-weight": t.itemBold.value ? "700" : "400",
        "--ofps-group-weight": t.groupBold.value ? "700" : "400",
        "--ofps-area-weight": t.areaBold.value ? "700" : "400",
        "--ofps-font-style": t.italic.value ? "italic" : "normal",

        "--ofps-row-min-height": `${s.rowMinHeight.value}px`,
        "--ofps-vertical-padding": `${s.verticalPadding.value}px`,
        "--ofps-horizontal-padding": `${s.horizontalPadding.value}px`,
        "--ofps-outer-padding": `${s.outerPadding.value}px`,
        "--ofps-row-gap": `${s.rowGap.value}px`,
        "--ofps-group-gap": `${s.groupGap.value}px`,
        "--ofps-control-gap": `${s.controlGap.value}px`,
        "--ofps-domain-indent": `${s.domainIndent.value}px`,
        "--ofps-item-indent": `${s.itemIndent.value}px`,

        "--ofps-badge-size": `${c.badgeSize.value}px`,
        "--ofps-button-size": `${c.buttonSize.value}px`,
        "--ofps-icon-font-size": `${c.iconFontSize.value}px`,
        "--ofps-corner-radius": `${c.cornerRadius.value}px`,
        "--ofps-selected-panel-padding": `${c.selectedPanelPadding.value}px`,
        "--ofps-badge-border-width": `${c.badgeBorderWidth.value}px`,

        "--ofps-background-color": col.backgroundColor.value.value,
        "--ofps-text-color": col.textColor.value.value,
        "--ofps-secondary-text-color": col.secondaryTextColor.value.value,
        "--ofps-accent-color": col.accentColor.value.value,
        "--ofps-selected-text-color": col.selectedTextColor.value.value,
        "--ofps-selected-row-background": col.selectedRowBackground.value.value,
        "--ofps-hover-background": col.hoverBackground.value.value,
        "--ofps-area-background": col.areaBackground.value.value,
        "--ofps-group-background": col.groupBackground.value.value,
        "--ofps-panel-background": col.panelBackground.value.value,
        "--ofps-panel-border-color": col.panelBorderColor.value.value,
        "--ofps-badge-border-color": col.badgeBorderColor.value.value,
        "--ofps-button-hover-background": col.buttonHoverBackground.value.value,

        "--ofps-scrollbar-width": `${sb.scrollbarWidth.value}px`,
        "--ofps-scrollbar-thumb": sb.scrollbarThumb.value.value,
        "--ofps-scrollbar-track": sb.scrollbarTrack.value.value,
        "--ofps-scrollbar-track-visibility": sb.alwaysShowScrollbar.value ? "visible" : "auto",

        "--ofps-toolbar-button-size": `${ex.toolbarButtonSize.value}px`,
        "--ofps-toolbar-icon-size": `${ex.toolbarIconSize.value}px`,
        "--ofps-toolbar-gap": `${ex.toolbarGap.value}px`,
        "--ofps-toolbar-background": ex.toolbarBackground.value.value,
        "--ofps-toolbar-button-color": ex.toolbarButtonColor.value.value
    };
}

export function applyCssVariables(target: HTMLElement, variables: Readonly<Record<string, string>>): void {
    for (const [key, value] of Object.entries(variables)) {
        target.style.setProperty(key, value);
    }
}
