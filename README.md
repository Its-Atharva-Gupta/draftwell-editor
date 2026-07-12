# Draftwell

**A minimal, local-first Markdown and HTML desktop editor.**

Draftwell opens real files from anywhere on your filesystem, edits them in independent in-memory tabs, and saves directly back to their original paths. No databases, vaults, workspaces, accounts, bundled runtimes, or proprietary formats — just a focused editing surface for the files you already own.

```text
  ╭──────────────────────────────────────────────╮
  │  D  notes.md •                          ☀ Open Save │
  │  ┌──────────┬──────────────────────────────╮ │
  │  │ # Welcome                               │ │
  │  │                                          │ │
  │  │ Draftwell is a **Markdown editor**       │ │
  │  │ that works with your normal files.       │ │
  │  │                                          │ │
  │  │ - [x] Open from anywhere                  │ │
  │  │ - [ ] Save in place                       │ │
  │  └──────────┴──────────────────────────────╯ │
  │  3 tabs  |  Markdown  |  42 words  |  3 min  │
  ╰──────────────────────────────────────────────╯
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Real files, not a vault** | Open any `.md`, `.html`, or `.txt` file from anywhere on your computer. No import, no index, no workspace. |
| **Independent tabs** | Each tab is an in-memory buffer. Files from completely unrelated folders coexist. |
| **Live preview** | Rendered Markdown with GFM task lists, tables, code blocks, blockquotes, and more. |
| **KaTeX math** | Inline `$E=mc^2$` and display `$$...$$` equations rendered locally. |
| **Task checkboxes** | Click a checkbox in preview — the source `- [ ]` updates to `- [x]` and auto-saves. |
| **HTML editing** | Full HTML mode with syntax highlighting, sanitized preview, and `.html`/`.htm` support. |
| **Format conversion** | Markdown ↔ HTML conversion creates a new unsaved tab. Originals are never touched. |
| **Split views** | Write-only, side-by-side Split, or full Preview. Switch with `Ctrl/Cmd + 1/2/3`. |
| **Scroll sync** | Free (independent) or Sync (proportional scroll matching between editor and preview). |
| **Rich toolbar** | Headings 1–6, bold, italic, strikethrough, code, links, images, lists, quotes, tables, equations. |
| **Light/Dark theme** | Toggle with one click. Respects system preference on first launch. |
| **Customizable** | Visual panel for color, typography, spacing, widths, toolbar layout. Plus `custom.css` and `custom.js` advanced extensions. |
| **Keyboard-friendly** | Every essential action has a shortcut. See the table below. |
| **Drag-and-drop** | Drop multiple files onto the window to open them in tabs. |
| **OS file associations** | Registered for `.md`, `.markdown`, `.mdown`, `.mkd`. |
| **Single instance** | Opening a Markdown file from the OS adds it as a tab in the running window. |
| **Safe by default** | CSP headers, DOMPurify sanitization, disabled raw HTML in Markdown, `noopener noreferrer` on links. |

---

## Quick Start

```bash
# Linux prerequisites (one-time)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Clone and run
git clone https://github.com/Its-Atharva-Gupta/draftwell-editor.git
cd draftwell-editor
npm install
npm run tauri:dev
```

**macOS:** `xcode-select --install`  
**Windows:** WebView2 is included in Windows 10/11. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload.

---

## Pre-built Binaries

Download the latest release for your platform from the [Releases page](https://github.com/Its-Atharva-Gupta/draftwell-editor/releases).

| Platform | Format | Architecture |
|----------|--------|-------------|
| Linux | `.deb` | `x86_64`, `aarch64` |
| Linux | `.rpm` | `x86_64` |
| Linux | `.AppImage` | `x86_64` |
| Linux | `.flatpak` | `x86_64`, `aarch64` |
| macOS | `.dmg` | Apple Silicon (`aarch64`), Intel (`x86_64`) |
| Windows | `.msi` | `x86_64`, `aarch64` |

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New file | `Ctrl/Cmd + N` |
| Open file | `Ctrl/Cmd + O` |
| Save | `Ctrl/Cmd + S` |
| Save As | `Ctrl/Cmd + Shift + S` |
| Close active tab | `Ctrl/Cmd + W` |
| Next tab | `Ctrl/Cmd + Tab` |
| Previous tab | `Ctrl/Cmd + Shift + Tab` |
| Write mode | `Ctrl/Cmd + 1` |
| Split mode | `Ctrl/Cmd + 2` |
| Preview mode | `Ctrl/Cmd + 3` |

---

## Usage Guide

### Opening Files
- Click **Open** or press `Ctrl/Cmd + O` to open one or more files via the native dialog.
- Drag and drop files from your file manager onto the window.
- Double-click a Markdown file in your file manager (after installation with file associations).

### Editing
The editor is [CodeMirror](https://codemirror.net/) with full Markdown or HTML syntax highlighting. The toolbar inserts common structures. Preview updates as you type.

### Task Lists
GFM task lists (`- [ ]` / `- [x]`) render as interactive checkboxes in preview. Checking one updates the source token and immediately saves the file (if it has a path).

### Math
Draftwell uses [KaTeX](https://katex.org) for math rendering:
- Inline: `$x^2 + y^2 = z^2$`
- Display: `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`

Equations in converted HTML are stored as MathML with the original TeX annotation preserved for round-trip conversion.

### Format Conversion
The toolbar's **To HTML** / **To Markdown** button creates a new unsaved tab with the converted content. The original file is never modified.

### Views
- **Write** (`Ctrl/Cmd + 1`): Full-width source editor.
- **Split** (`Ctrl/Cmd + 2`): Side-by-side editor and preview.
- **Preview** (`Ctrl/Cmd + 3`): Full-width rendered document.

In Split mode, use **Free** / **Sync** to control whether each pane scrolls independently or in proportion.

### Customization
Click the paintbrush icon to open the visual customization panel. Adjust:
- **Accent color** (affects buttons, selection, links)
- **Editor font size** (12–24 px)
- **Preview font size** (13–28 px)
- **Line spacing** (1.2–2.2×)
- **Preview typeface** (Serif, Sans, Mono)
- **Reading widths** (editor and preview columns)
- **Toolbar preset** (Default, Writing, Technical)

#### Advanced: Custom CSS & JS
The panel's **Advanced CSS & JS** button opens a folder containing `custom.css` and `custom.js`. Changes reload when you return to Draftwell.

```css
/* custom.css — override any visual style */
:root {
  --accent: #7c5cff;
  --accent-hover: #6847e8;
}
.source-pane .cm-content {
  max-width: 980px;
  font-size: 17px;
}
```

```javascript
// custom.js — extend behavior via window.draftwell API
draftwell.on("statechange", ({ state }) => {
  console.log(state.activeDocument?.name);
});

