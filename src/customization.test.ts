// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createCustomizationApi, emitDraftwellState, type DraftwellState } from "./customization";

const state: DraftwellState = {
  theme: "dark",
  viewMode: "split",
  syncScroll: true,
  activeDocument: null,
  documents: []
};

describe("customization API", () => {
  it("exposes state, commands, and lifecycle events", () => {
    const setTheme = vi.fn();
    const api = createCustomizationApi(() => state, {
      setTheme,
      setViewMode: vi.fn(),
      setSyncScroll: vi.fn(),
      setActiveDocument: vi.fn(),
      setDocumentSource: vi.fn(),
      replaceSelection: vi.fn(),
      newFile: vi.fn(),
      openFiles: vi.fn(),
      closeDocument: vi.fn(),
      save: vi.fn(),
      saveAs: vi.fn()
    });

    expect(window.draftwell).toBe(api);
    expect(api.getState()).toBe(state);
    api.commands.setTheme("light");
    expect(setTheme).toHaveBeenCalledWith("light");

    const listener = vi.fn();
    const off = api.on("statechange", listener);
    emitDraftwellState(state);
    expect(listener).toHaveBeenCalledWith({ state });
    off();
    emitDraftwellState(state);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("applies a persistent toolbar order by stable command id", () => {
    document.body.innerHTML = `
      <div class="format-actions">
        <button data-toolbar-command="heading-1"></button>
        <span class="toolbar-divider"></span>
        <button data-toolbar-command="bold"></button>
        <button data-toolbar-command="italic"></button>
      </div>`;
    const api = createCustomizationApi(() => state, {
      setTheme: vi.fn(),
      setViewMode: vi.fn(),
      setSyncScroll: vi.fn(),
      setActiveDocument: vi.fn(),
      setDocumentSource: vi.fn(),
      replaceSelection: vi.fn(),
      newFile: vi.fn(),
      openFiles: vi.fn(),
      closeDocument: vi.fn(),
      save: vi.fn(),
      saveAs: vi.fn()
    });

    expect(api.commands.getToolbarCommands()).toEqual(["heading-1", "bold", "italic"]);
    api.commands.setToolbarOrder(["bold", "italic", "bold", "not valid"]);
    const css = document.querySelector("#draftwell-custom-toolbar-order")?.textContent;
    expect(css).toContain('[data-toolbar-command="bold"] { order: 0; }');
    expect(css).toContain('[data-toolbar-command="italic"] { order: 1; }');
    expect(css).not.toContain("not valid");

    api.commands.resetToolbarOrder();
    expect(document.querySelector("#draftwell-custom-toolbar-order")).toBeNull();
  });
});
