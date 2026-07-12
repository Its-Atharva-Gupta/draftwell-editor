export type PreviewFont = "serif" | "sans" | "mono";
export type ToolbarPreset = "default" | "writing" | "technical";

export interface CustomizationPreferences {
  accentColor: string;
  editorFontSize: number;
  previewFontSize: number;
  lineHeight: number;
  editorWidth: number;
  previewWidth: number;
  previewFont: PreviewFont;
  toolbarPreset: ToolbarPreset;
}

export const DEFAULT_CUSTOMIZATION_PREFERENCES: CustomizationPreferences = {
  accentColor: "#b94a2e",
  editorFontSize: 15,
  previewFontSize: 17,
  lineHeight: 1.72,
  editorWidth: 800,
  previewWidth: 740,
  previewFont: "serif",
  toolbarPreset: "default"
};

const TOOLBAR_PRESET_ORDERS: Record<Exclude<ToolbarPreset, "default">, Record<string, number>> = {
  writing: {
    bold: 1,
    italic: 2,
    link: 3,
    image: 4,
    "heading-1": 10,
    "heading-2": 10,
    "heading-3": 10,
    "heading-4": 10,
    "heading-5": 10,
    "heading-6": 10,
    "bulleted-list": 20,
    "numbered-list": 21,
    "task-list": 22,
    blockquote: 23
  },
  technical: {
    "inline-code": 1,
    "code-block": 2,
    "inline-equation": 3,
    "display-equation": 4,
    "heading-1": 10,
    "heading-2": 10,
    "heading-3": 10,
    "heading-4": 10,
    "heading-5": 10,
    "heading-6": 10,
    bold: 20,
    italic: 21,
    link: 22
  }
};

export function getToolbarPresetStyles(preset: ToolbarPreset) {
  if (preset === "default") return "";
  const scope = `.desktop-app[data-toolbar-preset="${preset}"] .format-actions`;
  return [
    `${scope} > [data-toolbar-command] { order: 100; }`,
    `${scope} > .toolbar-divider { display: none; }`,
    ...Object.entries(TOOLBAR_PRESET_ORDERS[preset]).map(([command, order]) =>
      `${scope} > [data-toolbar-command="${command}"] { order: ${order}; }`
    )
  ].join("\n");
}

const STORAGE_KEY = "draftwell.customization.v1";

function bounded(value: unknown, minimum: number, maximum: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

export function normalizeCustomizationPreferences(value: unknown): CustomizationPreferences {
  const input = value && typeof value === "object" ? value as Partial<CustomizationPreferences> : {};
  const defaults = DEFAULT_CUSTOMIZATION_PREFERENCES;
  return {
    accentColor: typeof input.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(input.accentColor)
      ? input.accentColor
      : defaults.accentColor,
    editorFontSize: bounded(input.editorFontSize, 12, 24, defaults.editorFontSize),
    previewFontSize: bounded(input.previewFontSize, 13, 28, defaults.previewFontSize),
    lineHeight: bounded(input.lineHeight, 1.2, 2.2, defaults.lineHeight),
    editorWidth: bounded(input.editorWidth, 520, 1200, defaults.editorWidth),
    previewWidth: bounded(input.previewWidth, 520, 1200, defaults.previewWidth),
    previewFont: input.previewFont === "sans" || input.previewFont === "mono" || input.previewFont === "serif"
      ? input.previewFont
      : defaults.previewFont,
    toolbarPreset: input.toolbarPreset === "writing" || input.toolbarPreset === "technical" || input.toolbarPreset === "default"
      ? input.toolbarPreset
      : defaults.toolbarPreset
  };
}

export function loadCustomizationPreferences(): CustomizationPreferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeCustomizationPreferences(JSON.parse(stored)) : { ...DEFAULT_CUSTOMIZATION_PREFERENCES };
  } catch {
    return { ...DEFAULT_CUSTOMIZATION_PREFERENCES };
  }
}

export function saveCustomizationPreferences(preferences: CustomizationPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCustomizationPreferences(preferences)));
}
