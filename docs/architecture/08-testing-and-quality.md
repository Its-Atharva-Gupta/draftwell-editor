# Testing and Quality

## Test pyramid

| Layer | Scope | Examples |
| --- | --- | --- |
| Unit | Pure functions and module contracts | Markdown URL policy, merge logic, version comparison, permission matrix. |
| Component | Isolated UI behavior | Toolbar semantics, keyboard focus, editor session lifecycle, error states. |
| Integration | Real adapters at service boundaries | API + PostgreSQL transaction conflict, IndexedDB operation atomicity, auth policy. |
| End-to-end | Critical user journeys in a real browser | Offline edit then reconnect, guest migration, conflict resolution, export download. |
| Operational | Deployment and recovery | Migration against production-like snapshot, backup restore, queue retry. |

## Required scenarios

1. Create a document, type, refresh the browser, and recover the local edit.
2. Edit offline, reconnect, and observe exactly one synchronized revision.
3. Retry the same mutation and receive the original authoritative result.
4. Change the same document from two clients and surface a conflict without data loss.
5. Verify an editor cannot access or mutate another workspace.
6. Render hostile Markdown and confirm scripts, dangerous URLs, and unsafe attributes cannot execute.
7. Restore a trashed document and purge it only after the configured retention window.
8. Navigate and edit with keyboard alone; validate focus order, names, labels, contrast, and screen-reader announcements.
9. Verify a large document remains editable and preview updates are bounded.

## Quality gates

- TypeScript strict mode and no unchecked API payloads.
- Lint and format checks are clean.
- Core domain, security policy, and sync state transitions have branch-level tests.
- New endpoint behavior has integration coverage for success, forbidden, invalid, conflict, and idempotent retry paths.
- Browser tests cover supported desktop and mobile viewport behavior.
- Dependencies are scanned and updated under an explicit maintenance cadence.

## Performance budgets

| Interaction | Budget |
| --- | --- |
| Keystroke handling | Under one animation frame for common documents |
| Local persistence acknowledgement | Under 500 ms after debounce |
| Initial local document open | Under 250 ms for 100 KB source |
| First preview for 100 KB source | Under 300 ms on supported desktop |
| Workspace list rendering | Virtualized after 100 visible items |

Profile before optimizing. Capture traces for editor input, parse/render, IndexedDB writes, and sync processing. Changes that trade correctness for a small benchmark gain require an explicit architecture decision.

## Accessibility validation

Run automated accessibility checks in component and end-to-end tests, then perform manual keyboard and screen-reader passes on the editor, document list, dialogs, conflict screen, and settings. Automated scans do not validate editor semantics, focus restoration, or live-region usefulness by themselves.
