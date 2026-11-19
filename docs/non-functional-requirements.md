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
