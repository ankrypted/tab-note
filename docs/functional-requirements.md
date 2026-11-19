# Tab Note: MVP Functional Requirements

A browser extension for taking quick, throwaway notes that belong to the tab you are working in.

> **Assumptions (to confirm):** Brave is the primary browser (Chromium, Manifest V3; Chrome/Edge secondary). A note belongs to a **tab**, not to a URL: it stays with the tab as you navigate, and it is gone when the tab closes. Notes live in memory for the browser session only. Saving to a file is how you keep one.

## In scope (MVP)

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-1 | Open a note for the current tab | Clicking the toolbar icon (or the shortcut) opens a popup showing the note for the active tab. Works on any tab, including new-tab and `brave://` pages. |
| FR-2 | Create and edit a plain-text note | Typing in the note area is allowed. A tab starts with an empty note. |
| FR-3 | Auto-save while the tab is open | Changes are kept automatically within about 1 second of the last keystroke. There is no save button. Closing and reopening the popup shows the same note. |
| FR-4 | Note is deleted when its tab closes | Closing the tab removes its note immediately. A note never outlives its tab, and nothing is left behind after the browser closes. The popup says so ("Deleted when this tab closes"). |
| FR-5 | Save a note to a file | A "Save to file" action downloads the note as a `.txt` file. The browser shows its Save dialog so the user can pick the Desktop or any folder. The file name comes from the tab title. The file contains the tab title, the URL, the date, and the note. Saving does not delete the note. |
| FR-6 | Indicate that a tab has a note | The toolbar icon shows a badge on tabs that have a non-empty note. |
| FR-7 | Delete a note by hand | A "Delete" action, with confirmation, clears the note for the current tab. |
| FR-8 | List tabs that have notes | A simple list shows every open tab that has a note (title, URL, first line). Clicking an entry switches to that tab. |
| FR-9 | Keyboard shortcut | A configurable shortcut opens the note (default: `Alt+N`). |

## Out of scope (post-MVP)

- Notes that outlive the tab (per-URL or per-domain notes)
- Rich text / Markdown rendering
- Cloud sync and multi-device
- Search across notes
- Import, and export formats other than `.txt`
- Saving all notes at once
- Tags, folders, reminders
- Firefox / Safari support
- Private-window support (off by default in Brave; the user can allow it per extension)

## Open questions

1. Should closing a tab with an unsaved note ask first? Today it deletes without asking. The browser gives extensions no reliable way to intercept a tab close.
2. Should notes survive a browser restart with session restore? Today they don't.
3. Popup or side panel as the primary UI?
