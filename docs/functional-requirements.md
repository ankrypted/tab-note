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

- Notes that outlive the tab (per-URL or per-domain notes). The opt-in "keep" mode is planned in Stage 4 (FR-12)
- Rich text / Markdown rendering
- Cloud sync and multi-device. Opt-in sync is planned in Stage 4 (FR-13 to FR-16)
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

---

# Post-MVP Stages

The MVP above is **Stage 0**. The stages below turn Tab Note into a published, tested, full-stack project. Work them in order. The checklist for each stage is in [roadmap.md](roadmap.md). The ephemeral, tab-scoped, local-only behaviour stays the default throughout. Everything in Stage 4 is opt-in.

## Stage 1: Engineering foundation

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-10 | Typed, built codebase | Source is TypeScript with strict mode. A build step outputs a loadable extension folder and a store-ready zip. |
| FR-11 | Automated checks on every push | CI runs lint, type-check, unit tests and the build, and uploads the zip as an artifact. A failing check blocks merge. |

## Stage 2: Robustness and design doc

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-17 | Edge cases handled | Behaviour is defined, implemented and tested for: session restore, tab discard, tab dragged between windows, service-worker eviction during a save, storage quota exceeded, tab closed while the popup is open. |
| FR-18 | Design doc | `docs/design.md` explains why notes are tab-scoped, why session storage, how the MV3 service-worker lifecycle shaped the storage layer, and the trade-offs and rejected alternatives. |
| FR-19 | End-to-end tests | Playwright loads the unpacked extension and covers FR-1 to FR-9 end to end. |

## Stage 3: Publish

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-20 | Store listing | The extension is live on the Chrome Web Store with description, screenshots, icon and a privacy policy that matches NFR-3. Each permission has a written justification. |
| FR-21 | Versioned releases | Tagged releases on GitHub with a changelog. The zip is built by CI, not by hand. |

## Stage 4: Opt-in keep and sync (full-stack)

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-12 | Keep a note beyond its tab | An explicit "Keep this note" action stores the note as a kept note, tied to the page URL, that survives tab close and browser restart. Notes not marked as kept still die with the tab (FR-4 unchanged). |
| FR-13 | Accounts | The user can sign up, sign in and sign out. Sync is off until the user signs in. Signing out stops sync and leaves a clear choice about local data. |
| FR-14 | Sync kept notes across devices | Kept notes created or edited on one device appear on the user's other signed-in devices within a few seconds when online. |
| FR-15 | Offline-first | Kept notes are readable and editable offline. Changes queue locally and sync on reconnect, with no duplicate or lost edits (idempotent writes). |
| FR-16 | Conflict resolution | Concurrent edits to the same note on two devices resolve deterministically with no silent data loss. The strategy (last-write-wins, or merge) is documented in the design doc, and a conflict is visible to the user if one cannot be merged. |
| FR-22 | Delete my data | The user can delete their account and all server-side data from within the extension. |

## Stage 5: Showcase

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| FR-23 | Project presentation | README with architecture diagram, demo GIF and a short "decisions and trade-offs" section. A write-up of the MV3 lessons. Résumé bullets with real numbers (users, latency, coverage). |
