// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { ONBOARDING_STORAGE_KEY } from "./lib/onboarding";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setScrollMetrics(element: HTMLElement, scrollHeight: number, clientHeight: number) {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: scrollHeight },
    clientHeight: { configurable: true, value: clientHeight }
  });
}

async function clickButton(name: string) {
  const button = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === name);
  expect(button).toBeInstanceOf(HTMLButtonElement);
  await act(async () => { button!.click(); });
}

describe("split scroll modes", () => {
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    window.localStorage.clear();
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("synchronizes both pane directions only in Sync mode", async () => {
    const root = createRoot(document.getElementById("root")!);
    await act(async () => { root.render(<App />); });
    await clickButton("New file");
    await clickButton("Sync");

    const source = document.querySelector<HTMLElement>(".cm-scroller")!;
    const sourcePane = document.querySelector<HTMLElement>(".source-pane")!;
    const preview = document.querySelector<HTMLElement>(".preview-pane")!;
    setScrollMetrics(source, 1000, 200);
    setScrollMetrics(sourcePane, 600, 200);
    setScrollMetrics(preview, 1800, 200);

    sourcePane.scrollTop = 100;
    await act(async () => { sourcePane.dispatchEvent(new Event("scroll")); });
    expect(preview.scrollTop).toBe(400);
    await act(async () => { preview.dispatchEvent(new Event("scroll")); });

    source.scrollTop = 200;
    await act(async () => { source.dispatchEvent(new Event("scroll")); });
    expect(preview.scrollTop).toBe(400);
    source.scrollTop = 240;
    await act(async () => { source.dispatchEvent(new Event("scroll")); });
    source.scrollTop = 320;
    await act(async () => { source.dispatchEvent(new Event("scroll")); });
    expect(preview.scrollTop).toBe(640);
    await act(async () => { preview.dispatchEvent(new Event("scroll")); });
    expect(source.scrollTop).toBe(320);

    preview.dispatchEvent(new Event("wheel"));
    preview.scrollTop = 800;
    await act(async () => { preview.dispatchEvent(new Event("scroll")); });
    expect(source.scrollTop).toBe(400);

    await clickButton("Free");
    source.scrollTop = 600;
    await act(async () => { source.dispatchEvent(new Event("scroll")); });
    expect(preview.scrollTop).toBe(800);

    await act(async () => { root.unmount(); });
  });

  it("opens and closes the GUI customization panel", async () => {
    const root = createRoot(document.getElementById("root")!);
    await act(async () => { root.render(<App />); });

    const customize = document.querySelector<HTMLButtonElement>('[aria-label="Customize Draftwell"]');
    expect(customize).toBeInstanceOf(HTMLButtonElement);
    await act(async () => { customize!.click(); });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[type="color"]')?.value).toBe("#b94a2e");

    const close = document.querySelector<HTMLButtonElement>('[aria-label="Close customization panel"]');
    await act(async () => { close!.click(); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => { root.unmount(); });
  });

  it("applies the selected toolbar preset order", async () => {
    const root = createRoot(document.getElementById("root")!);
    await act(async () => { root.render(<App />); });
    await clickButton("New file");

    const customize = document.querySelector<HTMLButtonElement>('[aria-label="Customize Draftwell"]')!;
    await act(async () => { customize.click(); });
    const writing = Array.from(document.querySelectorAll<HTMLLabelElement>(".toolbar-preset-options label"))
      .find((label) => label.textContent?.includes("Writing"))!;
    await act(async () => { writing.querySelector<HTMLInputElement>("input")!.click(); });

    expect(document.querySelector(".desktop-app")?.getAttribute("data-toolbar-preset")).toBe("writing");
    const presetStyles = document.querySelector("#draftwell-gui-toolbar-order")?.textContent;
    expect(presetStyles).toContain('[data-toolbar-command="bold"] { order: 1; }');
    expect(presetStyles).toContain('[data-toolbar-command="italic"] { order: 2; }');
    expect(presetStyles).toContain('[data-toolbar-command="link"] { order: 3; }');

    await act(async () => { root.unmount(); });
  });

  it("shows the tutorial only on first launch and persists completion", async () => {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    const root = createRoot(document.getElementById("root")!);
    await act(async () => { root.render(<App />); });

    expect(document.querySelector("#onboarding-title")?.textContent).toContain("Write without getting in your way");
    for (let step = 0; step < 4; step += 1) await clickButton("Next");
    await clickButton("Start writing");
    expect(document.querySelector("#onboarding-title")).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe("true");

    await act(async () => { root.unmount(); });
    const secondRoot = createRoot(document.getElementById("root")!);
    await act(async () => { secondRoot.render(<App />); });
    expect(document.querySelector("#onboarding-title")).toBeNull();
    await act(async () => { secondRoot.unmount(); });
  });
});
