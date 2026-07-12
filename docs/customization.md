# Customizing Draftwell

Draftwell provides a visual customization panel for common preferences and trusted local CSS and JavaScript for advanced extensions. Click the paintbrush beside the view controls to adjust the accent color, typography, line spacing, reading widths, and toolbar layout. Changes preview immediately, save automatically, and can be reset together.

Select **Advanced CSS & JS** in that panel to create and open the customization directory. It contains:

- `custom.css` — visual overrides for the entire interface, editor, and preview.
- `custom.js` — behavior extensions with access to the `window.draftwell` API and the page DOM.

Save either file and return to Draftwell. The app reloads both files when its window regains focus. JavaScript may also call `draftwell.commands.reloadCustomizations()`.

## Security

`custom.js` is trusted local code. It runs with the same privileges as Draftwell's frontend and can read document contents, change the interface, and invoke APIs available to the webview. Only install scripts you have reviewed. Remote scripts are not loaded by the customization system.

Each customization file is limited to 1 MB. A JavaScript error is shown as an in-app notice without preventing the editor from starting. If a script returns a function, Draftwell calls that function before reloading the script.

## CSS

All existing Draftwell classes can be overridden. The root `.desktop-app` also exposes state attributes:

- `data-view-mode="write|split|preview"`
- `data-sync-scroll="on|off"`
- `data-document-format="markdown|html|none"`

The selected light or dark theme remains available as `data-theme` on the `<html>` element.

```css
:root {
  --accent: #7c5cff;
  --accent-hover: #6847e8;
  --accent-soft: color-mix(in srgb, #7c5cff 18%, transparent);
}

.source-pane .cm-content {
  max-width: 980px;
  font-size: 17px;
}

.desktop-app[data-view-mode="split"] .markdown-body {
  font-family: Inter, sans-serif;
}
```

## JavaScript API

The API is available as both `window.draftwell` and the `draftwell` argument supplied to `custom.js`.

### State

`draftwell.getState()` returns:

```js
{
  theme: "light" | "dark",
  viewMode: "write" | "split" | "preview",
  syncScroll: boolean,
  activeDocument: DocumentState | null,
  documents: DocumentState[]
}
```

Each document state contains `id`, `name`, `path`, `source`, `format`, and `dirty`.

### Events

```js
const stop = draftwell.on("statechange", ({ state }) => {
  console.log(state.activeDocument?.name);
});

draftwell.on("ready", ({ directory, state }) => {});
draftwell.on("customizationerror", ({ error, message }) => {});

// Remove listeners before the next reload.
return stop;
```

Custom scripts can communicate through the same event bus:

```js
draftwell.on("my-plugin-event", (detail) => console.log(detail));
draftwell.emit("my-plugin-event", { enabled: true });
```

### Commands

```js
draftwell.commands.setTheme("dark");
draftwell.commands.setViewMode("split");
draftwell.commands.setSyncScroll(true);
draftwell.commands.setActiveDocument(documentId);
draftwell.commands.setDocumentSource("# Replaced text", documentId); // id is optional
draftwell.commands.replaceSelection("**inserted at the selection**");
draftwell.commands.newFile();
draftwell.commands.openFiles();
draftwell.commands.closeDocument(documentId); // id is optional
draftwell.commands.save();
draftwell.commands.saveAs();
draftwell.commands.getToolbarCommands();
draftwell.commands.setToolbarOrder(["bold", "italic", "heading-1"]);
draftwell.commands.resetToolbarOrder();
draftwell.commands.reloadCustomizations();
draftwell.commands.openCustomizationsFolder();
```

### Formatting toolbar order

Every formatting control has a stable `data-toolbar-command` identifier. Put the desired identifiers first; commands omitted from the array remain visible after them in their default relative order. Custom ordering hides the original group dividers because those dividers no longer describe the new layout.

```js
console.log(draftwell.commands.getToolbarCommands());

draftwell.commands.setToolbarOrder([
  "bold",
  "italic",
  "link",
  "image",
  "heading-1",
  "heading-2",
  "heading-3",
  "bulleted-list",
  "numbered-list",
  "task-list",
  "blockquote",
  "inline-code",
  "code-block",
  "inline-equation",
  "display-equation",
  "strikethrough",
  "horizontal-rule",
  "table"
]);
```

The available identifiers depend on whether the active document is Markdown or HTML. Call `getToolbarCommands()` after switching formats to inspect them. To do the same directly in CSS:

```css
[data-toolbar-command="bold"] { order: 1; }
[data-toolbar-command="italic"] { order: 2; }
[data-toolbar-command="link"] { order: 3; }
```

## Adding UI

Scripts have normal DOM access, so they can add controls, keyboard shortcuts, observers, or editor decorations. Use the cleanup return function to remove everything on reload:

```js
const button = document.createElement("button");
button.textContent = "Focus mode";
button.className = "secondary-button compact";
button.onclick = () => draftwell.commands.setViewMode("write");
document.querySelector(".header-actions")?.prepend(button);

const onKeyDown = (event) => {
  if (event.altKey && event.key === "f") {
    event.preventDefault();
    draftwell.commands.setViewMode("write");
  }
};
window.addEventListener("keydown", onKeyDown);

return () => {
  button.remove();
  window.removeEventListener("keydown", onKeyDown);
};
```

DOM extensions depend on the documented class names and may need adjustment if the app layout changes. Prefer the Draftwell API for document and app behavior.
