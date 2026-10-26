/*
 * Formatting pane model. Card/slice names, display names, defaults and ranges are a
 * 1:1 port of the shipped v2.7.1.0 bundle (webpack module 473) so existing reports keep
 * their formatting.
 */
import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import NumUpDown = formattingSettings.NumUpDown;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import ColorPicker = formattingSettings.ColorPicker;
import FontPicker = formattingSettings.FontPicker;

const range = (min: number, max: number): powerbi.visuals.NumUpDownFormat => ({
    minValue: { type: powerbi.visuals.ValidatorType.Min, value: min },
    maxValue: { type: powerbi.visuals.ValidatorType.Max, value: max },
});

const num = (name: string, displayName: string, value: number, min: number, max: number) =>
    new NumUpDown({ name, displayName, value, options: range(min, max) });

const toggle = (name: string, displayName: string, value: boolean) =>
    new ToggleSwitch({ name, displayName, value });

const color = (name: string, displayName: string, value: string) =>
    new ColorPicker({ name, displayName, value: { value } });

class BehaviorCard extends Card {
    maxSelections = num("maxSelections", "Maximum dimensions", 30, 1, 100);
    requireSelection = toggle("requireSelection", "Require at least one dimension", true);
    selectFirstOnLoad = toggle("selectFirstOnLoad", "Select first child on load", true);
    name = "behavior";
    displayName = "Behavior";
    slices = [this.maxSelections, this.requireSelection, this.selectFirstOnLoad];
}

class VisibilityCard extends Card {
    showInstructions = toggle("showInstructions", "Show instructions", false);
    showSelectedPanel = toggle("showSelectedPanel", "Show selected order", true);
    showAreas = toggle("showAreas", "Show areas", true);
    showGroups = toggle("showGroups", "Show groups", true);
    showHeader = toggle("showHeader", "Show header", true);
    showCatalogTitle = toggle("showCatalogTitle", "Show catalog title", false);
    showGroupCounts = toggle("showGroupCounts", "Show group counts", true);
    showPositionBadges = toggle("showPositionBadges", "Show position badges", true);
    showMoveButtons = toggle("showMoveButtons", "Show reorder buttons", true);
    name = "visibility";
    displayName = "Visibility";
    slices = [
        this.showHeader, this.showInstructions, this.showSelectedPanel, this.showCatalogTitle, this.showAreas,
        this.showGroups, this.showGroupCounts, this.showPositionBadges, this.showMoveButtons,
    ];
}

class TypographyCard extends Card {
    fontFamily = new FontPicker({ name: "fontFamily", displayName: "Font family", value: "DIN" });
    itemFontSize = num("itemFontSize", "Dimension font size", 9, 6, 30);
    domainFontSize = num("domainFontSize", "Area font size", 9, 6, 30);
    groupFontSize = num("groupFontSize", "Group font size", 9, 6, 30);
    counterFontSize = num("counterFontSize", "Counter font size", 8, 6, 24);
    sectionTitleFontSize = num("sectionTitleFontSize", "Section title size", 8, 6, 24);
    lineHeight = num("lineHeight", "Line height (%)", 100, 60, 250);
    letterSpacing = num("letterSpacing", "Letter spacing (px)", 0, -2, 10);
    itemBold = toggle("itemBold", "Bold dimensions", false);
    groupBold = toggle("groupBold", "Bold groups", false);
    areaBold = toggle("areaBold", "Bold areas", true);
    italic = toggle("italic", "Italic text", false);
    name = "typography";
    displayName = "Typography";
    slices = [
        this.fontFamily, this.itemFontSize, this.domainFontSize, this.groupFontSize, this.counterFontSize,
        this.sectionTitleFontSize, this.lineHeight, this.letterSpacing, this.itemBold, this.groupBold,
        this.areaBold, this.italic,
    ];
}

class SpacingCard extends Card {
    rowMinHeight = num("rowMinHeight", "Minimum row height", 18, 12, 60);
    verticalPadding = num("verticalPadding", "Vertical padding", 0, 0, 20);
    horizontalPadding = num("horizontalPadding", "Horizontal padding", 3, 0, 30);
    outerPadding = num("outerPadding", "Outer padding", 3, 0, 30);
    rowGap = num("rowGap", "Row gap", 0, 0, 20);
    groupGap = num("groupGap", "Group gap", 0, 0, 30);
    controlGap = num("controlGap", "Control gap", 1, 0, 20);
    domainIndent = num("domainIndent", "Group indent", 4, 0, 40);
    itemIndent = num("itemIndent", "Dimension indent", 8, 0, 60);
    name = "spacing";
    displayName = "Spacing and density";
    slices = [
        this.rowMinHeight, this.verticalPadding, this.horizontalPadding, this.outerPadding, this.rowGap,
        this.groupGap, this.controlGap, this.domainIndent, this.itemIndent,
    ];
}

