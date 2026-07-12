# Draftwell

Draftwell is a lightweight desktop Markdown editor built with Tauri 2 and Rust. It opens normal files from anywhere on your computer, keeps each open buffer in an in-memory tab, and saves directly back to the same file. Tabs can contain files from completely unrelated folders; there is no database, vault, workspace, account, bundled Chromium runtime, or proprietary document format.

The UI uses React and CodeMirror inside the operating system webview. Rust owns native dialogs, exact-path file reads/writes, unsaved-change prompts, file associations, and single-instance handling.

## Linux prerequisite

Tauri uses WebKitGTK on Linux. Install its official build dependencies once:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

See [Tauri's platform prerequisites](https://v2.tauri.app/start/prerequisites/) for other Linux distributions, macOS, and Windows.

## Run the app

```bash
npm install
npm run tauri:dev
```

Use the native **Open** dialog, drop Markdown or HTML files onto the window, or create a blank file and save it normally.

You can open or drop multiple files at once. Preview task checkboxes are interactive: checking one updates the matching `- [ ]` token to `- [x]` in Markdown source and immediately saves that change when the tab already has a file path. Source changes update Preview in return.

HTML tabs provide raw HTML editing, syntax highlighting, sanitized preview, and direct `.html`/`.htm` saving. `To HTML` and `To Markdown` create converted copies in new unsaved tabs, leaving the original file untouched.

## Customization

The paintbrush button opens a visual panel for accent color, typography, spacing, reading widths, and toolbar presets. These preferences preview immediately and persist locally. Its Advanced option opens the trusted local `custom.css` and `custom.js` files; changes reload when you return to Draftwell. JavaScript extensions receive a stable API for state, events, document editing, view controls, file commands, and reload lifecycle cleanup.

See [the customization guide](docs/customization.md) for the complete API, security model, and examples.

Markdown math uses KaTeX locally. Write inline equations as `$E=mc^2$` and display equations between `$$` delimiters. Converted HTML stores equations as self-contained MathML; converting that HTML back recovers the embedded LaTeX expression.

## Everyday shortcuts

| Action | Shortcut |
| --- | --- |
| New file | `Ctrl/Cmd + N` |
| Open file | `Ctrl/Cmd + O` |
| Save | `Ctrl/Cmd + S` |
| Save as | `Ctrl/Cmd + Shift + S` |
| Close active tab | `Ctrl/Cmd + W` |
| Next/previous tab | `Ctrl/Cmd + Tab` / `Ctrl/Cmd + Shift + Tab` |
| Write / Split / Preview | `Ctrl/Cmd + 1/2/3` |

The toolbar covers headings 1–6, bold, italic, strikethrough, inline and fenced code, links, images, bulleted/numbered/task lists, blockquotes, horizontal rules, and GFM tables.

## Build and package

```bash
npm run build
npm run tauri:build
```

Tauri writes optimized binaries and platform packages under `src-tauri/target/release/`. Bundles declare `.md`, `.markdown`, `.mdown`, and `.mkd` file associations.

## Verification

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm audit
```

The current implementation is described in [the desktop architecture](docs/architecture/10-desktop-file-editor.md).
