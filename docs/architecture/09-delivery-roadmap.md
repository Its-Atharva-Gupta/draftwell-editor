# Delivery Roadmap and Decisions

## Milestone 0: foundations

- Create TypeScript workspace, CI, formatting, linting, test runners, and environment validation.
- Establish shared domain schemas, API error conventions, database migration tooling, and telemetry primitives.
- Implement local IndexedDB repositories and migrations before building polished UI flows.

**Exit criteria:** a developer can run the application and tests from a documented local setup; an empty local workspace survives a refresh.

## Milestone 1: local-first editor

- Application shell, workspace/document routes, folder navigation, CodeMirror adapter, preview, and document commands.
- IndexedDB documents, folders, settings, local autosave, trash, local search, and `.md` import/export.
- Keyboard and accessibility baseline.

**Exit criteria:** a guest can create and organize documents, close/reopen the browser, and recover all locally saved content with safe preview rendering.

## Milestone 2: account and cloud persistence

- Authentication, workspaces, membership policy, PostgreSQL schema, CRUD API, revision records, and migration path for guest data.
- Idempotent sync queue, cursor-based pull, sync status UI, and robust retry.

**Exit criteria:** the same account can use two devices, recover from offline work, and never silently overwrite concurrent edits.

## Milestone 3: history, export, and operations

- Revision browsing/restoration, conflict resolution UI, export worker, audit events, monitoring dashboards, backup recovery drills, and retention jobs.

**Exit criteria:** support can diagnose failed syncs, exports work asynchronously, and a restore exercise meets the declared recovery targets.

## Milestone 4: collaboration evaluation

Before implementing live collaborative editing, validate demand, pricing impact, document-size profile, expected editor extensions, and operational cost. If accepted, replace per-document optimistic concurrency with a CRDT-based protocol (for example Yjs) and an append-only update store. Do not layer CRDT messages on top of whole-document PATCH semantics.

## Decisions to record before implementation

| Decision | Options | Current default |
| --- | --- | --- |
| Framework | React SPA, SSR framework | React SPA until SEO/share pages require SSR. |
| Authentication | Managed provider, self-hosted | Managed provider. |
| API style | REST, RPC | REST with schema sharing. |
| Realtime transport | WebSocket, SSE | WebSocket for future presence; pull remains authoritative. |
| Editor | CodeMirror 6, Monaco | CodeMirror 6. |
| Deployment | Single managed platform, separated managed services | Managed services with independent web/API/worker scaling. |
| Collaboration | Optimistic concurrency, CRDT | Optimistic concurrency through Milestone 3. |

## Implementation order

Build vertical slices, not isolated layers: local document creation and recovery first; then editing/preview; then navigation/trash/search; then authenticated server CRUD; then sync; then conflict/history/export. Each slice must include error states, test coverage, telemetry hooks, and accessible interaction before moving on.

## Risk register

| Risk | Mitigation | Trigger |
| --- | --- | --- |
| Data loss from persistence bugs | Atomic local write + queued operation, revision history, crash tests. | Any local save exception or support report. |
| XSS from Markdown | Shared renderer, sanitizer tests, CSP. | New Markdown extension or sharing/export feature. |
| Sync complexity grows early | Keep mutations coarse and versioned; defer collaboration. | Need for live multi-user editing. |
| Large documents degrade typing | Profile, debounce, worker parsing, hard limits. | Input latency over budget. |
| Tenant data leakage | Central policy, integration tests, audit logs. | Every new workspace endpoint. |
| Operational gaps | Runbooks, dashboards, staged release, recovery tests. | Before production launch. |