class ControlsCard extends Card {
    badgeSize = num("badgeSize", "Badge / checkbox size", 13, 8, 36);
    badgeBorderWidth = num("badgeBorderWidth", "Badge border width", 1, 0, 5);
    buttonSize = num("buttonSize", "Button size", 16, 10, 40);
    iconFontSize = num("iconFontSize", "Icon size", 9, 6, 24);
    cornerRadius = num("cornerRadius", "Corner radius", 2, 0, 20);
    selectedPanelPadding = num("selectedPanelPadding", "Selected panel padding", 2, 0, 20);
    name = "controls";
    displayName = "Controls";
    slices = [
        this.badgeSize, this.badgeBorderWidth, this.buttonSize, this.iconFontSize, this.cornerRadius,
        this.selectedPanelPadding,
    ];
}

class ColorsCard extends Card {
    backgroundColor = color("backgroundColor", "Visual background", "#FFFFFF");
    textColor = color("textColor", "Text color", "#252423");
    secondaryTextColor = color("secondaryTextColor", "Secondary text color", "#605E5C");
    accentColor = color("accentColor", "Accent color", "#5B2CA0");
    selectedTextColor = color("selectedTextColor", "Selected badge text", "#FFFFFF");
    selectedRowBackground = color("selectedRowBackground", "Selected row background", "#F1EAF9");
    hoverBackground = color("hoverBackground", "Hover background", "#F3F2F1");
    areaBackground = color("areaBackground", "Area background", "#FAF9F8");
    groupBackground = color("groupBackground", "Group background", "#FFFFFF");
    panelBackground = color("panelBackground", "Selected panel background", "#FFFFFF");
    panelBorderColor = color("panelBorderColor", "Panel border color", "#EDEBE9");
    badgeBorderColor = color("badgeBorderColor", "Badge border color", "#A19F9D");
    buttonHoverBackground = color("buttonHoverBackground", "Button hover background", "#E1DFDD");
    name = "colors";
    displayName = "Colors";
    slices = [
        this.backgroundColor, this.textColor, this.secondaryTextColor, this.accentColor, this.selectedTextColor,
        this.selectedRowBackground, this.hoverBackground, this.areaBackground, this.groupBackground,
        this.panelBackground, this.panelBorderColor, this.badgeBorderColor, this.buttonHoverBackground,
    ];
}

class ScrollbarCard extends Card {
    scrollbarWidth = num("scrollbarWidth", "Scrollbar width", 8, 4, 20);
    scrollbarThumb = color("scrollbarThumb", "Scrollbar thumb", "#A19F9D");
    scrollbarTrack = color("scrollbarTrack", "Scrollbar track", "#F3F2F1");
    alwaysShowScrollbar = toggle("alwaysShowScrollbar", "Always show vertical scrollbar", true);
    name = "scrollbar";
    displayName = "Vertical scrolling";
    slices = [this.scrollbarWidth, this.scrollbarThumb, this.scrollbarTrack, this.alwaysShowScrollbar];
}

class ExpansionCard extends Card {
    showToolbar = toggle("showToolbar", "Show expansion toolbar", true);
    stickyToolbar = toggle("stickyToolbar", "Keep toolbar visible", true);
    expandSelectedPaths = toggle("expandSelectedPaths", "Expand selected paths automatically", true);
    expandAllOnLoad = toggle("expandAllOnLoad", "Expand catalog fully on load", true);
    toolbarButtonSize = num("toolbarButtonSize", "Toolbar button size", 20, 12, 44);
    toolbarIconSize = num("toolbarIconSize", "Toolbar icon size", 10, 6, 24);
    toolbarGap = num("toolbarGap", "Toolbar gap", 2, 0, 16);
    toolbarBackground = color("toolbarBackground", "Toolbar background", "#FFFFFF");
    toolbarButtonColor = color("toolbarButtonColor", "Toolbar icon color", "#605E5C");
    name = "expansion";
    displayName = "Expansion controls";
    slices = [
        this.showToolbar, this.stickyToolbar, this.expandSelectedPaths, this.expandAllOnLoad,
        this.toolbarButtonSize, this.toolbarIconSize, this.toolbarGap, this.toolbarBackground,
        this.toolbarButtonColor,
    ];
}

export class VisualFormattingSettingsModel extends Model {
    behaviorCard = new BehaviorCard();
    visibilityCard = new VisibilityCard();
    typographyCard = new TypographyCard();
    spacingCard = new SpacingCard();
    controlsCard = new ControlsCard();
    colorsCard = new ColorsCard();
    scrollbarCard = new ScrollbarCard();
    expansionCard = new ExpansionCard();
    cards = [
        this.behaviorCard, this.visibilityCard, this.typographyCard, this.spacingCard, this.controlsCard,
        this.colorsCard, this.scrollbarCard, this.expansionCard,
    ];
}