// Add a custom button
const btn = document.createElement("button");
btn.textContent = "Focus";
btn.className = "secondary-button compact";
btn.onclick = () => draftwell.commands.setViewMode("write");
document.querySelector(".header-actions")?.prepend(btn);

// Cleanup on reload
return () => btn.remove();
```

See [the full customization API reference](docs/customization.md) for all commands, events, and state.

---

## Architecture

```text
┌─────────────────────────────────────────────────┐
│                   User                           │
│  (file dialog / drag-drop / file association)    │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              Tauri Application (Rust)             │
│  ┌─────────────────────────────────────────────┐ │
│  │  src-tauri/src/lib.rs                       │ │
│  │  • File I/O (read, write, validate)         │ │
│  │  • Native dialogs (open, save, confirm)     │ │
│  │  • Single-instance handling                 │ │
│  │  • Customization file management            │ │
│  │  • Window title & lifecycle                 │ │
│  └───────────────────┬─────────────────────────┘ │
└──────────────────────┼───────────────────────────┘
                       │ typed invoke() / events
┌──────────────────────▼───────────────────────────┐
│           OS Native Webview (React)               │
│  ┌─────────────────────────────────────────────┐ │
│  │  src/App.tsx                                │ │
│  │  • Tab management, view modes, state        │ │
│  │  • CodeMirror editor + markdown-it preview  │ │
│  │  • Toolbar, status bar, keyboard shortcuts  │ │
│  │  • Theme, customization, onboarding         │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Key principles:**
- **Rust owns the filesystem.** The webview never touches a file path directly. All reads/writes go through typed Tauri commands.
- **No bundled runtime.** Tauri uses the OS webview (WebKitGTK on Linux, WKWebView on macOS, WebView2 on Windows). No Chromium, no Node.js in production.
- **Security by isolation.** The renderer has a strict CSP. DOMPurify sanitizes all HTML. Markdown disables raw HTML by default.

