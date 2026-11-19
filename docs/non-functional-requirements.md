# Tab Note: MVP Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | The note UI opens and shows the saved note in under 200 ms. |
| NFR-2 | Performance | Auto-save never blocks typing. The write is debounced and asynchronous. |
| NFR-3 | Privacy | All data stays on the device (`chrome.storage.local`). There is no network access, analytics or telemetry. |
| NFR-4 | Permissions | Request the minimum permissions: `storage`, `activeTab`, and `tabs` only if needed for the badge and the list. No broad host permissions. |
| NFR-5 | Reliability | No data loss on popup close, tab close or browser crash. The last debounced change is flushed when the popup closes. |
| NFR-6 | Capacity | Support at least 1,000 notes of up to 50 KB each without noticeable slowdown. Warn the user near storage limits. |
| NFR-7 | Security | Render note text as plain text only (no `innerHTML`). Use a strict extension CSP and no remote code. |
| NFR-8 | Usability | Fully keyboard operable. Basic accessibility: labels, focus order, contrast. Respects the OS light/dark theme. |
| NFR-9 | Compatibility | Primary target: the latest stable Brave (Chromium, Manifest V3). Chrome and Edge are expected to work but are secondary. Must work with Brave Shields at default settings. No dependence on Chrome-only services. |
| NFR-10 | Maintainability | Small, dependency-light codebase (vanilla JS/TS, no framework for MVP). Core storage logic is unit-testable apart from browser APIs. |
| NFR-11 | Portability | Storage sits behind a small interface so sync or other browsers can be added later without a rewrite. |
