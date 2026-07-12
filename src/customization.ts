import { desktop, isDesktop } from "./desktop";

export type DraftwellEventName = "ready" | "statechange" | "customizationerror";

export interface DraftwellDocumentState {
  id: string;
  name: string;
  path: string | null;
  source: string;
  format: "markdown" | "html";
  dirty: boolean;
}

export interface DraftwellState {
  theme: "light" | "dark";
  viewMode: "write" | "split" | "preview";
  syncScroll: boolean;
  activeDocument: DraftwellDocumentState | null;
  documents: DraftwellDocumentState[];
}

export interface DraftwellCustomizationApi {
  readonly version: 1;
  getState(): DraftwellState;
  on(name: DraftwellEventName | string, listener: (detail: any) => void): () => void;
  emit(name: string, detail?: unknown): void;
  commands: {
    setTheme(theme: "light" | "dark"): void;
    setViewMode(mode: "write" | "split" | "preview"): void;
    setSyncScroll(enabled: boolean): void;
    setActiveDocument(id: string): void;
    setDocumentSource(source: string, id?: string): void;
    replaceSelection(text: string): void;
    newFile(): void;
    openFiles(): void;
    closeDocument(id?: string): void;
    save(): void;
    saveAs(): void;
    getToolbarCommands(): string[];
    setToolbarOrder(commands: string[]): void;
    resetToolbarOrder(): void;
    reloadCustomizations(): Promise<string | null>;
    openCustomizationsFolder(): Promise<string | null>;
  };
}

declare global {
  interface Window {
    draftwell: DraftwellCustomizationApi;
  }
}

const TOOLBAR_ORDER_STYLE_ID = "draftwell-custom-toolbar-order";

function getToolbarCommands() {
  return Array.from(document.querySelectorAll<HTMLElement>(".format-actions [data-toolbar-command]"))
    .map((element) => element.dataset.toolbarCommand!)
    .filter((command, index, commands) => commands.indexOf(command) === index);
}

function resetToolbarOrder() {
  document.getElementById(TOOLBAR_ORDER_STYLE_ID)?.remove();
}

function setToolbarOrder(commands: string[]) {
  const uniqueCommands = commands.filter((command, index) =>
    /^[a-z0-9-]+$/.test(command) && commands.indexOf(command) === index
  );
  resetToolbarOrder();
  const style = document.createElement("style");
  style.id = TOOLBAR_ORDER_STYLE_ID;
  style.textContent = [
    ".format-actions > [data-toolbar-command] { order: 10000; }",
    ".format-actions > .toolbar-divider { display: none; }",
    ...uniqueCommands.map((command, index) =>
      `.format-actions > [data-toolbar-command="${command}"] { order: ${index}; }`
    )
  ].join("\n");
  document.head.append(style);
}

function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(`draftwell:${name}`, { detail }));
}

export function createCustomizationApi(
  getState: () => DraftwellState,
  commands: Omit<
    DraftwellCustomizationApi["commands"],
    "getToolbarCommands" | "setToolbarOrder" | "resetToolbarOrder" | "reloadCustomizations" | "openCustomizationsFolder"
  >
): DraftwellCustomizationApi {
  const api: DraftwellCustomizationApi = {
    version: 1,
    getState,
    on(name, listener) {
      const eventName = `draftwell:${name}`;
      const handler = (event: Event) => listener((event as CustomEvent).detail);
      window.addEventListener(eventName, handler);
      return () => window.removeEventListener(eventName, handler);
    },
    emit,
    commands: {
      ...commands,
      getToolbarCommands,
      setToolbarOrder,
      resetToolbarOrder,
      reloadCustomizations: () => applyCustomizations(api),
      async openCustomizationsFolder() {
        if (!isDesktop) return null;
        return desktop.openCustomizationsFolder();
      }
    }
  };
  window.draftwell = api;
  return api;
}

export async function applyCustomizations(api: DraftwellCustomizationApi): Promise<string | null> {
  if (!isDesktop) return null;

  const sources = await desktop.loadCustomizations();
  let style = document.querySelector<HTMLStyleElement>("#draftwell-custom-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "draftwell-custom-css";
    document.head.append(style);
  }
  style.textContent = sources.css;

  resetToolbarOrder();
  await desktop.executeCustomization(
    sources.javascript,
    `${sources.directory.replaceAll("\\", "/")}/custom.js`
  );

  emit("ready", { directory: sources.directory, state: api.getState() });
  return sources.directory;
}

export function emitDraftwellState(state: DraftwellState) {
  emit("statechange", { state });
}
