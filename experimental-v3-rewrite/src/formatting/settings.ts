import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import NumUpDown = formattingSettings.NumUpDown;
import ColorPicker = formattingSettings.ColorPicker;
import TextInput = formattingSettings.TextInput;
import FontPicker = formattingSettings.FontPicker;

function colorValue(hex: string): powerbi.ThemeColorData {
    return { value: hex };
}

/**
 * Note: the "state" object (stateJson / orderJson / expandedJson) declared in
 * capabilities.json deliberately has NO card here. Those three properties are
 * internal storage only, read/written exclusively through
 * host.persistProperties() by src/state/stateRepository.ts - never exposed in
 * the formatting pane.
 */

class BehaviorCardSettings extends FormattingSettingsCard {
    maxSelections = new NumUpDown({ name: "maxSelections", displayName: "Maximum dimensions", value: 6 });
    requireSelection = new ToggleSwitch({ name: "requireSelection", displayName: "Require at least one dimension", value: false });
    selectFirstOnLoad = new ToggleSwitch({ name: "selectFirstOnLoad", displayName: "Select first child on load", value: false });

    override name = "behavior";
    override displayName = "Behavior";
    override slices: FormattingSettingsSlice[] = [this.maxSelections, this.requireSelection, this.selectFirstOnLoad];
}

class VisibilityCardSettings extends FormattingSettingsCard {
    showInstructions = new ToggleSwitch({ name: "showInstructions", displayName: "Show instructions", value: true });
    showSelectedPanel = new ToggleSwitch({ name: "showSelectedPanel", displayName: "Show selected order", value: true });
    showAreas = new ToggleSwitch({ name: "showAreas", displayName: "Show areas", value: true });
    showGroups = new ToggleSwitch({ name: "showGroups", displayName: "Show groups", value: true });
    showHeader = new ToggleSwitch({ name: "showHeader", displayName: "Show header", value: true });
    showCatalogTitle = new ToggleSwitch({ name: "showCatalogTitle", displayName: "Show catalog title", value: true });
    showGroupCounts = new ToggleSwitch({ name: "showGroupCounts", displayName: "Show group counts", value: true });
    showPositionBadges = new ToggleSwitch({ name: "showPositionBadges", displayName: "Show position badges", value: true });
    showMoveButtons = new ToggleSwitch({ name: "showMoveButtons", displayName: "Show reorder buttons", value: true });

    override name = "visibility";
    override displayName = "Visibility";
    override slices: FormattingSettingsSlice[] = [
        this.showInstructions, this.showSelectedPanel, this.showAreas, this.showGroups,
        this.showHeader, this.showCatalogTitle, this.showGroupCounts, this.showPositionBadges, this.showMoveButtons
    ];
}

