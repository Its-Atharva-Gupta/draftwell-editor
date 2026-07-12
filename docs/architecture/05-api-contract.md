# API Contract

## Principles

- JSON over HTTPS with a `/v1` prefix.
- Access token or secure session cookie identifies the actor; workspace identity in the path is never trusted by itself.
- Mutations require an `Idempotency-Key` header containing the client operation id.
- Request and response schemas are generated or shared from the `domain` package.
- Lists use cursor pagination, stable sort keys, and explicit page limits.

## Primary endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/v1/bootstrap` | Session profile, accessible workspaces, and preferences. |
| `GET` | `/v1/workspaces/:workspaceId/tree` | Folders and document summaries. |
| `GET` | `/v1/workspaces/:workspaceId/documents/:documentId` | Current document source and metadata. |
| `POST` | `/v1/workspaces/:workspaceId/documents` | Create document. |
| `PATCH` | `/v1/workspaces/:workspaceId/documents/:documentId` | Update title/source/folder/status with `baseVersion`. |
| `POST` | `/v1/workspaces/:workspaceId/documents/:documentId/restore` | Restore a trashed document. |
| `GET` | `/v1/workspaces/:workspaceId/documents/:documentId/revisions` | Revision summaries. |
| `GET` | `/v1/workspaces/:workspaceId/changes?cursor=...` | Pull authoritative changes after a cursor. |
| `POST` | `/v1/workspaces/:workspaceId/exports` | Start an export job. |
| `GET` | `/v1/export-jobs/:jobId` | Export status and authorized download link. |

Folder and workspace membership endpoints follow the same resource and authorization rules. Batch sync can be added as `POST /v1/sync/operations`, but its semantics must remain equivalent to processing individual idempotent operations.

## Update request

```json
{
  "baseVersion": 12,
  "title": "Release notes",
  "source": "# Release notes\n",
  "folderId": "019..."
}
```

The request only changes supplied fields. A source update creates a revision; title-only updates may create a revision only when revision history needs exact metadata reconstruction.

## Success response

```json
{
  "data": {
    "id": "019...",
    "workspaceId": "019...",
    "title": "Release notes",
    "source": "# Release notes\n",
    "folderId": "019...",
    "version": 13,
    "updatedAt": "2026-07-11T08:00:00.000Z"
  }
}
```

## Error envelope

```json
{
  "error": {
    "code": "document_version_conflict",
    "message": "The document changed on another client.",
    "requestId": "req_...",
    "details": { "currentVersion": 13 }
  }
}
```

Error codes are stable machine-facing contracts. Use `400` for schema-invalid requests, `401` for missing/invalid authentication, `403` for denied membership capability, `404` to avoid resource enumeration, `409` for state/version conflicts, `413` for size limits, and `429` for rate limits.

## Realtime events

Subscribe only after authenticating and joining authorized workspace channels. Events include no secret data beyond what a workspace member can retrieve:

```json
{
  "type": "document.updated",
  "workspaceId": "019...",
  "documentId": "019...",
  "version": 13,
  "cursor": "chg_..."
}
```

Events are at-least-once and may arrive out of order. Clients compare version/cursor and pull `/changes` when a gap is detected.
