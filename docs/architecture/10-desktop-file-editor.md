# Desktop File Editor Architecture

## Mission

Draftwell should disappear into the ordinary file workflow: open one or more `.md` files, make changes, press Save, and continue using those same files with any other tool. Tabs are an in-memory multitasking surface, not a vault: their files may come from unrelated directories and Draftwell never indexes their parent folders.

## Runtime boundary

```text
Operating system file dialog / file association / drop
                         |
                  Tauri application
                         |
       Rust commands: read / write / lifecycle
                         |
              typed Tauri invoke/events
                         |
             React + CodeMirror renderer
                         |
                sanitized preview
```

Tauri uses the operating system webview: WebKitGTK on Linux, WKWebView on macOS, and WebView2 on Windows. It does not package Chromium or run Node.js in production. The Rust process is the only layer with filesystem access; the webview receives only a selected path, basename, and UTF-8 content.

## Document lifecycle

1. **Open:** the user selects or drops a Markdown, text, or HTML file. Rust verifies it is a file, enforces the 10 MB limit, decodes UTF-8 source, and returns it to the renderer.
2. **Add tab:** each unique path becomes an in-memory document record with source, saved baseline, dirty state, and save status. Opening an existing path focuses its tab.
3. **Edit:** CodeMirror owns the active tab's buffer. Switching tabs preserves every buffer independently.
4. **Preview interaction:** source renders task checkboxes; changing one updates the corresponding GFM task token and queues an exact-path save when the tab already has a file path.
5. **Format conversion:** Markdown-to-HTML or HTML-to-GFM conversion creates a new unsaved tab. Originals and their paths are never mutated by conversion.
6. **Math:** Markdown equations render locally through KaTeX. Standalone HTML conversion emits MathML and retains the original TeX annotation for reverse conversion.
7. **Save:** `Ctrl/Cmd + S` invokes one Rust command that writes only the active buffer to its path. A new document opens native Save As first.
8. **Close:** dirty tabs resolve Save, Discard, or Cancel independently. Quitting walks all dirty tabs before destroying the window.
9. **Open externally:** packaged file associations and the single-instance plugin add OS-opened Markdown or HTML paths to the existing tab set.

No source content is written to localStorage, IndexedDB, SQLite, telemetry, or application configuration. The only durable document write is the user-selected filesystem path.

## Command contract

| Command/event | Direction | Purpose |
| --- | --- | --- |
| `open_documents` | Webview to Rust | Show native multi-file Open and return selected sources. |
| `read_document` | Webview to Rust | Validate and read an exact dropped/associated path. |
| `save_document` | Webview to Rust | Write UTF-8 source to the active path. |
| `save_document_as` | Webview to Rust | Show native Save As and write the selected path. |
| `confirm_discard` | Webview to Rust | Protect replacement of a dirty buffer. |
| `confirm_close` | Webview to Rust | Return Save, Discard, or Cancel. |
| `set_window_title` | Webview to Rust | Reflect filename and dirty state in native chrome. |
| `force_close` | Webview to Rust | Close only after the renderer resolves dirty state. |
| `file-open-request` | Rust to webview | Deliver a file from a second OS launch. |

The capability grants only Tauri core defaults. There is no filesystem plugin scope, shell access, generic command execution, directory enumeration, or home-directory grant. Custom Rust commands operate only on explicit paths originating from native selection, drop, or OS association.

## Rendering and safety

The active tab's source format remains canonical. Markdown-it parses CommonMark/GFM-oriented syntax, KaTeX renders math to HTML/MathML, and raw HTML is disabled in Markdown. HTML tabs preview their source only after DOMPurify sanitization. External links use `noopener noreferrer`, scripts and event handlers are removed, and the webview has a restrictive Content Security Policy.

Turndown plus its GFM extension converts sanitized HTML into Markdown. Markdown-to-HTML uses the same renderer as Preview and emits a standalone document. Conversion is intentionally explicit and may be structurally lossy for HTML constructs that Markdown cannot represent.

## Packaging

Tauri produces platform-native bundles and declares Markdown file associations. Linux relies on the installed WebKitGTK runtime; macOS uses the built-in WKWebView; Windows uses WebView2. Code signing and notarization require platform-specific release credentials.

## Deliberate exclusions

- Vaults, folder trees, file indexing, and global search
- Document databases, history, sync, and accounts
- Session restoration after the application exits
- Rich-text canonical storage
- Automatic background writes without an explicit Save action

These exclusions protect the minimal promise. A future feature should be rejected when it makes Draftwell the owner of the user's files rather than a tool that edits them.
