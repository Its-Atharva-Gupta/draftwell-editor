# Frontend Architecture

## Application shell

The authenticated editor is a three-region workspace: navigation sidebar, document work area, and optional inspector/outline. Small screens use a drawer for navigation and one content mode at a time. The shell is responsible for routing, session bootstrap, global keyboard handling, and sync status.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirect to most recently opened document or workspace home. |
| `/w/:workspaceId` | Workspace document list and empty state. |
| `/w/:workspaceId/d/:documentId` | Editor. |
| `/w/:workspaceId/trash` | Recoverable deleted documents. |
| `/settings` | Profile, preferences, account, and local-data controls. |
| `/share/:token` | Read-only shared document, when sharing is introduced. |

## State ownership

| State type | Owner | Examples |
| --- | --- | --- |
| Server/local domain state | Repository-backed query store | Workspaces, folders, documents, revisions, queue status. |
| Ephemeral UI state | Component or route store | Open dialogs, focused pane, sidebar width, hover state. |
| Editor session state | Editor adapter | Selection, undo stack, composition events, dirty content. |
| User preferences | Local settings store, mirrored to account when signed in | Theme, font size, preview mode, line wrap. |

Avoid putting full Markdown strings in a global UI store while the editor is active. The editor adapter holds the active buffer and emits debounced domain updates; the document repository owns persisted source.

## Editor lifecycle

1. Route resolves document metadata from local storage.
2. A document session loads the source into the editor once.
3. Input events update the session buffer, schedule local persistence, and notify preview rendering.
4. Navigation prompts only when a local transaction is still in flight; a queued sync operation is safe to leave behind.
5. On a server conflict or remote invalidation, the session compares versions before replacing the active buffer.

## Client data layer

- Repositories expose reads as subscriptions and writes as commands.
- Commands commit the local entity change and queue entry atomically in IndexedDB.
- The sync engine is a singleton started after storage initialization, independent of mounted routes.
- Queue processing is per-document serial and can be parallel across documents within a conservative concurrency limit.
- Network responses are validated at the boundary before entering the client store.

## Accessibility and input

- Use semantic landmarks: `nav`, `main`, and labeled complementary regions.
- Expose toolbars with explicit names and keyboard-operable controls.
- Keep focus in dialogs, restore it on close, and announce save/sync/error state through a restrained live region.
- Respect IME composition events. Never transform Markdown text during composition.
- Provide keyboard commands for save, find, preview mode, formatting insertion, and sidebar toggle; expose them through a command palette.

## Performance constraints

- Code-split settings, export, and history views.
- Virtualize long document lists.
- Debounce parsing independently from local persistence.
- Move large-document parsing to a web worker when profiling shows main-thread work exceeds 16 ms.
- Do not reinitialize the editor on metadata-only document changes.
