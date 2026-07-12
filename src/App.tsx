import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { html as htmlLanguage } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  Bold,
  Check,
  CircleHelp,
  Code2,
  CodeXml,
  ExternalLink,
  FileDown,
  FileCode2,
  FileText,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  Italic,
  Link,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Moon,
  Paintbrush,
  Plus,
  Quote,
  Sigma,
  Save,
  Strikethrough,
  Sun,
  Table2,
  Unlink2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { desktop, isDesktop, type DesktopDocument } from "./desktop";
import CustomizationPanel from "./CustomizationPanel";
import OnboardingTutorial from "./OnboardingTutorial";
import {
  applyCustomizations,
  createCustomizationApi,
  emitDraftwellState,
  type DraftwellCustomizationApi,
  type DraftwellState
} from "./customization";
import { getDocumentStats, renderHtml, renderMarkdown, toggleTaskAtIndex } from "./lib/markdown";
import { getSyncedScrollTop } from "./lib/scrollSync";
import {
  getToolbarPresetStyles,
  loadCustomizationPreferences,
  saveCustomizationPreferences,
  type CustomizationPreferences
} from "./lib/preferences";
import { completeOnboarding, hasCompletedOnboarding } from "./lib/onboarding";

type ViewMode = "write" | "split" | "preview";
type SaveState = "idle" | "saving" | "saved" | "error";
type DocumentFormat = "markdown" | "html";

const previewFontFamilies = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
};

interface OpenDocument {
  id: string;
  path: string | null;
  name: string;
  source: string;
  savedSource: string;
  saveState: SaveState;
  format: DocumentFormat;
}

function formatForName(name: string): DocumentFormat {
  return /\.html?$/i.test(name) ? "html" : "markdown";
}

function fromDesktopDocument(document: DesktopDocument): OpenDocument {
  return {
    id: crypto.randomUUID(),
    path: document.path,
    name: document.name,
    source: document.content,
    savedSource: document.content,
    saveState: "idle",
    format: formatForName(document.name)
  };
}

