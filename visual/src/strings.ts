/*
 * User-facing strings. Values come from stringResources/<locale>/resources.resjson through the
 * host localization manager; the English fallbacks keep the visual readable if a key is missing.
 */
export const STRING_FALLBACKS = {
    Visual_Header_Title: "Dimensions",
    Visual_Reset: "Reset",
    Visual_Clear: "Clear",
    Visual_Instructions: "Click order defines the dimension order in the matrix.",
    Visual_Empty: "Add a Field Parameter column to the Field Parameter field well. Area and Group are optional.",
    Visual_SelectedPanel_Title: "Matrix order",
    Visual_Catalog_Title: "Catalog",
    Visual_MustKeepOne: "At least one dimension must remain selected.",
    Visual_MoveUp: "Move up",
    Visual_MoveDown: "Move down",
    Visual_Remove: "Remove",
    Visual_Toolbar_CollapseAll: "Collapse all",
    Visual_Toolbar_ShowAreas: "Show areas",
    Visual_Toolbar_ShowAreasAndGroups: "Show areas and groups",
    Visual_Toolbar_ExpandAll: "Expand all",
} as const;

export type StringKey = keyof typeof STRING_FALLBACKS;
export type Strings = Readonly<Record<StringKey, string>>;

export interface DisplayNameSource {
    getDisplayName(key: string): string;
}

export function loadStrings(source: DisplayNameSource | undefined): Strings {
    const entries = (Object.keys(STRING_FALLBACKS) as StringKey[]).map((key) => {
        const localized = source?.getDisplayName(key);
        return [key, localized && localized !== key ? localized : STRING_FALLBACKS[key]] as const;
    });
    return Object.fromEntries(entries) as Strings;
}
