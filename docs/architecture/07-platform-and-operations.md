# Platform and Operations

## Environments

| Environment | Purpose | Data rules |
| --- | --- | --- |
| Local | Developer iteration | Disposable local database and storage emulator. |
| Preview | Per-change integration review | Isolated, synthetic data only. |
| Staging | Release rehearsal | Production-like configuration, sanitized fixtures. |
| Production | Customer workload | Managed secrets, least privilege, audited access. |

Infrastructure must be defined declaratively. Application configuration is injected through typed environment variables validated at startup; startup fails for missing required configuration.

## Deployment topology

- Serve the web application from a CDN/static hosting layer.
- Run API instances statelessly behind a load balancer with horizontal scaling.
- Use managed PostgreSQL with automated backups and point-in-time recovery.
- Run workers independently from API instances so export backlogs cannot consume request capacity.
- Place exports and attachments in private object storage; distribute downloads with signed short-lived URLs.
- Use a managed queue with retry, dead-letter, visibility timeout, and idempotent consumers.

## Database operations

- Migrations are forward-only, reviewed, and executed by the release pipeline exactly once.
- Use expand/migrate/contract changes for columns and APIs used by multiple deployed versions.
- Test migration rollback strategy from a restored backup; do not rely on down migrations in production.
- Measure connection pool saturation, slow queries, replication lag, storage growth, and backup completion.

## Observability

Every request has a `requestId`; propagate it to logs, background jobs, and error responses. Track:

- API request rate, latency, status codes, and error code counts.
- Sync outcomes: acknowledged, conflict, retry, permanently failed, and queue age.
- Local persistence errors reported through privacy-preserving client telemetry.
- Realtime connection count, reconnect rate, and change-pull lag.
- Worker queue depth, job latency, retry count, and dead-letter entries.
- Database health and export object storage growth.

Alert on user-impacting symptoms: sustained API 5xx, sync failure rate, rising queue age, failed backups, database saturation, and export backlog. Runbooks must document diagnosis, mitigation, owner, and escalation path.

## Backup and recovery

1. Take automated database backups and enable point-in-time recovery.
2. Version or retain object storage long enough to restore deleted exports/attachments.
3. Periodically restore into an isolated environment and verify documents, revisions, memberships, and export metadata.
4. Document RPO/RTO targets before launch. A reasonable initial target is RPO under 24 hours and RTO under 4 hours, improved after measured operational maturity.

## Release process

1. Pull request: typecheck, lint, unit tests, affected integration tests, and preview deployment.
2. Main branch: full test suite, migration compatibility check, dependency/security scan, and staging deployment.
3. Production: canary or low-risk rollout, dashboard monitoring, and a documented rollback path.
4. Incident: halt rollout, preserve evidence, communicate scope, recover service/data, then produce corrective actions.
