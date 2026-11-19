# Tab Note: MVP Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | The note UI opens and shows the saved note in under 200 ms. |
| NFR-2 | Performance | Auto-save never blocks typing. The write is debounced and asynchronous. |
| NFR-3 | Privacy | All data stays on the device, in memory only (`chrome.storage.session`). Nothing is written to disk unless the user saves a file. There is no network access, analytics or telemetry. |
| NFR-4 | Permissions | Request the minimum permissions: `storage`, `tabs` (badge, list, tab titles) and `downloads` (save to file). No broad host permissions. |
| NFR-5 | Reliability | No loss of text while the tab is open: the last debounced change is flushed when the popup closes. A note is removed when its tab closes, and stale notes are pruned when the browser starts. |
| NFR-6 | Capacity | Support at least 100 open tabs with notes of up to 100 KB each without noticeable slowdown. Session storage is limited to about 10 MB, so the editor stops accepting text past a per-note cap. |
| NFR-7 | Security | Render note text as plain text only (no `innerHTML`). Use a strict extension CSP and no remote code. |
| NFR-8 | Usability | Fully keyboard operable. Basic accessibility: labels, focus order, contrast. Respects the OS light/dark theme. |
| NFR-9 | Compatibility | Primary target: the latest stable Brave (Chromium, Manifest V3). Chrome and Edge are expected to work but are secondary. Must work with Brave Shields at default settings. No dependence on Chrome-only services. |
| NFR-10 | Maintainability | Small, dependency-light codebase (vanilla JS/TS, no framework for MVP). Core storage logic is unit-testable apart from browser APIs. |
| NFR-11 | Portability | Storage sits behind a small interface so persistence or other browsers can be added later without a rewrite. |

---

# Post-MVP Stages

NFR-3 (all data stays on the device, no network) and NFR-4 (minimum permissions) describe Stage 0 to Stage 3. In Stage 4 they are relaxed **only for users who opt in to sync**. A user who never signs in still has zero network calls. Update the privacy policy and permission justifications when Stage 4 ships.

## Stage 1: Engineering foundation

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-12 | Quality | TypeScript strict mode with no `any` in `src/` without a comment. Lint and format checks pass in CI. |
| NFR-13 | Testing | Unit test coverage of at least 90% on `lib/`. E2E tests cover every MVP requirement. Tests run in under 2 minutes in CI. |

## Stage 2: Robustness

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-14 | Reliability | A service-worker eviction at any point never loses more than the last debounced change (NFR-2) and never corrupts stored notes. Writes are idempotent. |
| NFR-15 | Observability | A local debug log (off by default, no network) records storage errors and quota hits so failures can be diagnosed from a bug report. |

## Stage 3: Publish

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-16 | Compliance | Store listing, privacy policy and declared permissions match what the code does. Each permission is justified in writing. |
| NFR-17 | Supply chain | Dependencies are pinned, audited (`npm audit`) in CI, and kept to a minimum. No remote code. |

## Stage 4: Sync backend

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-18 | Security | Passwords hashed with Argon2id or bcrypt. Short-lived access tokens with refresh. TLS only. Rate limiting on auth and sync endpoints. OWASP top 10 reviewed. |
| NFR-19 | Privacy | Server stores only what sync needs. Optional end-to-end encryption of note bodies is evaluated and the decision recorded in the design doc. No analytics on note content. |
| NFR-20 | Performance | Sync API p95 under 300 ms at 200 requests/second on a single small instance, proven with a k6 load test whose results are checked in. |
| NFR-21 | Reliability | Every write endpoint is idempotent. Retries use exponential backoff with jitter. The client survives server downtime without breaking local use. |
| NFR-22 | Scalability | The design doc has a back-of-envelope estimate (users, notes, storage, QPS) and states what would change to reach 100x. |
| NFR-23 | Operability | Health check endpoint, structured logs, basic metrics and a documented deploy and rollback process. Infrastructure is reproducible (Docker, plus CI deploy). |
| NFR-24 | Data | Schema is versioned with migrations. Daily backups with a tested restore. Account deletion removes all user data (FR-22). |
