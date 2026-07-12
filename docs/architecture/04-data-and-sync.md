# Data and Synchronization

## Canonical entities

```text
User 1---* WorkspaceMember *---1 Workspace 1---* Folder
                                      |
                                      +---* Document 1---* DocumentRevision
                                                    |
                                                    +---* ExportJob
```

## Server schema

| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | `id`, `email`, `display_name`, timestamps | Identity profile; external auth subject is unique. |
| `workspaces` | `id`, `name`, `owner_id`, timestamps | Tenant root. |
| `workspace_members` | `workspace_id`, `user_id`, `role` | Unique membership; roles: owner, editor, viewer. |
| `folders` | `id`, `workspace_id`, `parent_id`, `name`, `position`, `version` | Parent is nullable; enforce same-workspace ancestry. |
| `documents` | `id`, `workspace_id`, `folder_id`, `title`, `source`, `version`, `status`, timestamps | Current authoritative source. |
| `document_revisions` | `id`, `document_id`, `version`, `source`, `author_id`, `created_at` | Immutable revision history. |
| `idempotency_keys` | `actor_id`, `operation_id`, `response`, `expires_at` | Replays completed mutation results. |
| `export_jobs` | `id`, `document_id`, `requested_by`, `format`, `status`, `storage_key` | Worker-owned state machine. |
| `audit_events` | `id`, actor, target, action, metadata, `created_at` | Security and support audit trail. |

All tenant-owned records include `workspace_id` either directly or through a foreign key that can be verified efficiently. Use UUIDv7 or another sortable opaque identifier; do not expose database sequence ids.

## Local IndexedDB schema

| Store | Key | Content |
| --- | --- | --- |
| `documents` | `documentId` | Current source, version, lifecycle status, local timestamps. |
| `folders` | `folderId` | Cached hierarchy and version. |
| `workspaces` | `workspaceId` | Workspace metadata and membership summary. |
| `operations` | `operationId` | Ordered pending mutation, retry metadata, request payload. |
| `sync_cursors` | `workspaceId` | Last acknowledged server change cursor. |
| `settings` | name | Local preferences and migration marker. |

An operation and its optimistic local entity update must be committed in one IndexedDB transaction. This prevents a document appearing saved locally without a recoverable sync intent.

## Sync protocol

Each mutation includes `operationId`, `clientId`, `baseVersion`, and `clientTimestamp`. `operationId` is stable across retries. The server stores the successful response for the idempotency window and returns it on replay.

```json
{
  "operationId": "019...",
  "type": "update_document",
  "documentId": "019...",
  "baseVersion": 12,
  "payload": { "title": "Release notes", "source": "# Release notes\n" }
}
```

## Conflict handling

1. Server rejects a stale `baseVersion` with `409 document_version_conflict` and returns the current document metadata/source or a revision reference.
2. Client preserves both its local pending source and remote source.
3. For an untouched open buffer, refresh to remote and replay an eligible queued operation.
4. For divergent source, open a conflict view with local, remote, and base revision; default to a three-way merge proposal.
5. The user confirms the merged document as a new update against the latest version.

Automatic last-write-wins is not permitted for document content. It is acceptable for independent user preferences and non-content telemetry.

## Deletion and retention

- A delete moves a document to `trash` with `deleted_at`; it is hidden from normal lists and search.
- Restore returns it to its last valid folder, otherwise the workspace root.
- A retention worker permanently purges trashed documents and associated export objects after the configured window.
- Revision retention begins with a bounded count plus time window. Legal-hold requirements need a separate policy.

## Search

Phase 1 uses local full-text search over the cached workspace. Server-side PostgreSQL full-text search indexes title and source for synchronized documents. Search results remain authorization-filtered and exclude trash by default. A dedicated search engine is deferred until scale or ranking needs justify it.
