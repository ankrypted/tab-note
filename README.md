# Tab Note

A browser extension for **Brave** (Manifest V3; Chrome and Edge also work) for quick, throwaway notes that belong to the tab you are on.

- Requirements: [docs/functional-requirements.md](docs/functional-requirements.md), [docs/non-functional-requirements.md](docs/non-functional-requirements.md)
- Roadmap and stage checklists: [docs/roadmap.md](docs/roadmap.md)

## How it works

- Each tab has its own note. It follows the tab as you navigate.
- **When the tab closes, its note is deleted.** Notes are kept in memory only (`chrome.storage.session`), never on disk, and are gone when the browser closes.
- To keep a note, use **Save to file** (the download icon). Brave shows its Save dialog, so pick your Desktop or any folder. The `.txt` file has the tab title, URL, date and your note.
- A teal dot on the toolbar icon marks tabs that have a note. **Tab notes** lists the open tabs that have one and switches to a tab when you click it.

## Try it

1. In Brave, open `brave://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the [src/](src/) folder.
3. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to Tab Note. Brave hides extensions by default, and the badge dot only shows when it is pinned.
4. Open any web page and click the Tab Note icon, or press `Alt+N`.

Notes for Brave:
- Change the shortcut at `brave://extensions/shortcuts`.
- Private and Tor windows: extensions are off there by default. To use Tab Note in a private window, open its **Details** on `brave://extensions` and turn on **Allow in Private**.
- Brave Shields do not affect it. The extension makes no network requests.
- Brave keeps the Save dialog's last folder, so pick the Desktop once and it will remember.

## Develop

```
npm test         # unit tests for storage, export and URL helpers (Node 18+)
npm run icons    # regenerate the toolbar icons (Python 3)
```

## Layout

```
src/
  manifest.json
  background.js      toolbar badge: a dot on pages that have a note
  lib/url.js         short display form of a URL
  lib/storage.js     per-tab note store (chrome.storage.session behind a small interface)
  lib/export.js      file name and contents for Save to file
  popup/             the popup UI
tests/               unit tests
tools/make_icons.py  icon generator
```

