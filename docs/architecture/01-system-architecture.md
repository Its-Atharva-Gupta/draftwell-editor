# System Architecture

## Context

The product has a browser client, an API, a realtime notification channel, durable relational storage, object storage for exports/attachments, and operational services. The browser remains usable when the API is unavailable.

```text
Browser
  React UI -> editor adapter -> local document store (IndexedDB)
       |                         |
       +-> sync queue -----------+
                 |
            HTTPS API <---- WebSocket/SSE invalidation channel
                 |
     PostgreSQL <- worker queue -> search index / export worker
                 |
            object storage
```

## Component responsibilities

| Component | Owns | Does not own |
| --- | --- | --- |
| Web client | Interaction state, local documents, queued operations, rendering UI. | Authorization decisions or cross-user consistency. |
| API service | Authentication, authorization, validation, transactional writes, conflict detection. | Expensive exports and asynchronous indexing. |
| Realtime gateway | Workspace-scoped invalidation messages and presence in a future phase. | Authoritative writes. |
| Worker | Exports, cleanup, indexing, retention processing. | Request-time document mutation. |
| PostgreSQL | Authoritative synced entities and immutable revisions. | Cached rendered HTML. |
| Object storage | Generated exports and future attachments. | Metadata or access control decisions. |

## Core write path

1. The editor produces a document change.
2. The client applies it to in-memory state immediately and debounces a transaction to IndexedDB.
3. It appends an idempotent `update_document` operation to the sync queue.
4. When online and authenticated, the sync engine sends operations in order per document.
5. The API validates membership and the `baseVersion` in one transaction.
6. The API updates the document, appends a revision, commits, and publishes an invalidation event.
7. The client marks the operation acknowledged only after receiving the authoritative version.

## Read path

1. Navigation reads the local workspace projection first.
2. The sync engine refreshes or receives invalidations in the background.
3. Server responses update IndexedDB and then reactive client state.
4. Document source is parsed off the typing-critical path and the sanitized render is displayed.

## Consistency model

- Local edits are immediately consistent in the active browser.
- Synced data is eventually consistent across devices.
- A document update is compare-and-swap against `version`; the server never silently overwrites a newer revision.
- Folder mutations and document moves are server transactions. The server rejects cycles and inaccessible parent folders.
- Realtime messages are hints only. Clients must be able to recover by pulling changes after reconnect.

## Failure boundaries

| Failure | Expected behavior |
| --- | --- |
| Browser refresh/crash | Recover last committed local document and pending operation queue. |
| Offline network | Continue local editing; show pending-sync state. |
| Duplicate request | Server returns previous result using client operation idempotency. |
| Token expiry | Pause cloud sync, retain local queue, prompt for re-authentication. |
| Worker failure | Retry job; document writes remain unaffected. |
| Realtime disconnect | Reconnect with backoff, then perform a cursor-based pull. |

## Module boundaries

Keep these as independently testable packages or top-level modules:

- `domain`: entity types, validation schemas, lifecycle rules, and error codes.
- `markdown`: parse, sanitize, render, outline extraction, and export transforms.
- `client-data`: IndexedDB schema, repositories, operation queue, and sync engine.
- `web`: routes, components, editor adapter, and presentation state.
- `api`: transport handlers, auth middleware, application services, and persistence adapters.
- `worker`: job consumers only; reuse application services rather than HTTP handlers.

No UI component should issue a raw network request. It calls a repository or command service that can first persist locally and then enqueue synchronization.
