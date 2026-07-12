// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZATION_PREFERENCES,
  getToolbarPresetStyles,
  loadCustomizationPreferences,
  normalizeCustomizationPreferences,
  saveCustomizationPreferences
} from "./preferences";

describe("GUI customization preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("normalizes invalid and out-of-range values", () => {
    expect(normalizeCustomizationPreferences({
      accentColor: "red",
      editorFontSize: 99,
      previewFontSize: 4,
      lineHeight: 1.8,
      editorWidth: 900,
      previewFont: "comic",
      toolbarPreset: "technical"
    })).toEqual({
      ...DEFAULT_CUSTOMIZATION_PREFERENCES,
      editorFontSize: 24,
      previewFontSize: 13,
      lineHeight: 1.8,
      editorWidth: 900,
      toolbarPreset: "technical"
    });
  });

  it("round-trips saved preferences", () => {
    const preferences = { ...DEFAULT_CUSTOMIZATION_PREFERENCES, accentColor: "#7357ff", previewFont: "sans" as const };
    saveCustomizationPreferences(preferences);
    expect(loadCustomizationPreferences()).toEqual(preferences);
  });

  it("generates deterministic scoped toolbar preset orders", () => {
    expect(getToolbarPresetStyles("default")).toBe("");
    expect(getToolbarPresetStyles("writing")).toContain('[data-toolbar-command="bold"] { order: 1; }');
    expect(getToolbarPresetStyles("technical")).toContain('[data-toolbar-command="code-block"] { order: 2; }');
  });
});