---

## Project Structure

```
draftwell-editor/
├── src/                          # Frontend (React + TypeScript)
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Main component (tabs, editor, preview, toolbar)
│   ├── App.test.tsx              # Integration tests
│   ├── styles.css                # All application styles
│   ├── desktop.ts                # Tauri IPC bridge (typed API)
│   ├── customization.ts          # window.draftwell customization API
│   ├── customization.test.ts     # Customization API tests
│   ├── CustomizationPanel.tsx    # Visual customization panel
│   ├── OnboardingTutorial.tsx    # First-launch tutorial
│   └── lib/
│       ├── markdown.ts           # Markdown-it rendering, sanitization, task toggle
│       ├── markdown.test.ts      # Rendering, conversion, math tests
│       ├── conversion.ts         # Markdown ↔ HTML with MathML round-trip
│       ├── scrollSync.ts         # Proportional scroll sync algorithm
│       ├── scrollSync.test.ts    # Scroll sync tests
│       ├── preferences.ts        # Customization preferences persistence
│       ├── preferences.test.ts   # Preferences tests
│       └── onboarding.ts         # Tutorial completion tracking
├── src-tauri/                    # Rust backend
│   ├── src/lib.rs                # All Tauri commands (12 commands)
│   ├── src/main.rs               # Entry point
│   ├── Cargo.toml                # Rust dependencies
│   ├── build.rs                  # Build script
│   ├── tauri.conf.json           # App configuration
│   └── icons/                    # Application icons
├── docs/
│   ├── architecture/             # Architecture documentation
│   └── customization.md          # Full customization API reference
├── flatpak/
│   └── com.draftwell.editor.yml  # Flatpak manifest
├── .github/workflows/
│   └── build.yml                 # CI/CD pipeline
├── dist/                         # Built frontend (generated)
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── BUILDING.md                   # Build-from-source guide
```

---

## Testing

```bash
# Frontend tests
npm test

# Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# All tests
npm test && cargo test --manifest-path src-tauri/Cargo.toml

# Lint
cargo clippy --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check

# Security audit
npm audit
cargo audit --manifest-path src-tauri/Cargo.toml
```

---

## Building for Distribution

```bash
# Install dependencies
npm install

# Build the frontend
npm run build

# Build the Tauri application (platform-native bundle)
npm run tauri:build
```

Tauri writes platform-specific bundles to `src-tauri/target/release/bundle/`.

| Target | Output |
|--------|--------|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| macOS | `.dmg` |
| Windows | `.msi` |

See [BUILDING.md](BUILDING.md) for detailed cross-platform build instructions.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test && cargo test --manifest-path src-tauri/Cargo.toml`)
5. Commit with clear messages
6. Push and open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgments

- [Tauri](https://tauri.app) — The application framework
- [CodeMirror](https://codemirror.net) — The text editor
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown parser
- [KaTeX](https://katex.org) — Math rendering
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitization
- [Turndown](https://github.com/mixmark-io/turndown) — HTML to Markdown conversion
- [Lucide](https://lucide.dev) — Icons
- [React](https://react.dev) — UI framework