class TypographyCardSettings extends FormattingSettingsCard {
    fontFamily = new FontPicker({ name: "fontFamily", displayName: "Font family", value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif" });
    itemFontSize = new NumUpDown({ name: "itemFontSize", displayName: "Dimension font size", value: 12 });
    domainFontSize = new NumUpDown({ name: "domainFontSize", displayName: "Area font size", value: 12 });
    groupFontSize = new NumUpDown({ name: "groupFontSize", displayName: "Group font size", value: 12 });
    counterFontSize = new NumUpDown({ name: "counterFontSize", displayName: "Counter font size", value: 10 });
    sectionTitleFontSize = new NumUpDown({ name: "sectionTitleFontSize", displayName: "Section title size", value: 12 });
    lineHeight = new NumUpDown({ name: "lineHeight", displayName: "Line height (%)", value: 130 });
    letterSpacing = new NumUpDown({ name: "letterSpacing", displayName: "Letter spacing (px)", value: 0 });
    itemBold = new ToggleSwitch({ name: "itemBold", displayName: "Bold dimensions", value: false });
    groupBold = new ToggleSwitch({ name: "groupBold", displayName: "Bold groups", value: true });
    areaBold = new ToggleSwitch({ name: "areaBold", displayName: "Bold areas", value: true });
    italic = new ToggleSwitch({ name: "italic", displayName: "Italic text", value: false });

    override name = "typography";
    override displayName = "Typography";
    override slices: FormattingSettingsSlice[] = [
        this.fontFamily, this.itemFontSize, this.domainFontSize, this.groupFontSize, this.counterFontSize,
        this.sectionTitleFontSize, this.lineHeight, this.letterSpacing, this.itemBold, this.groupBold, this.areaBold, this.italic
    ];
}

class SpacingCardSettings extends FormattingSettingsCard {
    rowMinHeight = new NumUpDown({ name: "rowMinHeight", displayName: "Minimum row height", value: 28 });
    verticalPadding = new NumUpDown({ name: "verticalPadding", displayName: "Vertical padding", value: 4 });
    horizontalPadding = new NumUpDown({ name: "horizontalPadding", displayName: "Horizontal padding", value: 8 });
    outerPadding = new NumUpDown({ name: "outerPadding", displayName: "Outer padding", value: 8 });
    rowGap = new NumUpDown({ name: "rowGap", displayName: "Row gap", value: 2 });
    groupGap = new NumUpDown({ name: "groupGap", displayName: "Group gap", value: 6 });
    controlGap = new NumUpDown({ name: "controlGap", displayName: "Control gap", value: 6 });
    domainIndent = new NumUpDown({ name: "domainIndent", displayName: "Group indent", value: 12 });
    itemIndent = new NumUpDown({ name: "itemIndent", displayName: "Dimension indent", value: 24 });

    override name = "spacing";
    override displayName = "Spacing and density";
    override slices: FormattingSettingsSlice[] = [
        this.rowMinHeight, this.verticalPadding, this.horizontalPadding, this.outerPadding,
        this.rowGap, this.groupGap, this.controlGap, this.domainIndent, this.itemIndent
    ];
}

class ControlsCardSettings extends FormattingSettingsCard {
    badgeSize = new NumUpDown({ name: "badgeSize", displayName: "Badge / checkbox size", value: 18 });
    buttonSize = new NumUpDown({ name: "buttonSize", displayName: "Button size", value: 22 });
    iconFontSize = new NumUpDown({ name: "iconFontSize", displayName: "Icon size", value: 12 });
    cornerRadius = new NumUpDown({ name: "cornerRadius", displayName: "Corner radius", value: 4 });
    selectedPanelPadding = new NumUpDown({ name: "selectedPanelPadding", displayName: "Selected panel padding", value: 8 });
    badgeBorderWidth = new NumUpDown({ name: "badgeBorderWidth", displayName: "Badge border width", value: 1 });

    override name = "controls";
    override displayName = "Controls";
    override slices: FormattingSettingsSlice[] = [
        this.badgeSize, this.buttonSize, this.iconFontSize, this.cornerRadius, this.selectedPanelPadding, this.badgeBorderWidth
    ];
}

class ColorsCardSettings extends FormattingSettingsCard {
    backgroundColor = new ColorPicker({ name: "backgroundColor", displayName: "Visual background", value: colorValue("#FFFFFF") });
    textColor = new ColorPicker({ name: "textColor", displayName: "Text color", value: colorValue("#212121") });
    secondaryTextColor = new ColorPicker({ name: "secondaryTextColor", displayName: "Secondary text color", value: colorValue("#6B6B6B") });
    accentColor = new ColorPicker({ name: "accentColor", displayName: "Accent color", value: colorValue("#0F6CBD") });
    selectedTextColor = new ColorPicker({ name: "selectedTextColor", displayName: "Selected badge text", value: colorValue("#FFFFFF") });
    selectedRowBackground = new ColorPicker({ name: "selectedRowBackground", displayName: "Selected row background", value: colorValue("#E5F1FB") });
    hoverBackground = new ColorPicker({ name: "hoverBackground", displayName: "Hover background", value: colorValue("#F3F3F3") });
    areaBackground = new ColorPicker({ name: "areaBackground", displayName: "Area background", value: colorValue("#FAFAFA") });
    groupBackground = new ColorPicker({ name: "groupBackground", displayName: "Group background", value: colorValue("#FFFFFF") });
    panelBackground = new ColorPicker({ name: "panelBackground", displayName: "Selected panel background", value: colorValue("#FAFAFA") });
    panelBorderColor = new ColorPicker({ name: "panelBorderColor", displayName: "Panel border color", value: colorValue("#E0E0E0") });
    badgeBorderColor = new ColorPicker({ name: "badgeBorderColor", displayName: "Badge border color", value: colorValue("#0F6CBD") });
    buttonHoverBackground = new ColorPicker({ name: "buttonHoverBackground", displayName: "Button hover background", value: colorValue("#E0E0E0") });

    override name = "colors";
    override displayName = "Colors";
    override slices: FormattingSettingsSlice[] = [
        this.backgroundColor, this.textColor, this.secondaryTextColor, this.accentColor, this.selectedTextColor,
        this.selectedRowBackground, this.hoverBackground, this.areaBackground, this.groupBackground,
        this.panelBackground, this.panelBorderColor, this.badgeBorderColor, this.buttonHoverBackground
    ];
}

class ScrollbarCardSettings extends FormattingSettingsCard {
    scrollbarWidth = new NumUpDown({ name: "scrollbarWidth", displayName: "Scrollbar width", value: 8 });
    scrollbarThumb = new ColorPicker({ name: "scrollbarThumb", displayName: "Scrollbar thumb", value: colorValue("#C2C2C2") });
    scrollbarTrack = new ColorPicker({ name: "scrollbarTrack", displayName: "Scrollbar track", value: colorValue("#F3F3F3") });
    alwaysShowScrollbar = new ToggleSwitch({ name: "alwaysShowScrollbar", displayName: "Always show vertical scrollbar", value: false });

    override name = "scrollbar";
    override displayName = "Vertical scrolling";
    override slices: FormattingSettingsSlice[] = [this.scrollbarWidth, this.scrollbarThumb, this.scrollbarTrack, this.alwaysShowScrollbar];
}

class ExpansionCardSettings extends FormattingSettingsCard {
    showToolbar = new ToggleSwitch({ name: "showToolbar", displayName: "Show expansion toolbar", value: true });
    stickyToolbar = new ToggleSwitch({ name: "stickyToolbar", displayName: "Keep toolbar visible", value: true });
    expandSelectedPaths = new ToggleSwitch({ name: "expandSelectedPaths", displayName: "Expand selected paths automatically", value: true });
    expandAllOnLoad = new ToggleSwitch({ name: "expandAllOnLoad", displayName: "Expand catalog fully on load", value: false });
    toolbarButtonSize = new NumUpDown({ name: "toolbarButtonSize", displayName: "Toolbar button size", value: 24 });
    toolbarIconSize = new NumUpDown({ name: "toolbarIconSize", displayName: "Toolbar icon size", value: 12 });
    toolbarGap = new NumUpDown({ name: "toolbarGap", displayName: "Toolbar gap", value: 6 });
    toolbarBackground = new ColorPicker({ name: "toolbarBackground", displayName: "Toolbar background", value: colorValue("#FAFAFA") });
    toolbarButtonColor = new ColorPicker({ name: "toolbarButtonColor", displayName: "Toolbar icon color", value: colorValue("#212121") });

    override name = "expansion";
    override displayName = "Expansion controls";
    override slices: FormattingSettingsSlice[] = [
        this.showToolbar, this.stickyToolbar, this.expandSelectedPaths, this.expandAllOnLoad,
        this.toolbarButtonSize, this.toolbarIconSize, this.toolbarGap, this.toolbarBackground, this.toolbarButtonColor
    ];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    behaviorCard = new BehaviorCardSettings();
    visibilityCard = new VisibilityCardSettings();
    typographyCard = new TypographyCardSettings();
    spacingCard = new SpacingCardSettings();
    controlsCard = new ControlsCardSettings();
    colorsCard = new ColorsCardSettings();
    scrollbarCard = new ScrollbarCardSettings();
    expansionCard = new ExpansionCardSettings();

    override cards = [
        this.behaviorCard,
        this.visibilityCard,
        this.typographyCard,
        this.spacingCard,
        this.controlsCard,
        this.colorsCard,
        this.scrollbarCard,
        this.expansionCard
    ];
}
