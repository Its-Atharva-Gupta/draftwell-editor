# Security and Privacy

## Identity and sessions

- Delegate password storage, MFA, and account recovery to a proven identity provider or fully hardened auth service.
- Use secure, `HttpOnly`, `SameSite=Lax` session cookies for browser sessions where deployment topology allows it. Protect state-changing cookie requests with CSRF tokens or an origin check.
- Rotate refresh credentials, revoke sessions after sensitive account events, and rate-limit authentication endpoints.
- Never place long-lived bearer tokens in `localStorage`.

## Authorization

Every handler resolves the authenticated actor and calls an authorization policy before accessing a workspace-owned entity. The policy receives `(actorId, workspaceId, capability)` and maps roles to capabilities.

| Capability | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| Read documents | Yes | Yes | Yes |
| Create/update documents | Yes | Yes | No |
| Manage folders | Yes | Yes | No |
| Restore/delete documents | Yes | Yes | No |
| Manage members/workspace | Yes | No | No |

Database row-level security may provide defense in depth, but application authorization remains required and tested.

## Content handling

- Markdown is untrusted input at every boundary, including documents authored by the current user.
- Sanitize rendered output on the server for exported/shareable content and in the client before preview insertion.
- Validate external URLs before rendering links or fetching remote resources.
- Do not fetch arbitrary remote images during server render/export. Use proxying with explicit allowlists only if remote image support becomes necessary.
- Set a Content Security Policy that disallows inline script execution and limits image, font, and connection origins.

## Data protection

- Encrypt network traffic with TLS and encrypted storage through managed database/object-store settings.
- Separate production, staging, and development credentials and data.
- Use a secrets manager; never commit API keys, database URLs, or signing secrets.
- Minimize application logs: log ids and error categories, not Markdown source, access tokens, session data, or full emails.
- Backup encryption and access controls must equal or exceed production database controls.

## Abuse controls

- Enforce document size, title length, request body, workspace count, export rate, and queue depth limits.
- Rate-limit by account, session/IP where appropriate, and target resource for expensive endpoints.
- Quarantine malformed imports and reject unsupported encodings.
- Audit membership changes, sharing changes, permanent deletion, and export download generation.

## Privacy lifecycle

Define the published retention windows for trashed documents, revisions, exports, backups, and audit logs before launch. Account deletion must revoke access immediately, schedule tenant-data deletion, and report any legally required retention exception. Support tooling must require explicit authorization and leave an audit event.
