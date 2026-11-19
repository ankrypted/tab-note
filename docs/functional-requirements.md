# Tab Note: MVP Functional Requirements

A browser extension for taking quick notes tied to the tab (page) you are working in.

> **Assumptions (to confirm):** Brave is the primary browser (Chromium, Manifest V3; Chrome/Edge secondary). A note is bound to the page URL (origin + path, no hash or tracking params), so it survives tab close and browser restart. Notes are stored locally only.

## In scope (MVP)

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-1 | Open a note for the current tab | Clicking the toolbar icon (or the shortcut) opens a popup/side panel showing the note for the active tab's page. |
| FR-2 | Create and edit a plain-text note | Typing in the note area is allowed. An empty page starts with an empty note. |
| FR-3 | Auto-save | Changes are saved automatically within about 1 second of the last keystroke. There is no save button. |
| FR-4 | Persist per page | Reopening the same page, in a new tab or after a restart, shows the previously saved note. |
| FR-5 | Indicate that a page has a note | The toolbar icon shows a badge when the current page has a non-empty note. |
| FR-6 | Delete a note | A "Delete" action, with confirmation, removes the note for the current page. |
| FR-7 | List all notes | A simple list shows every page that has a note (title, URL, first line). Clicking an entry opens that URL. |
| FR-8 | Keyboard shortcut | A configurable shortcut opens the note (default: `Alt+N`). |

## Out of scope (post-MVP)

- Rich text / Markdown rendering
- Cloud sync and multi-device
- Search across notes
- Export / import
- Per-domain or per-tab-session (non-URL) notes
- Tags, folders, reminders
- Firefox / Safari support
- Private-window support (off by default in Brave; the user can allow it per extension)

## Open questions

1. Should the note be bound to the exact URL, the whole domain, or either (a toggle)?
2. Popup or side panel as the primary UI?
3. Should notes survive URL changes inside single-page apps?
