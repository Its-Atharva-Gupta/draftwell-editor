# Editor and Rendering

## Editor choice and adapter

Use CodeMirror 6 as the source editor. It has a mature extension model, accessible foundations, language packages, and efficient document updates. Isolate it behind an `EditorAdapter` interface so editor-specific types do not spread into application components.

```ts
interface EditorAdapter {
  mount(host: HTMLElement, initialValue: string): void;
  setValue(value: string, origin: "local" | "remote"): void;
  getValue(): string;
  focus(): void;
  destroy(): void;
  onChange(listener: (value: string) => void): () => void;
}
```

The adapter supplies Markdown syntax highlighting, line wrapping, search, indentation, keymaps, and a command extension. It must preserve selection and undo history across normal layout changes.

## Markdown contract

- Parse CommonMark plus GFM tables, task lists, strikethrough, autolink literals, and footnotes if enabled by the parser chain.
- Treat front matter as opaque source in phase 1; do not interpret it as authorization, routing, or executable configuration.
- Disable raw HTML by default. If later enabled, sanitize it in the same pipeline as generated HTML.
- Normalize only line endings at import boundaries; never reformat source on every save.
- Store UTF-8 source, reject invalid control characters except tab and newline, and enforce a configurable document-size limit.

## Rendering pipeline

```text
Markdown source -> parser AST -> syntax extensions -> HTML -> sanitizer -> rendered preview
                                  |                  |
                                  +-> outline         +-> export input
```

The preview consumes a sanitized HTML string created by a single shared `markdown` module. Do not render user Markdown through ad hoc JSX parsing in multiple screens. The client may render locally for responsiveness; the worker uses the same versioned renderer for exports.

## Sanitization policy

- Remove scripts, event handler attributes, inline styles unless deliberately allowlisted, forms, iframes, and embedded objects.
- Allow only a small URL scheme set: `https`, `http`, `mailto`, and relative URLs. Reject `javascript`, `data`, and unknown schemes.
- Add `rel="noopener noreferrer"` to external links opened in a new tab.
- Scope preview CSS beneath a dedicated preview root. User content must not affect application chrome.
- Syntax highlighting classes are allowlisted; user-supplied classes are not trusted.

## Derived features

| Feature | Source | Trigger |
| --- | --- | --- |
| Outline | Heading nodes from parse AST | Debounced source update |
| Word count | Plain text extracted from AST | Debounced source update |
| Task summary | GFM task nodes | Debounced source update |
| Search excerpt | Local text index | Local save and remote pull |
| HTML export | Sanitized render | On demand worker job |

## Import and export

- `.md` import preserves byte content after UTF-8 validation and records origin metadata.
- `.md` export streams the canonical source with a sanitized filename.
- HTML/PDF exports are asynchronous jobs once documents can be large or branded templates are added.
- Export download URLs are short-lived, authorized, and backed by object storage rather than API process memory.