function App() {
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [syncScroll, setSyncScroll] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasCompletedOnboarding());
  const [customizationPreferences, setCustomizationPreferences] = useState<CustomizationPreferences>(loadCustomizationPreferences);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const sourcePaneRef = useRef<HTMLElement>(null);
  const previewPaneRef = useRef<HTMLElement>(null);
  const documentsRef = useRef(documents);
  const previewSaveQueues = useRef(new Map<string, Promise<void>>());
  const activeScrollPane = useRef<"source" | "preview" | null>(null);
  const activeScrollTimer = useRef<number | null>(null);
  const customizationApiRef = useRef<DraftwellCustomizationApi | null>(null);
  const customizationStateRef = useRef<DraftwellState>({
    theme: "light",
    viewMode: "split",
    syncScroll: false,
    activeDocument: null,
    documents: []
  });

  const activeDocument = documents.find((document) => document.id === activeId) ?? null;
  const activeDirty = activeDocument ? activeDocument.source !== activeDocument.savedSource : false;
  const rendered = useMemo(() => activeDocument?.format === "html"
    ? renderHtml(activeDocument.source)
    : renderMarkdown(activeDocument?.source ?? ""), [activeDocument?.source, activeDocument?.format]);
  const stats = useMemo(() => getDocumentStats(activeDocument?.source ?? ""), [activeDocument?.source]);
  const pathParts = activeDocument?.path?.split(/[\\/]/).filter(Boolean) ?? [];
  const customizationDocuments = documents.map((document) => ({
    id: document.id,
    name: document.name,
    path: document.path,
    source: document.source,
    format: document.format,
    dirty: document.source !== document.savedSource
  }));
  customizationStateRef.current = {
    theme,
    viewMode,
    syncScroll,
    activeDocument: customizationDocuments.find((document) => document.id === activeId) ?? null,
    documents: customizationDocuments
  };

  useEffect(() => { documentsRef.current = documents; }, [documents]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { saveCustomizationPreferences(customizationPreferences); }, [customizationPreferences]);
  useEffect(() => {
    if (isDesktop) void desktop.setTitle(activeDocument?.name ?? "Draftwell", activeDirty);
  }, [activeDocument?.name, activeDirty]);

  const syncPaneScroll = useCallback((
    from: HTMLElement,
    to: HTMLElement,
    fromPane: "source" | "preview"
  ) => {
    if (!syncScroll || viewMode !== "split") return;
    if (activeScrollPane.current && activeScrollPane.current !== fromPane) return;
    to.scrollTop = getSyncedScrollTop(from, to);
  }, [syncScroll, viewMode]);

  useEffect(() => {
    if (!syncScroll || viewMode !== "split") {
      activeScrollPane.current = null;
      return;
    }

    const sourcePane = sourcePaneRef.current;
    const previewScroller = previewPaneRef.current;
    if (!sourcePane || !previewScroller) return;

    const getSourceScroller = () => {
      const editorScroller = editorRef.current?.view?.scrollDOM;
      if (editorScroller && editorScroller.scrollHeight > editorScroller.clientHeight) return editorScroller;
      return sourcePane;
    };
    const markActive = (pane: "source" | "preview") => {
      activeScrollPane.current = pane;
      if (activeScrollTimer.current !== null) {
        window.clearTimeout(activeScrollTimer.current);
      }
      activeScrollTimer.current = window.setTimeout(() => {
        activeScrollPane.current = null;
        activeScrollTimer.current = null;
      }, 160);
    };
    const handleSourceScroll = (event: Event) => {
      const scroller = event.target;
      if (scroller instanceof HTMLElement && sourcePane.contains(scroller)) {
        if (activeScrollPane.current === null) markActive("source");
        if (activeScrollPane.current === "source") {
          markActive("source");
          syncPaneScroll(scroller, previewScroller, "source");
        }
      }
    };
    const handlePreviewScroll = () => {
      if (activeScrollPane.current === null) markActive("preview");
      if (activeScrollPane.current === "preview") {
        markActive("preview");
        syncPaneScroll(previewScroller, getSourceScroller(), "preview");
      }
    };
    const activateSource = () => markActive("source");
    const activatePreview = () => markActive("preview");

    sourcePane.addEventListener("wheel", activateSource, { capture: true, passive: true });
    sourcePane.addEventListener("pointerdown", activateSource, { capture: true, passive: true });
    sourcePane.addEventListener("touchstart", activateSource, { capture: true, passive: true });
    sourcePane.addEventListener("scroll", handleSourceScroll, { capture: true, passive: true });
    previewScroller.addEventListener("wheel", activatePreview, { passive: true });
    previewScroller.addEventListener("pointerdown", activatePreview, { passive: true });
    previewScroller.addEventListener("touchstart", activatePreview, { passive: true });
    previewScroller.addEventListener("scroll", handlePreviewScroll, { passive: true });

    return () => {
      sourcePane.removeEventListener("wheel", activateSource, { capture: true });
      sourcePane.removeEventListener("pointerdown", activateSource, { capture: true });
      sourcePane.removeEventListener("touchstart", activateSource, { capture: true });
      sourcePane.removeEventListener("scroll", handleSourceScroll, { capture: true });
      previewScroller.removeEventListener("wheel", activatePreview);
      previewScroller.removeEventListener("pointerdown", activatePreview);
      previewScroller.removeEventListener("touchstart", activatePreview);
      previewScroller.removeEventListener("scroll", handlePreviewScroll);
      if (activeScrollTimer.current !== null) {
        window.clearTimeout(activeScrollTimer.current);
      }
      activeScrollTimer.current = null;
      activeScrollPane.current = null;
    };
  }, [activeId, syncPaneScroll, syncScroll, viewMode]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  }, []);

  const updateDocument = useCallback((id: string, patch: Partial<OpenDocument>) => {
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, ...patch } : document));
  }, []);

  const addDocument = useCallback((incoming: DesktopDocument) => {
    const existing = documentsRef.current.find((document) => document.path === incoming.path);
    if (existing) {
      setActiveId(existing.id);
      return existing.id;
    }
    const document = fromDesktopDocument(incoming);
    setDocuments((current) => [...current, document]);
    setActiveId(document.id);
    window.setTimeout(() => editorRef.current?.view?.focus(), 40);
    return document.id;
  }, []);

  const handleNew = useCallback(() => {
    const untitledCount = documentsRef.current.filter((document) => !document.path).length;
    const document: OpenDocument = {
      id: crypto.randomUUID(),
      path: null,
      name: `Untitled${untitledCount ? ` ${untitledCount + 1}` : ""}.md`,
      source: "",
      savedSource: "",
      saveState: "idle",
      format: "markdown"
    };
    setDocuments((current) => [...current, document]);
    setActiveId(document.id);
    window.setTimeout(() => editorRef.current?.view?.focus(), 40);
  }, []);

  const handleOpen = useCallback(async () => {
    if (!isDesktop) {
      showNotice("Run npm run tauri:dev to open files from disk");
      return;
    }
    try {
      const opened = await desktop.openFiles();
      opened.forEach(addDocument);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  }, [addDocument, showNotice]);

  const saveDocument = useCallback(async (id: string, forceSaveAs = false) => {
    if (!isDesktop) return false;
    const document = documentsRef.current.find((candidate) => candidate.id === id);
    if (!document) return false;
    const sourceAtSave = document.source;
    updateDocument(id, { saveState: "saving" });

    try {
      const result = !document.path || forceSaveAs
        ? await desktop.saveFileAs(document.name, sourceAtSave)
        : await desktop.saveFile(document.path, sourceAtSave);
      if (!result) {
        updateDocument(id, { saveState: "idle" });
        return false;
      }
      setDocuments((current) => current.map((candidate) => candidate.id === id ? {
        ...candidate,
        path: result.path,
        name: result.name,
        format: formatForName(result.name),
        savedSource: sourceAtSave,
        saveState: "saved"
      } : candidate));
      showNotice(forceSaveAs || !document.path ? "Saved to disk" : "Saved");
      return true;
    } catch (error) {
      updateDocument(id, { saveState: "error" });
      showNotice(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [showNotice, updateDocument]);

  const removeDocument = useCallback((id: string) => {
    setDocuments((current) => {
      const index = current.findIndex((document) => document.id === id);
      const next = current.filter((document) => document.id !== id);
      if (activeId === id) setActiveId(next[Math.min(index, next.length - 1)]?.id ?? null);
      return next;
    });
  }, [activeId]);

  const closeDocument = useCallback(async (id: string) => {
    const document = documentsRef.current.find((candidate) => candidate.id === id);
    if (!document) return;
    if (document.source !== document.savedSource) {
      const decision = await desktop.confirmClose(document.name);
      if (decision === "cancel") return;
      if (decision === "save" && !(await saveDocument(id))) return;
    }
    removeDocument(id);
  }, [removeDocument, saveDocument]);

  const convertActiveDocument = useCallback(async () => {
    const document = documentsRef.current.find((candidate) => candidate.id === activeId);
    if (!document) return;
    const { htmlToMarkdown, markdownToHtml } = await import("./lib/conversion");
    const baseName = document.name.replace(/\.(md|markdown|mdown|mkd|txt|html|htm)$/i, "") || "Converted";
    const format: DocumentFormat = document.format === "markdown" ? "html" : "markdown";
    const source = format === "html"
      ? markdownToHtml(document.source, baseName)
      : htmlToMarkdown(document.source);
    const converted: OpenDocument = {
      id: crypto.randomUUID(),
      path: null,
      name: `${baseName}.${format === "html" ? "html" : "md"}`,
      source,
      savedSource: "",
      saveState: "idle",
      format
    };
    setDocuments((current) => [...current, converted]);
    setActiveId(converted.id);
    showNotice(`Converted to ${format === "html" ? "HTML" : "Markdown"}`);
  }, [activeId, showNotice]);

  useEffect(() => {
    if (!isDesktop) return;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void desktop.startupFiles().then((startupDocuments) => {
      if (!disposed) startupDocuments.forEach(addDocument);
    });
    void desktop.onExternalOpen(async (path) => {
      try { addDocument(await desktop.readFile(path)); }
      catch (error) { showNotice(error instanceof Error ? error.message : String(error)); }
    }).then((unlisten) => disposed ? unlisten() : unlisteners.push(unlisten));
    void desktop.onFileDrop(async (type, paths) => {
      setDragging(type === "enter" || type === "over");
      if (type !== "drop") return;
      for (const path of paths) {
        try { addDocument(await desktop.readFile(path)); }
        catch (error) { showNotice(error instanceof Error ? error.message : String(error)); }
      }
    }).then((unlisten) => disposed ? unlisten() : unlisteners.push(unlisten));
    void desktop.onCloseRequested((event) => {
      event.preventDefault();
      void (async () => {
        const dirtyDocuments = documentsRef.current.filter((document) => document.source !== document.savedSource);
        for (const document of dirtyDocuments) {
          setActiveId(document.id);
          const decision = await desktop.confirmClose(document.name);
          if (decision === "cancel") return;
          if (decision === "save" && !(await saveDocument(document.id))) return;
        }
        await desktop.forceClose();
      })();
    }).then((unlisten) => disposed ? unlisten() : unlisteners.push(unlisten));

    return () => { disposed = true; unlisteners.forEach((unlisten) => unlisten()); };
  }, [addDocument, saveDocument, showNotice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (activeId) void saveDocument(activeId, event.shiftKey);
      }
      if (modifier && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void handleOpen();
      }
      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNew();
      }
      if (modifier && event.key.toLowerCase() === "w" && activeId) {
        event.preventDefault();
        void closeDocument(activeId);
      }
      if (modifier && event.key === "Tab" && documentsRef.current.length > 1) {
        event.preventDefault();
        const index = documentsRef.current.findIndex((document) => document.id === activeId);
        const direction = event.shiftKey ? -1 : 1;
        const next = (index + direction + documentsRef.current.length) % documentsRef.current.length;
        setActiveId(documentsRef.current[next].id);
      }
      if (modifier && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        setViewMode(event.key === "1" ? "write" : event.key === "2" ? "split" : "preview");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeId, closeDocument, handleNew, handleOpen, saveDocument]);

  const insertMarkup = (before: string, after = before, placeholder = "text") => {
    const view = editorRef.current?.view;
    if (!view) return;
    const range = view.state.selection.main;
    const selected = view.state.sliceDoc(range.from, range.to) || placeholder;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `${before}${selected}${after}` },
      selection: { anchor: range.from + before.length, head: range.from + before.length + selected.length }
    });
    view.focus();
  };

  const prefixSelectedLines = (prefix: string, placeholder = "text") => {
    const view = editorRef.current?.view;
    if (!view) return;
    const range = view.state.selection.main;
    const startLine = view.state.doc.lineAt(range.from);
    const endLine = view.state.doc.lineAt(range.to);
    const selected = view.state.sliceDoc(startLine.from, endLine.to) || placeholder;
    const replacement = selected.split("\n").map((line) => `${prefix}${line}`).join("\n");
    view.dispatch({ changes: { from: startLine.from, to: endLine.to, insert: replacement } });
    view.focus();
  };

  const setHeading = (level: number) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const range = view.state.selection.main;
    const line = view.state.doc.lineAt(range.from);
    const content = line.text.replace(/^#{1,6}\s+/, "") || "Heading";
    view.dispatch({ changes: { from: line.from, to: line.to, insert: `${"#".repeat(level)} ${content}` } });
    view.focus();
  };

  const insertBlock = (content: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const range = view.state.selection.main;
    const wrapsSelection = content.includes("$SELECTION");
    const selected = view.state.sliceDoc(range.from, range.to) || "content";
    view.dispatch({
      changes: {
        from: wrapsSelection ? range.from : range.to,
        to: range.to,
        insert: wrapsSelection ? content.replace("$SELECTION", selected) : content
      }
    });
    view.focus();
  };

  const savePreviewTaskChange = useCallback((document: OpenDocument, source: string) => {
    if (!isDesktop || !document.path) return;
    updateDocument(document.id, { saveState: "saving" });

    const previous = previewSaveQueues.current.get(document.id) ?? Promise.resolve();
    const queued = previous.catch(() => undefined).then(async () => {
      try {
        await desktop.saveFile(document.path!, source);
        setDocuments((current) => current.map((candidate) => candidate.id === document.id ? {
          ...candidate,
          savedSource: source,
          saveState: candidate.source === source ? "saved" : "idle"
        } : candidate));
      } catch (error) {
        updateDocument(document.id, { saveState: "error" });
        showNotice(error instanceof Error ? error.message : String(error));
      }
    });

    previewSaveQueues.current.set(document.id, queued);
    void queued.finally(() => {
      if (previewSaveQueues.current.get(document.id) === queued) {
        previewSaveQueues.current.delete(document.id);
      }
    });
  }, [showNotice, updateDocument]);

  const handlePreviewChange = (event: React.ChangeEvent<HTMLElement>) => {
    const checkbox = event.target as HTMLInputElement;
    if (!activeDocument || activeDocument.format !== "markdown" || !checkbox.matches('input[type="checkbox"]')) return;
    const checkboxes = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    const index = checkboxes.indexOf(checkbox);
    if (index < 0) return;
    const source = toggleTaskAtIndex(activeDocument.source, index, checkbox.checked);
    updateDocument(activeDocument.id, {
      source,
      saveState: "idle"
    });
    savePreviewTaskChange(activeDocument, source);
  };

  useEffect(() => {
    const api = createCustomizationApi(
      () => customizationStateRef.current,
      {
        setTheme(nextTheme) { setTheme(nextTheme); },
        setViewMode(mode) { setViewMode(mode); },
        setSyncScroll(enabled) { setSyncScroll(enabled); },
        setActiveDocument(id) {
          if (documentsRef.current.some((document) => document.id === id)) setActiveId(id);
        },
        setDocumentSource(source, id) {
          const documentId = id ?? customizationStateRef.current.activeDocument?.id;
          if (documentId) updateDocument(documentId, { source, saveState: "idle" });
        },
        replaceSelection(text) {
          const view = editorRef.current?.view;
          if (view) view.dispatch(view.state.replaceSelection(text));
        },
        newFile: handleNew,
        openFiles() { void handleOpen(); },
        closeDocument(id) {
          const documentId = id ?? customizationStateRef.current.activeDocument?.id;
          if (documentId) void closeDocument(documentId);
        },
        save() {
          const id = customizationStateRef.current.activeDocument?.id;
          if (id) void saveDocument(id);
        },
        saveAs() {
          const id = customizationStateRef.current.activeDocument?.id;
          if (id) void saveDocument(id, true);
        }
      }
    );
    customizationApiRef.current = api;
    const stopCustomizationErrors = api.on("customizationerror", ({ message }) => {
      showNotice(`Customization error: ${message}`);
    });

    const reload = () => {
      void applyCustomizations(api).catch((error) => {
        showNotice(`Customization error: ${error instanceof Error ? error.message : String(error)}`);
      });
    };
    reload();
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("focus", reload);
      stopCustomizationErrors();
      customizationApiRef.current = null;
    };
  }, [closeDocument, handleNew, handleOpen, saveDocument, showNotice, updateDocument]);

  useEffect(() => {
    emitDraftwellState(customizationStateRef.current);
  }, [activeId, documents, syncScroll, theme, viewMode]);

  const handleOpenCustomizationFolder = async () => {
    if (!isDesktop) {
      showNotice("Custom files are available in the desktop app.");
      return;
    }
    try {
      const directory = await customizationApiRef.current?.commands.openCustomizationsFolder();
      if (directory) showNotice("Edit custom.css or custom.js, then return to Draftwell to reload.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const closeTutorial = useCallback(() => {
    completeOnboarding();
    setTutorialOpen(false);
  }, []);

  return (
    <div
      className="desktop-app"
      data-view-mode={viewMode}
      data-sync-scroll={syncScroll ? "on" : "off"}
      data-document-format={activeDocument?.format ?? "none"}
      data-toolbar-preset={customizationPreferences.toolbarPreset}
      style={{
        "--accent": customizationPreferences.accentColor,
        "--accent-hover": `color-mix(in srgb, ${customizationPreferences.accentColor} 82%, black)`,
        "--accent-soft": `color-mix(in srgb, ${customizationPreferences.accentColor} 18%, transparent)`,
        "--editor-font-size": `${customizationPreferences.editorFontSize}px`,
        "--preview-font-size": `${customizationPreferences.previewFontSize}px`,
        "--content-line-height": customizationPreferences.lineHeight,
        "--editor-content-width": `${customizationPreferences.editorWidth}px`,
        "--preview-content-width": `${customizationPreferences.previewWidth}px`,
        "--preview-font-family": previewFontFamilies[customizationPreferences.previewFont]
      } as React.CSSProperties}
    >
      {customizationPreferences.toolbarPreset !== "default" && (
        <style id="draftwell-gui-toolbar-order">{getToolbarPresetStyles(customizationPreferences.toolbarPreset)}</style>
      )}
      <header className="app-header">
        <div className="app-identity">
          <div className="brand-mark">D</div>
          <div className="file-identity">
            <div className="file-title-row"><strong>{activeDocument?.name ?? "Draftwell"}</strong>{activeDirty && <span className="dirty-dot" />}</div>
            <div className="file-path" title={activeDocument?.path ?? "No file selected"}>
              {activeDocument?.path ? <><span>{pathParts.slice(0, -1).join(" / ") || "/"}</span><span className="path-separator">/</span><span>{pathParts.at(-1)}</span></> : <span>{activeDocument ? "Not saved yet" : "Open files from anywhere"}</span>}
            </div>
          </div>
        </div>
        <div className="view-controls">
          <div className="view-switcher" aria-label="Editor view">
            {(["write", "split", "preview"] as ViewMode[]).map((mode) => <button key={mode} className={viewMode === mode ? "active" : ""} onClick={() => setViewMode(mode)}>{mode}</button>)}
          </div>
          {viewMode === "split" && (
            <div className="scroll-switcher" aria-label="Split scroll mode">
              <button className={!syncScroll ? "active" : ""} onClick={() => setSyncScroll(false)} title="Independent scrolling"><Unlink2 size={13} /> Free</button>
              <button className={syncScroll ? "active" : ""} onClick={() => setSyncScroll(true)} title="Synchronized scrolling"><Link2 size={13} /> Sync</button>
            </div>
          )}
          <button className="icon-button help-button" onClick={() => setTutorialOpen(true)} aria-label="Open tutorial" title="Open tutorial"><CircleHelp size={16} /></button>
          <button className="icon-button customize-button" onClick={() => setCustomizationOpen(true)} aria-label="Customize Draftwell" title="Customize Draftwell"><Paintbrush size={16} /></button>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`} title="Toggle theme">{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button>
          <button className="secondary-button compact" onClick={() => void handleOpen()}><FolderOpen size={16} /> Open</button>
          <button className="primary-button compact" onClick={() => activeId && void saveDocument(activeId)} disabled={!activeDocument || (!activeDirty && Boolean(activeDocument.path))}>
            {activeDocument?.saveState === "saving" ? <span className="spinner" /> : activeDocument?.saveState === "saved" && !activeDirty ? <Check size={16} /> : <Save size={16} />}
            {activeDocument?.saveState === "saving" ? "Saving" : "Save"}
          </button>
        </div>
      </header>

      <div className="tab-strip" role="tablist" aria-label="Open files">
        <div className="tab-scroll">
          {documents.map((document) => {
            const dirty = document.source !== document.savedSource;
            return (
              <div className={`file-tab ${document.id === activeId ? "active" : ""}`} key={document.id}>
                <button className="tab-main" role="tab" aria-selected={document.id === activeId} onClick={() => setActiveId(document.id)} title={document.path ?? document.name}>
                  {document.format === "html" ? <FileCode2 size={14} /> : <FileText size={14} />}<span>{document.name}</span>{dirty && <span className="tab-dirty" />}
                </button>
                <button className="tab-close" onClick={() => void closeDocument(document.id)} aria-label={`Close ${document.name}`} title="Close tab"><X size={13} /></button>
              </div>
            );
          })}
        </div>
        <button className="new-tab-button" onClick={handleNew} aria-label="New file" title="New file"><Plus size={16} /></button>
      </div>

      <div className="editor-toolbar" role="toolbar" aria-label="Document formatting">
        <div className="format-actions">
          {activeDocument?.format === "html" ? <>
            <button data-toolbar-command="heading-1" className="icon-button" onClick={() => insertMarkup("<h1>", "</h1>", "Heading")} aria-label="Heading 1" title="Heading 1"><Heading1 size={16} /></button>
            <button data-toolbar-command="heading-2" className="icon-button" onClick={() => insertMarkup("<h2>", "</h2>", "Heading")} aria-label="Heading 2" title="Heading 2"><Heading2 size={16} /></button>
            <button data-toolbar-command="heading-3" className="icon-button" onClick={() => insertMarkup("<h3>", "</h3>", "Heading")} aria-label="Heading 3" title="Heading 3"><Heading3 size={16} /></button>
            <span className="toolbar-divider" />
            <button data-toolbar-command="bold" className="icon-button" onClick={() => insertMarkup("<strong>", "</strong>")} aria-label="Bold" title="Bold"><Bold size={16} /></button>
            <button data-toolbar-command="italic" className="icon-button" onClick={() => insertMarkup("<em>", "</em>")} aria-label="Italic" title="Italic"><Italic size={16} /></button>
            <button data-toolbar-command="strikethrough" className="icon-button" onClick={() => insertMarkup("<del>", "</del>")} aria-label="Strikethrough" title="Strikethrough"><Strikethrough size={16} /></button>
            <button data-toolbar-command="inline-code" className="icon-button" onClick={() => insertMarkup("<code>", "</code>", "code")} aria-label="Inline code" title="Inline code"><Code2 size={16} /></button>
            <span className="toolbar-divider" />
            <button data-toolbar-command="link" className="icon-button" onClick={() => insertMarkup('<a href="https://">', "</a>", "label")} aria-label="Link" title="Link"><Link size={16} /></button>
            <button data-toolbar-command="image" className="icon-button" onClick={() => insertBlock('<img src="image-url" alt="description">')} aria-label="Image" title="Image"><Image size={16} /></button>
            <button data-toolbar-command="blockquote" className="icon-button" onClick={() => insertMarkup("<blockquote>", "</blockquote>", "quote")} aria-label="Blockquote" title="Blockquote"><Quote size={16} /></button>
            <button data-toolbar-command="horizontal-rule" className="icon-button" onClick={() => insertBlock("<hr>")} aria-label="Horizontal rule" title="Horizontal rule"><Minus size={16} /></button>
            <button data-toolbar-command="table" className="icon-button" onClick={() => insertBlock("<table><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td>Value 1</td><td>Value 2</td></tr></tbody></table>")} aria-label="Table" title="Table"><Table2 size={16} /></button>
          </> : <>
          {[Heading1, Heading2, Heading3, Heading4, Heading5, Heading6].map((Icon, index) => <button data-toolbar-command={`heading-${index + 1}`} className="icon-button" key={index} onClick={() => setHeading(index + 1)} aria-label={`Heading ${index + 1}`} title={`Heading ${index + 1}`}><Icon size={16} /></button>)}
          <span className="toolbar-divider" />
          <button data-toolbar-command="bold" className="icon-button" onClick={() => insertMarkup("**")} aria-label="Bold" title="Bold"><Bold size={16} /></button>
          <button data-toolbar-command="italic" className="icon-button" onClick={() => insertMarkup("_")} aria-label="Italic" title="Italic"><Italic size={16} /></button>
          <button data-toolbar-command="strikethrough" className="icon-button" onClick={() => insertMarkup("~~")} aria-label="Strikethrough" title="Strikethrough"><Strikethrough size={16} /></button>
          <button data-toolbar-command="inline-code" className="icon-button" onClick={() => insertMarkup("`", "`", "code")} aria-label="Inline code" title="Inline code"><Code2 size={16} /></button>
          <button data-toolbar-command="code-block" className="icon-button" onClick={() => insertBlock("```\n$SELECTION\n```")} aria-label="Code block" title="Code block"><CodeXml size={16} /></button>
          <button data-toolbar-command="inline-equation" className="icon-button" onClick={() => insertMarkup("$", "$", "x^2")} aria-label="Inline equation" title="Inline equation"><Sigma size={16} /></button>
          <button data-toolbar-command="display-equation" className="icon-button" onClick={() => insertBlock("\n$$\n$SELECTION\n$$\n")} aria-label="Display equation" title="Display equation"><span className="math-icon">∑</span></button>
          <span className="toolbar-divider" />
          <button data-toolbar-command="link" className="icon-button" onClick={() => insertMarkup("[", "](https://)", "label")} aria-label="Link" title="Link"><Link size={16} /></button>
          <button data-toolbar-command="image" className="icon-button" onClick={() => insertMarkup("![", "](image-url)", "alt text")} aria-label="Image" title="Image"><Image size={16} /></button>
          <span className="toolbar-divider" />
          <button data-toolbar-command="bulleted-list" className="icon-button" onClick={() => prefixSelectedLines("- ", "list item")} aria-label="Bulleted list" title="Bulleted list"><List size={16} /></button>
          <button data-toolbar-command="numbered-list" className="icon-button" onClick={() => prefixSelectedLines("1. ", "list item")} aria-label="Numbered list" title="Numbered list"><ListOrdered size={16} /></button>
          <button data-toolbar-command="task-list" className="icon-button" onClick={() => prefixSelectedLines("- [ ] ", "task")} aria-label="Task list" title="Task list"><ListChecks size={16} /></button>
          <button data-toolbar-command="blockquote" className="icon-button" onClick={() => prefixSelectedLines("> ", "quote")} aria-label="Blockquote" title="Blockquote"><Quote size={16} /></button>
          <span className="toolbar-divider" />
          <button data-toolbar-command="horizontal-rule" className="icon-button" onClick={() => insertBlock("\n---\n")} aria-label="Horizontal rule" title="Horizontal rule"><Minus size={16} /></button>
          <button data-toolbar-command="table" className="icon-button" onClick={() => insertBlock("| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |") } aria-label="Table" title="Table"><Table2 size={16} /></button>
          </>}
        </div>
        <div className="toolbar-file-actions">
          <button onClick={() => void convertActiveDocument()} disabled={!activeDocument}>{activeDocument?.format === "html" ? <FileText size={15} /> : <FileCode2 size={15} />} {activeDocument?.format === "html" ? "To Markdown" : "To HTML"}</button>
          <button onClick={handleNew}><Plus size={15} /> New</button>
          <button onClick={() => activeId && void saveDocument(activeId, true)} disabled={!activeId}><FileDown size={15} /> Save as</button>
        </div>
      </div>

      {!activeDocument ? (
        <main className="welcome-screen">
          <div className="welcome-icon"><FileText size={30} /></div>
          <h1>Open Markdown or HTML files</h1>
          <p>Open files from any folders. Each stays in its own tab, previews safely, and saves directly back to its original path.</p>
          <div className="welcome-actions"><button className="primary-button" onClick={() => void handleOpen()}><FolderOpen size={17} /> Open files</button><button className="secondary-button" onClick={handleNew}><Plus size={17} /> New file</button></div>
          <span className="drop-hint">or drop Markdown files anywhere in this window</span>
          {!isDesktop && <div className="desktop-required"><ExternalLink size={15} /> Start with <code>npm run tauri:dev</code> for filesystem access.</div>}
        </main>
      ) : (
        <main className={`editor-stage mode-${viewMode}`}>
          {viewMode !== "preview" && (
            <section ref={sourcePaneRef} className="source-pane" aria-label={`${activeDocument.format === "html" ? "HTML" : "Markdown"} source`}>
              <CodeMirror
                key={activeDocument.id}
                ref={editorRef}
                value={activeDocument.source}
                height="100%"
                theme={theme}
                extensions={[activeDocument.format === "html" ? htmlLanguage() : markdownLanguage(), EditorView.lineWrapping]}
                onChange={(source) => updateDocument(activeDocument.id, { source, saveState: "idle" })}
                basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false, autocompletion: false }}
              />
            </section>
          )}
          {viewMode !== "write" && (
            <section ref={previewPaneRef} className="preview-pane" aria-label="Document preview">
              {activeDocument.source.trim() ? <article className="markdown-body" onChange={handlePreviewChange} dangerouslySetInnerHTML={{ __html: rendered }} /> : <div className="empty-preview">Preview will appear here.</div>}
            </section>
          )}
        </main>
      )}

      <footer className="status-bar">
        <span>{activeDocument?.path ? "File on disk" : activeDocument ? "Unsaved file" : "No file"}</span>
        {activeDocument && <span className={`save-status ${activeDirty ? "dirty" : ""}`}>{activeDirty ? "Unsaved changes" : "Up to date"}</span>}
        <span>{documents.length} {documents.length === 1 ? "tab" : "tabs"}</span>
        {activeDocument && <span>{activeDocument.format === "html" ? "HTML" : "Markdown"}</span>}
        <span className="status-spacer" />
        <span>{stats.words} {stats.words === 1 ? "word" : "words"}</span><span>{stats.lines} {stats.lines === 1 ? "line" : "lines"}</span><span>{stats.readingMinutes} min read</span><span>UTF-8</span>
      </footer>

      {dragging && <div className="drop-overlay"><FolderOpen size={32} /><strong>Drop to open in tabs</strong><span>Files can come from completely different folders.</span></div>}
      {notice && <div className="notice" role="status">{notice}</div>}
      {customizationOpen && <CustomizationPanel
        preferences={customizationPreferences}
        onChange={setCustomizationPreferences}
        onClose={() => setCustomizationOpen(false)}
        onOpenAdvanced={() => void handleOpenCustomizationFolder()}
      />}
      {tutorialOpen && <OnboardingTutorial onComplete={closeTutorial} />}
    </div>
  );
}

export default App;
