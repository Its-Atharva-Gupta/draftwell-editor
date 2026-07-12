import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, type CloseRequestedEvent } from "@tauri-apps/api/window";

export interface DesktopDocument {
  path: string;
  name: string;
  content: string;
}

export interface SavedFile {
  path: string;
  name: string;
}

export type CloseDecision = "save" | "discard" | "cancel";

export interface CustomizationSources {
  directory: string;
  css: string;
  javascript: string;
}

export const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const desktop = {
  openFiles: () => invoke<DesktopDocument[]>("open_documents"),
  readFile: (path: string) => invoke<DesktopDocument>("read_document", { path }),
  startupFiles: () => invoke<DesktopDocument[]>("startup_documents"),
  saveFile: (path: string, content: string) => invoke<SavedFile>("save_document", { path, content }),
  saveFileAs: (suggestedName: string, content: string) =>
    invoke<SavedFile | null>("save_document_as", { suggestedName, content }),
  confirmDiscardChanges: () => invoke<boolean>("confirm_discard"),
  confirmClose: (fileName: string) => invoke<CloseDecision>("confirm_close", { fileName }),
  setTitle: (title: string, dirty: boolean) => invoke<void>("set_window_title", { title, dirty }),
  loadCustomizations: () => invoke<CustomizationSources>("load_customizations"),
  executeCustomization: (javascript: string, sourceUrl: string) =>
    invoke<void>("execute_customization", { javascript, sourceUrl }),
  openCustomizationsFolder: () => invoke<string>("open_customizations_folder"),
  forceClose: () => invoke<void>("force_close"),
  onExternalOpen: (callback: (path: string) => void): Promise<UnlistenFn> =>
    listen<string>("file-open-request", (event) => callback(event.payload)),
  onCloseRequested: (callback: (event: CloseRequestedEvent) => void): Promise<UnlistenFn> =>
    getCurrentWindow().onCloseRequested(callback),
  onFileDrop: (callback: (type: "enter" | "over" | "drop" | "leave", paths: string[]) => void): Promise<UnlistenFn> =>
    getCurrentWebviewWindow().onDragDropEvent((event) => {
      if (event.payload.type === "drop") callback("drop", event.payload.paths);
      else callback(event.payload.type, []);
    })
};
